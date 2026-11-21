import { safeFetch } from "@/lib/apiClient";

function flattenErrors(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenErrors).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([field, detail]) => `${field}: ${flattenErrors(detail)}`)
      .join(" | ");
  }
  return "Error inesperado";
}

async function request(path, options = {}) {
  const result = await safeFetch(path, options);
  if (result.error || result.skipped || !result.response) {
    throw result.error || new Error("No fue posible contactar el servidor.");
  }
  const payload = await result.response.json().catch(() => null);
  if (!result.response.ok) {
    throw new Error(flattenErrors(payload) || `Error HTTP ${result.response.status}`);
  }
  return payload;
}

export function listBatchTransfers(farmId) {
  return request(`/farms/${farmId}/batch-transfers/`, {
    source: "BatchTransfers.list",
  });
}

export function createBatchTransfer(farmId, payload) {
  return request(`/farms/${farmId}/batch-transfers/`, {
    method: "POST",
    body: payload,
    source: "BatchTransfers.create",
  });
}
