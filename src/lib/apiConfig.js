/**
 * Configuración central de API.
 * Usar NEXT_PUBLIC_API_BASE_URL en .env.local para apuntar a otro backend.
 */

const DEFAULT_API_BASE = "https://backend-pongase-trucha.onrender.com/api";

/** Logs temporales de auditoría de red (desactivar en producción estable) */
export const API_AUDIT_ENABLED =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_AUDIT !== "false"
    : true;

function normalizeBaseUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!parsed.protocol.startsWith("http")) return null;
    return trimmed;
  } catch {
    return null;
  }
}

/**
 * URL base del API en tiempo de ejecución (cliente y servidor).
 */
export function getApiBaseUrl() {
  const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const base = fromEnv || DEFAULT_API_BASE;

  if (typeof window !== "undefined" && API_AUDIT_ENABLED && !window.__API_CONFIG_LOGGED__) {
    window.__API_CONFIG_LOGGED__ = true;
  }

  return base;
}

/** @deprecated Usar getApiBaseUrl() — mantener compatibilidad */
export const API_BASE = getApiBaseUrl();

/**
 * Valida que un segmento de ruta no sea undefined/null/vacío.
 */
export function assertPathSegment(value, name) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Segmento de ruta inválido: ${name}`);
  }
  const str = String(value);
  if (str === "undefined" || str === "null") {
    throw new Error(`Segmento de ruta inválido: ${name}=${str}`);
  }
  return str;
}

/**
 * Construye URL absoluta validada.
 */
export function buildApiUrl(path) {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("API_BASE no configurada");
  }

  if (!path || typeof path !== "string") {
    throw new Error("Ruta de API vacía o inválida");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  if (
    url.includes("/undefined") ||
    url.includes("/null") ||
    url.endsWith("/undefined") ||
    url.endsWith("/null")
  ) {
    throw new Error(`URL de API inválida (segmentos faltantes): ${url}`);
  }

  return url;
}
