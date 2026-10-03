import { useState, useEffect, useCallback, useMemo } from "react";
import { monitoringService } from "@/lib/monitoringService";
import { useAuthReady } from "@/hooks/useAuthReady";
import {
  buildBiomassSeries,
  buildFcaSeries,
  buildMortalitySeries,
  buildAvgWeightSeries,
  buildBiomassGainSeries,
} from "@/lib/monitoringChartUtils";

function getLatestBiomassGainKg(controlStats, currentState) {
  if (currentState?.biomass_gain_kg != null) {
    return currentState.biomass_gain_kg;
  }
  if (!Array.isArray(controlStats) || controlStats.length === 0) return null;
  const sorted = [...controlStats].sort(
    (a, b) => new Date(b.control_date) - new Date(a.control_date)
  );
  return sorted[0]?.biomass_gain_kg ?? null;
}

/**
 * Única fuente de datos de monitoreo para tarjetas y gráficas.
 * control-stats se consulta una sola vez por refreshKey.
 */
export function useMonitoringData(farmId, pondId, cycleId, refreshKey = 0) {
  const { authReady, hasToken } = useAuthReady();
  const [currentState, setCurrentState] = useState(null);
  const [controlStats, setControlStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStateError, setCurrentStateError] = useState(null);
  const [controlStatsError, setControlStatsError] = useState(null);

  const loadData = useCallback(async () => {
    if (!authReady || !hasToken || !farmId || !pondId || !cycleId) {
      if (authReady && !hasToken) {
        setIsLoading(false);
      }
      if (!farmId || !pondId || !cycleId) {
        setCurrentState(null);
        setControlStats([]);
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setCurrentStateError(null);
    setControlStatsError(null);

    const [stateResult, statsResult] = await Promise.allSettled([
      monitoringService.getCurrentState(farmId, pondId, cycleId),
      monitoringService.getControlStats(farmId, pondId, cycleId),
    ]);

    if (stateResult.status === "fulfilled") {
      setCurrentState(stateResult.value);
    } else {
      console.error("Error fetching current_state:", stateResult.reason);
      setCurrentStateError(
        stateResult.reason?.message ||
          "No se pudo cargar el estado actual del ciclo."
      );
      setCurrentState(null);
    }

    if (statsResult.status === "fulfilled") {
      setControlStats(statsResult.value);
    } else {
      console.error("Error fetching control-stats:", statsResult.reason);
      setControlStatsError(
        statsResult.reason?.message ||
          "No se pudo cargar el historial de controles."
      );
      setControlStats([]);
    }

    setIsLoading(false);
  }, [authReady, hasToken, farmId, pondId, cycleId]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  const latestBiomassGainKg = useMemo(
    () => getLatestBiomassGainKg(controlStats, currentState),
    [controlStats, currentState]
  );

  const chartSeries = useMemo(
    () => ({
      biomass: buildBiomassSeries(controlStats),
      fca: buildFcaSeries(controlStats),
      mortality: buildMortalitySeries(controlStats),
      avgWeight: buildAvgWeightSeries(controlStats),
      biomassGain: buildBiomassGainSeries(controlStats),
    }),
    [controlStats]
  );

  const chartsIsEmpty =
    !isLoading && !controlStatsError && controlStats.length === 0;

  return {
    currentState,
    latestBiomassGainKg,
    controlStats,
    chartSeries,
    isLoading,
    currentStateError,
    controlStatsError,
    chartsIsEmpty,
    reload: loadData,
  };
}
