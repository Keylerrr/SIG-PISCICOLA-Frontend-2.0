import {
  API_AUDIT_ENABLED,
  buildApiUrl,
  getApiBaseUrl,
} from "@/lib/apiConfig";

const MAX_CONCURRENT_REQUESTS = 8;
let activeRequests = 0;
const waitQueue = [];

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access");
}

async function acquireRequestSlot() {
  if (activeRequests < MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    return;
  }
  await new Promise((resolve) => {
    waitQueue.push(resolve);
  });
  activeRequests += 1;
}

function releaseRequestSlot() {
  activeRequests -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

function auditLog(phase, payload) {
  if (!API_AUDIT_ENABLED || typeof window === "undefined") return;
}

export class ApiAuthError extends Error {
  constructor(message = "No hay token de autenticación") {
    super(message);
    this.name = "ApiAuthError";
    this.code = "AUTH_MISSING";
  }
}

export class ApiNetworkError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "ApiNetworkError";
    this.code = "NETWORK_ERROR";
    this.cause = cause;
  }
}

export class ApiConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "ApiConfigError";
    this.code = "CONFIG_ERROR";
  }
}

/**
 * Fetch robusto con logs, validación de URL, token y límite de concurrencia.
 *
 * @returns {{ response: Response|null, error: Error|null, skipped: boolean }}
 */
export async function safeFetch(urlOrPath, options = {}) {
  const {
    method = "GET",
    body,
    headers = {},
    requireAuth = true,
    source = "unknown",
    signal,
  } = options;

  let endpoint;
  try {
    endpoint =
      urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")
        ? urlOrPath
        : buildApiUrl(urlOrPath);
  } catch (configErr) {
    auditLog("config error", {
      source,
      message: configErr.message,
      input: urlOrPath,
    });
    return { response: null, error: configErr, skipped: false };
  }

  const token = getToken();
  const tokenPresent = Boolean(token);

  auditLog("request", {
    endpoint,
    method,
    source,
    tokenPresent,
    apiBase: getApiBaseUrl(),
  });

  if (requireAuth && !tokenPresent) {
    const authErr = new ApiAuthError();
    auditLog("skipped (sin token)", { endpoint, source });
    return { response: null, error: authErr, skipped: true };
  }

  const requestHeaders = {
    "Content-Type": "application/json",
    ...headers,
  };
  if (tokenPresent) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  await acquireRequestSlot();

  try {
    const response = await fetch(endpoint, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    auditLog("response", {
      endpoint,
      source,
      status: response.status,
      ok: response.ok,
    });

    return { response, error: null, skipped: false };
  } catch (networkErr) {
    const message =
      networkErr?.message || "Error de red al contactar el servidor";
    const wrapped = new ApiNetworkError(message, networkErr);

    auditLog("network failure", {
      endpoint,
      source,
      tokenPresent,
      message: networkErr?.message,
      name: networkErr?.name,
    });

    console.error("[API AUDIT] Failed to fetch", {
      endpoint,
      source,
      tokenPresent,
      error: networkErr,
    });

    return { response: null, error: wrapped, skipped: false };
  } finally {
    releaseRequestSlot();
  }
}

/**
 * Igual que safeFetch pero lanza en error de red/config (no en skip por auth).
 */
export async function apiFetch(urlOrPath, options = {}) {
  const result = await safeFetch(urlOrPath, options);
  if (result.skipped) throw result.error;
  if (result.error) throw result.error;
  return result.response;
}

export async function apiFetchJson(urlOrPath, options = {}) {
  const response = await apiFetch(urlOrPath, options);
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * No lanza: útil para hooks que deben degradar en silencio.
 */
export async function apiFetchJsonSafe(urlOrPath, options = {}) {
  const result = await safeFetch(urlOrPath, options);
  if (result.skipped || result.error || !result.response) {
    return {
      data: null,
      error: result.error,
      status: null,
      skipped: result.skipped,
    };
  }

  const { response } = result;
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const msg =
      data?.detail || data?.message || `Error HTTP ${response.status}`;
    return {
      data: null,
      error: new Error(msg),
      status: response.status,
      skipped: false,
    };
  }

  return { data, error: null, status: response.status, skipped: false };
}

export { getToken };
