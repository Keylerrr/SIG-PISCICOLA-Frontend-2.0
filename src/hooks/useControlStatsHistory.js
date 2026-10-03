import { useMemo } from "react";
import {
  buildBiomassSeries,
  buildFcaSeries,
  buildMortalitySeries,
  buildAvgWeightSeries,
  buildBiomassGainSeries,
} from "@/lib/monitoringChartUtils";

/**
 * @deprecated No hace fetch. Usar chartSeries desde useMonitoringData.
 * Transforma controlStats ya cargados en series para gráficas.
 */
export function useMonitoringChartSeries(controlStats) {
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

  const isEmpty = controlStats.length === 0;

  return { chartSeries, isEmpty };
}
