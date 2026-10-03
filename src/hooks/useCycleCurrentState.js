import { useState, useEffect, useCallback } from "react";
import { monitoringService } from "@/lib/monitoringService";

/**
 * @deprecated Usar useMonitoringData en MonitoringSection para evitar fetches duplicados.
 * Solo expone current_state (sin control-stats).
 */
export function useCycleCurrentState(farmId, pondId, cycleId, refreshKey = 0) {
  const [currentState, setCurrentState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!farmId || !pondId || !cycleId) {
      setCurrentState(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await monitoringService.getCurrentState(
        farmId,
        pondId,
        cycleId,
        "useCycleCurrentState (deprecated)"
      );
      setCurrentState(data);
    } catch (err) {
      console.error("Error fetching cycle current_state:", err);
      setError(
        err.message || "No se pudo cargar el estado actual del ciclo."
      );
      setCurrentState(null);
    } finally {
      setIsLoading(false);
    }
  }, [farmId, pondId, cycleId]);

  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);

  return { currentState, latestBiomassGainKg: null, isLoading, error, refetch };
}
