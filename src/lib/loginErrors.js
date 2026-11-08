// Mensajes de login, incluido el bloqueo temporal de la cuenta (D-07).
//
// El servidor bloquea tras 5 intentos fallidos y responde 400 incluso con la contraseña correcta
// (CP-004). Como ese 400 no trae un texto claro, se combinan dos señales:
//   1) el servidor: estado 423/429 o un mensaje que mencione el bloqueo;
//   2) un contador local de intentos fallidos consecutivos por correo.

// Reúne todos los textos que devolvió el servidor (DRF: detail, non_field_errors, campos…).
function collectMessages(value) {
  if (value == null) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectMessages);
  if (typeof value === "object") return Object.values(value).flatMap(collectMessages);
  return [];
}

function extractApiErrors(error) {
  const payload = error?.payload ?? error?.data ?? error?.body ?? null;
  const messages = collectMessages(payload);
  if (!messages.length && error?.message) messages.push(error.message);
  return { general: messages, fields: {} };
}

export const MAX_ATTEMPTS = 5;
export const LOCK_MINUTES = 30;

const STORAGE_KEY = "login_failures";
const AMBIGUOUS_PATTERN = /inv[aá]lid|incorrect|credencial/i;
const LOCK_PATTERN = /bloquead|bloqueo|locked|lockout|too many|demasiados intentos|intentos fallidos|throttl/i;

function readAll() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* sin almacenamiento: se usa solo la señal del servidor */
  }
}

const keyFor = (email) => String(email || "").trim().toLowerCase();

export function registerFailedLogin(email, now = Date.now()) {
  const all = readAll();
  const key = keyFor(email);
  const current = all[key];
  const expired = !current || now - current.last > LOCK_MINUTES * 60_000;
  all[key] = { count: expired ? 1 : current.count + 1, last: now };
  writeAll(all);
  return all[key].count;
}

export function clearFailedLogins(email) {
  const all = readAll();
  delete all[keyFor(email)];
  writeAll(all);
}

/** Minutos que quedan de bloqueo según el contador local; 0 si no aplica. */
export function localLockMinutesLeft(email, now = Date.now()) {
  const entry = readAll()[keyFor(email)];
  if (!entry || entry.count < MAX_ATTEMPTS) return 0;
  const left = entry.last + LOCK_MINUTES * 60_000 - now;
  return left > 0 ? Math.ceil(left / 60_000) : 0;
}

/** Intentos que quedan antes del bloqueo según el contador local (0 si no hay datos). */
function attemptsLeft(email) {
  const entry = readAll()[keyFor(email)];
  if (!entry) return 0;
  return Math.max(MAX_ATTEMPTS - entry.count, 0);
}

function lockedMessage(minutes) {
  const wait = minutes > 0 ? `${minutes} minuto${minutes === 1 ? "" : "s"}` : `${LOCK_MINUTES} minutos`;
  return `Tu cuenta está bloqueada temporalmente por varios intentos fallidos. Podrás volver a intentarlo en aproximadamente ${wait}.`;
}

/**
 * Convierte el error del login en { type, message, minutes }.
 *   type: "locked" | "invalid" | "network" | "other"
 * Llamar DESPUÉS de registerFailedLogin(email) cuando el login falla.
 */
export function resolveLoginError(error, email, now = Date.now()) {
  const status = error?.status ?? error?.response?.status;
  if (status == null && /fetch|network|failed to fetch/i.test(error?.message || "")) {
    return { type: "network", message: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.", minutes: 0 };
  }

  const { general, fields } = extractApiErrors(error);
  const serverText = [...general, ...Object.values(fields).flat()].join(" ");

  const retryAfter = Number(error?.headers?.get?.("Retry-After") ?? error?.retryAfter);
  const serverMinutes = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter / 60) : 0;

  // El backend responde igual a "credenciales malas" y a "cuenta bloqueada":
  // "Credenciales inválidas o cuenta bloqueada." Ese texto es ambiguo y NO prueba un bloqueo.
  const ambiguous = AMBIGUOUS_PATTERN.test(serverText) && LOCK_PATTERN.test(serverText);
  const lockedByServer =
    status === 423 || status === 429 || (LOCK_PATTERN.test(serverText) && !ambiguous);
  const localMinutes = localLockMinutesLeft(email, now);

  if (lockedByServer || localMinutes > 0) {
    const minutes = serverMinutes || localMinutes || LOCK_MINUTES;
    return { type: "locked", message: lockedMessage(minutes), minutes };
  }

  if (status === 400 || status === 401) {
    const left = attemptsLeft(email);
    const hint =
      left > 0 && left < MAX_ATTEMPTS - 1
        ? ` Te ${left === 1 ? "queda 1 intento" : `quedan ${left} intentos`} antes de que la cuenta se bloquee ${LOCK_MINUTES} minutos.`
        : "";
    const base = ambiguous || !serverText ? "Correo o contraseña incorrectos." : serverText;
    return { type: "invalid", message: base + hint, minutes: 0 };
  }
  return { type: "other", message: serverText || "No se pudo iniciar sesión. Inténtalo de nuevo.", minutes: 0 };
}