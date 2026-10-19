import { buildApiUrl } from "./apiConfig";

function getAuthHeaders(token) {
  const currentToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("access") : null);

  const headers = {
    "Content-Type": "application/json",
  };

  if (currentToken) {
    headers.Authorization = `Bearer ${currentToken}`;
  }

  return headers;
}

/**
 * GET /api/farms/<farm_id>/roles/apps/
 * Lista las aplicaciones dinámicas instaladas bajo apps.* en el backend.
 * Retorna array de { app: string, name: string }.
 */
export async function getFarmApps(farmId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/apps/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Error al obtener aplicaciones de la granja (${res.status})`);
  }

  return await res.json();
}

/**
 * GET /api/farms/<farm_id>/roles/
 * Lista los roles activos de esa granja con name, permissions heredados y app_permissions.
 */
export async function getFarmRoles(farmId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Error al obtener roles de la granja (${res.status})`);
  }

  return await res.json();
}

/**
 * GET /api/farms/<farm_id>/roles/<role_id>/
 * Obtiene un rol y sus permisos para una granja.
 */
export async function getFarmRole(farmId, roleId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Error al obtener el rol (${res.status})`);
  }

  return await res.json();
}

/**
 * POST /api/farms/<farm_id>/roles/
 * Crea un rol dentro de la granja indicada.
 * data: { name: string, app_permissions?: Array<{ app, can_view, can_create, can_edit, can_delete }> }
 */
export async function createFarmRole(farmId, data, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/`);

  // Asegurar que can_view sea true si cualquiera de las otras acciones está activa
  const sanitizedPermissions = (data.app_permissions || []).map((perm) => ({
    app: perm.app,
    can_view: Boolean(
      perm.can_view || perm.can_create || perm.can_edit || perm.can_delete
    ),
    can_create: Boolean(perm.can_create),
    can_edit: Boolean(perm.can_edit),
    can_delete: Boolean(perm.can_delete),
  }));

  const payload = {
    name: data.name,
    app_permissions: sanitizedPermissions,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = "Error al crear el rol";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
      else if (errJson.name) errorDetail = Array.isArray(errJson.name) ? errJson.name[0] : errJson.name;
      else if (typeof errJson === "object") {
        errorDetail = Object.entries(errJson)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      }
    } catch {}
    throw new Error(errorDetail);
  }

  return await res.json();
}

/**
 * PUT o PATCH /api/farms/<farm_id>/roles/<role_id>/
 * Actualiza el rol y sus permisos.
 */
export async function updateFarmRole(farmId, roleId, data, method = "PATCH", token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);

  const payload = {};
  if (data.name !== undefined) {
    payload.name = data.name;
  }

  if (data.app_permissions !== undefined) {
    payload.app_permissions = (data.app_permissions || []).map((perm) => ({
      app: perm.app,
      can_view: Boolean(
        perm.can_view || perm.can_create || perm.can_edit || perm.can_delete
      ),
      can_create: Boolean(perm.can_create),
      can_edit: Boolean(perm.can_edit),
      can_delete: Boolean(perm.can_delete),
    }));
  }

  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorDetail = "Error al actualizar el rol";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
      else if (errJson.name) errorDetail = Array.isArray(errJson.name) ? errJson.name[0] : errJson.name;
      else if (typeof errJson === "object") {
        errorDetail = Object.entries(errJson)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      }
    } catch {}
    throw new Error(errorDetail);
  }

  return await res.json();
}

/**
 * DELETE /api/farms/<farm_id>/roles/<role_id>/
 * Desactiva el rol de esa granja.
 */
export async function deleteFarmRole(farmId, roleId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    let errorDetail = "Error al desactivar el rol";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {}
    throw new Error(errorDetail);
  }

  return true;
}

/**
 * GET /api/farms/<farm_id>/members/
 * Lista los miembros de la granja.
 */
export async function getFarmMembers(farmId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/members/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    throw new Error(`Error al obtener miembros de la granja (${res.status})`);
  }

  return await res.json();
}

/**
 * PATCH /api/farms/<farm_id>/members/<user_id>/
 * Asigna un rol al miembro o retira la asignación si roleId es null.
 */
export async function assignMemberRole(farmId, userId, roleIdOrNull, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/members/${userId}/`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      farm_role: roleIdOrNull === null || roleIdOrNull === "" ? null : Number(roleIdOrNull),
    }),
  });

  if (!res.ok) {
    let errorDetail = "Error al asignar rol al trabajador";
    try {
      const errJson = await res.json();
      if (errJson.detail) errorDetail = errJson.detail;
      else if (errJson.farm_role) errorDetail = Array.isArray(errJson.farm_role) ? errJson.farm_role[0] : errJson.farm_role;
    } catch {}
    throw new Error(errorDetail);
  }

  return await res.json();
}
