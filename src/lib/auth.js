// Utilidades de sesión (D-03). Solo se ejecutan en el navegador.

export const ACCESS_KEY = "access";
const SESSION_KEYS = ["access", "refresh", "user"];

function safeStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    return storage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

export function clearSession() {
  const storage = safeStorage();
  if (!storage) return;
  SESSION_KEYS.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      /* ignorar */
    }
  });
}

/** Lee el campo `exp` (en segundos) de un JWT. Devuelve null si no es un JWT legible. */
export function getTokenExpiry(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json =
      typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
    const payload = JSON.parse(decodeURIComponent(escape(json)));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isTokenExpired(token, now = Date.now()) {
  const exp = getTokenExpiry(token);
  if (exp == null) return false; // token opaco: lo valida la API
  return exp * 1000 <= now;
}

/** Hay token y, si es un JWT, no ha vencido. */
export function hasValidSession(now = Date.now()) {
  const token = getAccessToken();
  return Boolean(token) && !isTokenExpired(token, now);
}

/** Acepta solo rutas internas para evitar redirecciones abiertas desde ?next=. */
export function getSafeNext(next, fallback = "/home") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (next.startsWith("/login")) return fallback;
  return next;
}

/* ---- Motivo por el que se pide iniciar sesión de nuevo ---- */

export const SESSION_REASONS = {
  missing: "Inicia sesión para continuar.",
  expired: "Tu sesión venció. Inicia sesión de nuevo.",
  revoked:
    "Tu sesión ya no es válida: venció o se cerró desde otro dispositivo. Inicia sesión de nuevo.",
};

/** "missing" si no hay token, "expired" si el JWT ya venció, null si la sesión es utilizable. */
export function getSessionIssue(now = Date.now()) {
  const token = getAccessToken();
  if (!token) return "missing";
  return isTokenExpired(token, now) ? "expired" : null;
}

/** Ruta de login con ?next= (ruta a la que volver) y ?reason= (qué mostrar). */
export function buildLoginUrl(loginPath, pathname, reason) {
  const params = new URLSearchParams();
  const next = getSafeNext(pathname, "");
  if (next) params.set("next", next);
  if (reason && SESSION_REASONS[reason]) params.set("reason", reason);
  const query = params.toString();
  return query ? `${loginPath}?${query}` : loginPath;
}

export function getReasonMessage(reason) {
  return SESSION_REASONS[reason] ?? null;
}