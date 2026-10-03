export const ASSIGNABLE_POND_STATUSES = new Set(["active", "in_use"]);

export function isAssignablePond(pond) {
  return ASSIGNABLE_POND_STATUSES.has(pond?.status);
}

export function getHarvestTypeLabel(type) {
  const key = String(type || "").toLowerCase();
  if (key === "partial") return "Parcial";
  if (key === "total") return "Total";
  return type || "—";
}

export function extractApiErrors(data) {
  if (!data || typeof data !== "object") {
    return ["No se pudo completar la operación. Intente de nuevo."];
  }

  const messages = [];

  const process = (obj, prefix = "") => {
    for (const [key, value] of Object.entries(obj)) {
      const fieldLabel = prefix ? `${prefix} → ${key}` : key;
      if (Array.isArray(value)) {
        value.forEach((v, idx) => {
          if (typeof v === "string") {
            messages.push(`${fieldLabel}: ${v}`);
          } else if (typeof v === "object" && v !== null) {
            process(v, `${fieldLabel}[${idx + 1}]`);
          }
        });
      } else if (typeof value === "string") {
        messages.push(`${fieldLabel}: ${value}`);
      } else if (typeof value === "object" && value !== null) {
        process(value, fieldLabel);
      }
    }
  };

  if (typeof data.detail === "string") {
    return [data.detail];
  }

  process(data);
  return messages.length > 0
    ? messages
    : ["No se pudo completar la operación. Intente de nuevo."];
}

export function formatWeightGrams(valueG) {
  const grams = Number(valueG);
  if (Number.isNaN(grams) || grams <= 0) return "—";
  if (grams >= 1000) {
    return `${(grams / 1000).toLocaleString("es-CO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} kg (${grams.toLocaleString("es-CO")} g)`;
  }
  return `${grams.toLocaleString("es-CO")} g`;
}

export function formatBiomassKg(valueKg) {
  const kg = Number(valueKg);
  if (Number.isNaN(kg) || kg <= 0) return "—";
  return `${kg.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`;
}

export function parseCycleStockFromApi(currentState, latestControlStat) {
  const biomassKg =
    latestControlStat?.biomass_kg ??
    currentState?.biomass_kg ??
    null;

  const fishCount =
    currentState?.fish_quantity ??
    latestControlStat?.live_quantity ??
    null;

  const avgWeightG =
    currentState?.avg_weight_g ??
    latestControlStat?.avg_weight_g ??
    null;

  const weightG =
    biomassKg != null
      ? biomassKg * 1000
      : avgWeightG != null && fishCount != null
      ? avgWeightG * fishCount
      : null;

  return {
    weightG,
    biomassKg,
    fishCount,
  };
}
