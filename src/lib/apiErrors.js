// Extrae mensajes legibles de errores de la API (DRF) para mostrarlos en el formulario (D-11, D-46, D-07).
//
// Formas de payload que entiende:
//   { non_field_errors: ["..."] }          -> general
//   { detail: "..." }                      -> general
//   { area: ["..."], name: ["..."] }       -> por campo
//   ["..."]  /  "texto"                    -> general
//   { campo: { sub: ["..."] } }            -> aplanado como "campo.sub"

const GENERAL_KEYS = new Set(["non_field_errors", "detail", "error", "errors", "message", "mensaje"]);

// Mensajes por defecto de Django REST Framework, que llegan en inglés
const TRANSLATIONS = {
  "You do not have permission to perform this action.": "No tienes permisos para realizar esta acción.",
  "Authentication credentials were not provided.": "Debes iniciar sesión para realizar esta acción.",
  "Given token not valid for any token type": "Tu sesión ya no es válida. Inicia sesión de nuevo.",
  "Not found.": "No se encontró el recurso solicitado.",
  "A server error occurred.": "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
  "This field is required.": "Este campo es obligatorio.",
  "This field may not be blank.": "Este campo no puede estar vacío.",
  "A valid number is required.": "Ingresa un número válido.",
};
const translate = (text) => TRANSLATIONS[text] ?? text;

function toMessages(value) {
  if (value == null) return [];
  if (typeof value === "string") return value.trim() ? [translate(value.trim())] : [];
  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (typeof value === "object") return Object.values(value).flatMap(toMessages);
  return [];
}

function readPayload(error) {
  if (!error) return null;
  if (typeof error === "string") return error;
  return error.payload ?? error.data ?? error.body ?? error.response?.data ?? null;
}

export function extractApiErrors(error) {
  const general = [];
  const fields = {};
  const payload = readPayload(error);

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const walk = (obj, prefix = "") => {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (GENERAL_KEYS.has(key) && !prefix) {
          general.push(...toMessages(value));
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          walk(value, path);
        } else {
          const messages = toMessages(value);
          if (messages.length) fields[path] = messages;
        }
      });
    };
    walk(payload);
  } else {
    general.push(...toMessages(payload));
  }

  if (!general.length && !Object.keys(fields).length && error?.message) {
    general.push(error.message);
  }

  return { general, fields };
}

/** Un solo texto con todo lo que devolvió el servidor, útil para toast o alerta. */
export function getApiErrorMessage(error, fallback = "No se pudo completar la operación.") {
  const { general, fields } = extractApiErrors(error);
  const all = [...general, ...Object.values(fields).flat()];
  return all.length ? all.join(" ") : fallback;
}