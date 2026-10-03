import { assertPathSegment } from "@/lib/apiConfig";
import { apiFetchJsonSafe } from "@/lib/apiClient";

function pondPath(farmId, pondId) {
  assertPathSegment(farmId, "farmId");
  assertPathSegment(pondId, "pondId");
  return `/farms/${farmId}/ponds/${pondId}`;
}

function auditLog(message, pondId, extra) {
  if (typeof window === "undefined") return;
}

export const pondService = {
  activate: async (farmId, pondId) => {
    auditLog(`Activando estanque ${pondId}`, pondId);

    const result = await apiFetchJsonSafe(
      `${pondPath(farmId, pondId)}/activate/`,
      {
        method: "PATCH",
        source: "pondService.activate",
      }
    );

    if (result.skipped) {
      const err = new Error("No hay sesión activa");
      auditLog("Error", pondId, { message: err.message });
      throw err;
    }

    if (result.error) {
      auditLog("Error", pondId, { message: result.error.message });
      throw result.error;
    }

    auditLog("Éxito", pondId);
    return result.data;
  },

  inactivate: async (farmId, pondId) => {
    auditLog(`Inactivando estanque ${pondId}`, pondId);

    const result = await apiFetchJsonSafe(
      `${pondPath(farmId, pondId)}/inactivate/`,
      {
        method: "PATCH",
        source: "pondService.inactivate",
      }
    );

    if (result.skipped) {
      const err = new Error("No hay sesión activa");
      auditLog("Error", pondId, { message: err.message });
      throw err;
    }

    if (result.error) {
      auditLog("Error", pondId, { message: result.error.message });
      throw result.error;
    }

    auditLog("Éxito", pondId);
    return result.data;
  },
};

/**
 * Switch encendido si el estanque no está inactivo.
 * Fuente de verdad: propiedad `status` del modelo (`active` | `inactive` | `in_use` | `cleaning`).
 */
export function isPondSwitchOn(status) {
  return status !== "inactive";
}

/** Badge / estilos de tarjeta inactiva */
export function isPondInactive(status) {
  return status === "inactive";
}
