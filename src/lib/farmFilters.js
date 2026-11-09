// Datos, búsqueda y filtros del listado de granjas (D-12 / RF03). Funciones puras.

export const ALL = "__ALL__";

export const STATUS_LABELS = { active: "Activa", inactive: "Inactiva" };

/** Minúsculas y sin tildes, para que "Boyacá" coincida con "boyaca". */
export function fold(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Cantidad de estanques a partir de la respuesta de GET /farms/{id}/ponds/ (arreglo o paginada). */
export function countPonds(data) {
  if (Array.isArray(data)) return data.length;
  if (data && typeof data.count === "number") return data.count;
  if (data && Array.isArray(data.results)) return data.results.length;
  return null;
}

/** Nombre del propietario a partir de GET /farms/{id}/members/ (el miembro con is_owner). */
export function ownerNameFromMembers(members) {
  if (!Array.isArray(members)) return null;
  const owner = members.find((m) => m?.is_owner);
  const user = owner?.user;
  if (!user) return null;
  const full = [user.name, user.lastname].filter(Boolean).join(" ").trim();
  return full || user.full_name || user.email || null;
}

/**
 * Modelo de vista de una tarjeta.
 * Usa los campos de la API si existen (owner_name, ponds_count) y, si no, lo que se haya
 * consultado aparte (`extra`).  undefined = aún cargando, null = sin dato.
 */
export function buildFarmView(farm, { deptMap, cityMap, extra } = {}) {
  const ownerFromApi = farm.owner_name ?? (typeof farm.owner === "string" ? farm.owner : null);
  const pondsFromApi = farm.ponds_count ?? farm.pond_count ?? null;
  return {
    raw: farm,
    id: farm.id,
    name: farm.name ?? "Sin nombre",
    department: deptMap?.get(farm.department) ?? null,
    municipality: cityMap?.get(farm.city) ?? null,
    owner: ownerFromApi ?? (extra ? extra.owner : undefined),
    pondsCount: pondsFromApi ?? (extra ? extra.pondsCount : undefined),
    status: farm.status ?? null,
  };
}

export function filterFarms(views, { query = "", department = ALL, status = ALL } = {}) {
  const q = fold(query);
  return views.filter((v) => {
    if (department !== ALL && fold(v.department) !== fold(department)) return false;
    if (status !== ALL && v.status !== status) return false;
    if (!q) return true;
    return [v.name, v.municipality, v.department, v.owner].some((field) => fold(field).includes(q));
  });
}

export function getDepartmentOptions(views) {
  return [...new Set(views.map((v) => v.department).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es")
  );
}

/** Siempre ofrece Activa e Inactiva, más cualquier otro estado que aparezca en los datos. */
export function getStatusOptions(views) {
  const base = Object.keys(STATUS_LABELS);
  const extra = views.map((v) => v.status).filter((s) => s && !base.includes(s));
  return [...base, ...new Set(extra)];
}