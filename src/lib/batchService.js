const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access");
}

/**
 * Fetches cycles associated with a specific batch inside a farm.
 * Used by the report modal to populate the optional cycle selector.
 *
 * GET /api/farms/{farmId}/batches/{batchId}/cycles/
 * Falls back to GET /api/farms/{farmId}/cycles/?batch={batchId} if needed.
 */
export async function getBatchCycles(farmId, batchId) {
  const token = getToken();
  const headers = { Authorization: `Bearer ${token}` };

  // Try the dedicated batch-cycles endpoint first
  try {
    const res = await fetch(
      `${API_BASE}/farms/${farmId}/batches/${batchId}/cycles/`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch {
    // fall through to the fallback
  }

  // Fallback: query all farm cycles filtered by batch
  try {
    const res = await fetch(
      `${API_BASE}/farms/${farmId}/cycles/?batch=${batchId}`,
      { headers }
    );
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Generates a production-history report for a batch.
 *
 * POST /api/farms/{farmId}/batches/{batchId}/production-report/
 *
 * @param {string|number} farmId
 * @param {string|number} batchId
 * @param {{ modules: string[], format: "pdf"|"xlsx", cycle_id?: number }} payload
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function generateProductionReport(farmId, batchId, payload) {
  const token = getToken();

  const body = {
    modules: payload.modules,
    format: payload.format,
  };

  if (payload.cycle_id != null) {
    body.cycle_id = payload.cycle_id;
  }

  const url = `${API_BASE}/farms/${farmId}/batches/${batchId}/production-report/`;

  const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    // Parse error body (JSON or plain text)
    let errorPayload = null;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = await response.text().catch(() => null);
    }
    
    const error = new Error(
      errorPayload?.detail ||
        errorPayload?.message ||
        `Error ${response.status}`
    );
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  // Extract filename from Content-Disposition header
  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const defaultFilename =
    payload.format === "xlsx" ? "reporte_historico.xlsx" : "reporte_historico.pdf";
  const filename = filenameMatch?.[1]?.trim() || defaultFilename;

  const blob = await response.blob();
  return { blob, filename };
}
