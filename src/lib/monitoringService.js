import { assertPathSegment, buildApiUrl } from "@/lib/apiConfig";
import { apiFetchJson, safeFetch } from "@/lib/apiClient";

function cycleBasePath(farmId, pondId, cycleId) {
  assertPathSegment(farmId, "farmId");
  assertPathSegment(pondId, "pondId");
  assertPathSegment(cycleId, "cycleId");
  return `/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}`;
}

/** Contador temporal (auditoría monitoring) */
let controlStatsFetchCount = 0;
const controlStatsInFlight = new Map();

export function resetControlStatsFetchAudit() {
  controlStatsFetchCount = 0;
}

export function getControlStatsFetchCount() {
  return controlStatsFetchCount;
}

export const monitoringService = {
  getCurrentState: async (farmId, pondId, cycleId) => {
    return apiFetchJson(
      `${cycleBasePath(farmId, pondId, cycleId)}/current_state/`,
      { source: "monitoringService.getCurrentState" }
    );
  },

  getControlStats: async (farmId, pondId, cycleId) => {
    const cacheKey = `${farmId}:${pondId}:${cycleId}`;

    if (controlStatsInFlight.has(cacheKey)) {
      return controlStatsInFlight.get(cacheKey);
    }

    controlStatsFetchCount += 1;
    const path = `${cycleBasePath(farmId, pondId, cycleId)}/control-stats/`;

    const requestPromise = (async () => {
      const result = await safeFetch(path, {
        source: "monitoringService.getControlStats",
      });

      if (result.skipped || result.error) {
        throw result.error || new Error("No se pudo cargar control-stats");
      }

      const text = await result.response.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!result.response.ok) {
        const detail =
          data?.detail || data?.message || `Error ${result.response.status}`;
        throw new Error(detail);
      }

      return Array.isArray(data) ? data : [];
    })().finally(() => {
      controlStatsInFlight.delete(cacheKey);
    });

    controlStatsInFlight.set(cacheKey, requestPromise);
    return requestPromise;
  },
};

export { buildApiUrl };
