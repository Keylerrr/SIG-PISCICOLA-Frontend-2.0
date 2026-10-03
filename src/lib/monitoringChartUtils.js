/**
 * Formatea control_date para ejes y tooltips (solo presentación).
 */
export function formatControlDateLabel(controlDate) {
  if (!controlDate) return "";
  const parsed = new Date(`${controlDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return String(controlDate);
  return parsed.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sortByControlDateAsc(stats) {
  return [...stats].sort(
    (a, b) => new Date(a.control_date) - new Date(b.control_date)
  );
}

function mapStatRow(stat, valueKey) {
  const raw = stat[valueKey];
  if (raw === null || raw === undefined) return null;
  const value = Number(raw);
  if (Number.isNaN(value)) return null;
  return {
    controlDate: stat.control_date,
    dateLabel: formatControlDateLabel(stat.control_date),
    value,
  };
}

export function buildBiomassSeries(controlStats) {
  return sortByControlDateAsc(controlStats)
    .map((stat) => mapStatRow(stat, "biomass_kg"))
    .filter(Boolean);
}

export function buildFcaSeries(controlStats) {
  return sortByControlDateAsc(controlStats)
    .filter((stat) => stat.fca !== null && stat.fca !== undefined)
    .map((stat) => mapStatRow(stat, "fca"))
    .filter(Boolean);
}

export function buildMortalitySeries(controlStats) {
  return sortByControlDateAsc(controlStats)
    .map((stat) => mapStatRow(stat, "mortality_percentage"))
    .filter(Boolean);
}

export function buildAvgWeightSeries(controlStats) {
  return sortByControlDateAsc(controlStats)
    .map((stat) => mapStatRow(stat, "avg_weight_g"))
    .filter(Boolean);
}

export function buildBiomassGainSeries(controlStats) {
  return sortByControlDateAsc(controlStats)
    .filter(
      (stat) =>
        stat.biomass_gain_kg !== null && stat.biomass_gain_kg !== undefined
    )
    .map((stat) => mapStatRow(stat, "biomass_gain_kg"))
    .filter(Boolean);
}
