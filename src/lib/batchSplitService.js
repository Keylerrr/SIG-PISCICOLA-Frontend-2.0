import { safeFetch } from "@/lib/apiClient";

function errorText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorText).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([field, detail]) => `${field}: ${errorText(detail)}`)
      .join(" | ");
  }
  return "No se pudo dividir el lote.";
}

export async function splitUnassignedBatch(farmId, batchId, payload) {
  const result = await safeFetch(`/farms/${farmId}/batches/${batchId}/split/`, {
    method: "POST",
    body: payload,
    source: "BatchSplit.create",
  });
  if (result.error || result.skipped || !result.response) {
    throw result.error || new Error("No fue posible contactar el servidor.");
  }
  const data = await result.response.json().catch(() => null);
  if (!result.response.ok) throw new Error(errorText(data));
  return data;
}
