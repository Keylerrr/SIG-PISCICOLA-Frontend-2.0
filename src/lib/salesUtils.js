export function normalizePaymentMethod(value) {
  if (!value) return "";
  const v = String(value).toLowerCase();
  if (v === "efectivo") return "efectivo";
  if (v === "transferencia") return "transferencia";
  return v;
}

export function validateClientDocument(clientType, documentType) {
  if (clientType === "juridico" && documentType !== "NIT") {
    return "Persona jurídica debe usar NIT como tipo de documento.";
  }
  if (clientType === "natural" && documentType === "NIT") {
    return "Persona natural no puede usar NIT como tipo de documento.";
  }
  return null;
}

export function parseList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

export function formatApiError(error) {
  if (!error?.payload) return error?.message || "Error desconocido";
  const p = error.payload;
  if (typeof p === "string") return p;
  if (p.detail) return typeof p.detail === "string" ? p.detail : JSON.stringify(p.detail);
  if (typeof p === "object") {
    const parts = [];
    for (const [key, val] of Object.entries(p)) {
      if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
      else if (typeof val === "string") parts.push(`${key}: ${val}`);
    }
    if (parts.length) return parts.join(" | ");
  }
  return error.message || "Error en la operación";
}

export function formatCurrency(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

/** `price` en la API es el valor total de la línea, no precio por kg. */
export function calculateSaleLineTotal(_quantityG, lineTotalPrice) {
  return Number(lineTotalPrice) || 0;
}

export function calculateSaleTotal(details = []) {
  return details.reduce(
    (sum, d) => sum + calculateSaleLineTotal(d.quantity_g, d.price),
    0
  );
}

export function getSaleDisplayTotal(sale, details = []) {
  const fromSale = sale?.total ?? sale?.total_amount;
  if (fromSale != null && fromSale !== "" && !Number.isNaN(Number(fromSale))) {
    return Number(fromSale);
  }
  if (details.length > 0) {
    return details.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
  }
  return null;
}

export function getHarvestLabel(harvest) {
  if (!harvest) return "Cosecha";
  const date = harvest.date || harvest.harvest_date;
  const dateStr = date ? new Date(date).toLocaleDateString("es-CO") : "";
  const pond = harvest.pond_name || harvest.pond?.name;
  const cycle = harvest.cycle_name || harvest.cycle?.name;
  const parts = [`#${harvest.id}`];
  if (dateStr) parts.push(dateStr);
  if (pond) parts.push(pond);
  if (cycle) parts.push(cycle);
  return parts.join(" · ");
}

/** Clasificaciones con stock de peso vendible (> 0 g). */
export function getSellableClassifications(classifications = []) {
  return classifications.filter((c) => {
    const weight = Number(c.available_weight_g ?? 0);
    return weight > 0;
  });
}

/** Peso disponible a nivel cosecha (si el API lo envía en el listado). */
export function getHarvestAvailableWeight(harvest) {
  if (!harvest) return 0;
  const candidates = [
    harvest.available_weight_g,
    harvest.total_available_weight_g,
    harvest.remaining_weight_g,
    harvest.total_weight_g,
    harvest.weight_g,
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && value !== "") {
      const n = Number(value);
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

export function isHarvestSellableByWeight(harvest) {
  return getHarvestAvailableWeight(harvest) > 0;
}

export function getClassificationLabel(classification) {
  if (!classification) return "—";
  if (typeof classification === "object") {
    return (
      classification.display_name ||  // ← agregar esta línea
      classification.name ||
      classification.label ||
      classification.size_category ||
      `Clasificación #${classification.id}`
    );
  }
  return String(classification);
}
