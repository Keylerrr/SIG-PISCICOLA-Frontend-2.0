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
 * Procesa la respuesta HTTP y extrae mensajes de error amigables
 * respetando códigos de estado (400, 401, 403, 404, 500).
 */
async function handleResponse(res, fallbackMessage = "Error en la solicitud") {
  if (res.status === 204) {
    return true;
  }

  const contentType = res.headers.get("content-type") || "";
  let data = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (res.ok) {
    return data;
  }

  // Manejo de errores específicos según código HTTP
  if (res.status === 401) {
    throw new Error("Sesión expirada o no autenticada. Inicie sesión nuevamente.");
  }
  if (res.status === 403) {
    throw new Error(
      (typeof data === "object" && (data?.detail || data?.message)) ||
        "No tienes permisos suficientes para realizar esta acción en esta granja."
    );
  }
  if (res.status === 404) {
    throw new Error(
      (typeof data === "object" && (data?.detail || data?.message)) ||
        "El recurso solicitado no fue encontrado."
    );
  }

  let errorDetail = fallbackMessage;
  if (typeof data === "object" && data !== null) {
    if (data.detail) {
      errorDetail = data.detail;
    } else if (data.message) {
      errorDetail = data.message;
    } else if (data.error) {
      errorDetail = data.error;
    } else {
      // Extraer errores por campos específicos (ej. name: [...], email: [...])
      const entries = Object.entries(data);
      if (entries.length > 0) {
        errorDetail = entries
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      }
    }
  } else if (typeof data === "string" && data.trim().length > 0) {
    errorDetail = data;
  }

  throw new Error(errorDetail);
}

/**
 * Sanitiza la lista de permisos por aplicación según las reglas de negocio:
 * 1. No duplicar aplicaciones.
 * 2. Si can_create, can_edit o can_delete es true, can_view también debe ser true.
 * 3. Las aplicaciones core_alerts y core_auditlogs SOLO aceptan can_view.
 */
function sanitizeAppPermissions(appPermissions = []) {
  if (!Array.isArray(appPermissions)) return [];

  const seen = new Set();
  const sanitized = [];

  for (const perm of appPermissions) {
    if (!perm || !perm.app) continue;
    const appKey = String(perm.app).trim().toLowerCase();
    if (seen.has(appKey)) continue;
    seen.add(appKey);

    const isViewOnlyApp =
      appKey === "alerts" || appKey === "audit_logs";

    if (isViewOnlyApp) {
      sanitized.push({
        module: perm.app,
        can_view: Boolean(perm.can_view),
        can_create: false,
        can_update: false,
        can_delete: false,
      });
    } else {
      const anyAction = Boolean(
        perm.can_view || perm.can_create || perm.can_edit || perm.can_delete
      );
      sanitized.push({
        module: perm.app,
        can_view: anyAction,
        can_create: Boolean(perm.can_create),
        can_update: Boolean(perm.can_edit || perm.can_update),
        can_delete: Boolean(perm.can_delete),
      });
    }
  }

  return sanitized;
}

/* ==========================================================================
   2. GESTIÓN DE ROLES
   ========================================================================== */

/**
 * GET /api/farms/<farm_id>/roles/apps/
 * Obtiene las aplicaciones disponibles para configurar permisos de roles en esa granja.
 * Incluye core_alerts y core_auditlogs.
 */
export async function getFarmApps(farmId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/modules/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const modules = await handleResponse(res, "Error al obtener módulos de la granja");
  return Array.isArray(modules)
    ? modules.map((item) => ({ app: item.module, module: item.module, name: item.name }))
    : [];
}

/**
 * GET /api/farms/<farm_id>/roles/
 * Lista los roles activos de la granja indicada.
 */
export async function getFarmRoles(farmId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const roles = await handleResponse(res, "Error al obtener roles de la granja");
  return normalizeRoles(roles);
}

/**
 * GET /api/farms/<farm_id>/roles/<role_id>/
 * Obtiene el rol y sus permisos correspondientes a la granja.
 */
export async function getFarmRole(farmId, roleId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return normalizeRole(await handleResponse(res, "Error al obtener el rol de la granja"));
}

function normalizeRole(role) {
  if (!role || typeof role !== "object") return role;
  return {
    ...role,
    app_permissions: Array.isArray(role.module_permissions)
      ? role.module_permissions.map((permission) => ({
          app: permission.module,
          module: permission.module,
          can_view: Boolean(permission.can_view),
          can_create: Boolean(permission.can_create),
          can_edit: Boolean(permission.can_update),
          can_update: Boolean(permission.can_update),
          can_delete: Boolean(permission.can_delete),
        }))
      : [],
  };
}

function normalizeRoles(roles) {
  return Array.isArray(roles) ? roles.map(normalizeRole) : roles;
}

/**
 * POST /api/farms/<farm_id>/roles/
 * Crea un rol configurado dentro de la granja indicada.
 * data: { name: string, app_permissions?: Array<{ app, can_view, can_create, can_edit, can_delete }> }
 * En roles configurados no se envían permisos legacy de permissions.
 */
export async function createFarmRole(farmId, data, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/`);

  const payload = {
    name: data.name,
  };

  if (data.app_permissions !== undefined) {
    payload.module_permissions = sanitizeAppPermissions(data.app_permissions);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return await handleResponse(res, "Error al crear el rol en la granja");
}

/**
 * PUT o PATCH /api/farms/<farm_id>/roles/<role_id>/
 * Actualiza el rol y sus permisos por aplicación.
 * Regla: si se incluye app_permissions, reemplaza completamente la lista anterior.
 * Si se omite, los existentes se conservan. Para revocar todos: app_permissions: [].
 */
export async function updateFarmRole(
  farmId,
  roleId,
  data,
  method = "PATCH",
  token = null
) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);

  const payload = {};
  if (data.name !== undefined) {
    payload.name = data.name;
  }

  if (data.app_permissions !== undefined) {
    payload.module_permissions = sanitizeAppPermissions(data.app_permissions);
  }

  const res = await fetch(url, {
    method: method.toUpperCase(),
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return await handleResponse(res, "Error al actualizar el rol de la granja");
}

/**
 * DELETE /api/farms/<farm_id>/roles/<role_id>/
 * Desactiva el rol de esa granja.
 * Sus miembros quedan sin rol asignado y sin los permisos copiados.
 */
export async function deleteFarmRole(farmId, roleId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/roles/${roleId}/`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  await handleResponse(res, "Error al desactivar el rol de la granja");
  return true;
}

/* ==========================================================================
   3. ADMINISTRACIÓN DE MIEMBROS DE UNA GRANJA
   ========================================================================== */

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

  return await handleResponse(res, "Error al obtener miembros de la granja");
}

/**
 * GET /api/users/me/permissions/?farm_id=<farm_id>
 * Obtiene los permisos efectivos del usuario autenticado para una granja.
 */
export async function getCurrentUserFarmPermissions(farmId, token = null) {
  const params = new URLSearchParams({ farm_id: String(farmId) });
  const url = buildApiUrl(`/users/me/permissions/?${params.toString()}`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const data = await handleResponse(
    res,
    "Error al obtener los permisos efectivos de la granja"
  );
  if (!data || !Array.isArray(data.modules)) {
    throw new Error("La respuesta de permisos no contiene una lista de módulos válida.");
  }
  return data;
}

/**
 * GET /api/farms/<farm_id>/members/<user_id>/
 * Consulta la información específica de un miembro.
 */
export async function getFarmMember(farmId, userId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/members/${userId}/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return await handleResponse(res, "Error al obtener miembro de la granja");
}

/**
 * PATCH /api/farms/<farm_id>/members/<user_id>/
 * Permite actualizar aspectos específicos de la membresía:
 * - status: 'active' | 'inactive'
 * - farm_role: roleId | null
 * - permissions: string[] ('MANAGE_REVIEWS', 'MANAGE_INVENTORY', 'MANAGE_CYCLE', 'MANAGE_POND', 'MANAGE_FARM', 'MANAGE_USERS')
 */
export async function updateFarmMember(farmId, userId, data, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/members/${userId}/`);

  const payload = {};

  if (data.status !== undefined) {
    payload.status = data.status;
  }

  if (data.farm_role !== undefined) {
    payload.farm_role =
      data.farm_role === null || data.farm_role === ""
        ? null
        : Number(data.farm_role);
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return await handleResponse(res, "Error al actualizar la membresía");
}

/**
 * Asigna un rol al miembro o retira la asignación si roleIdOrNull es null.
 */
export async function assignMemberRole(farmId, userId, roleIdOrNull, token = null) {
  return await updateFarmMember(
    farmId,
    userId,
    { farm_role: roleIdOrNull },
    token
  );
}

/**
 * Actualiza el estado de la membresía ('active' | 'inactive').
 */
export async function updateMemberStatus(farmId, userId, status, token = null) {
  return await updateFarmMember(farmId, userId, { status }, token);
}

/**
 * Actualiza los permisos particulares de la membresía.
 */
export async function addMemberPersonalPermission(
  farmId,
  userId,
  permission,
  token = null
) {
  const url = buildApiUrl(`/farms/${farmId}/members/${userId}/personal-permissions/`);
  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      module: permission.module,
      operation: permission.operation,
    }),
  });
  return await handleResponse(res, "Error al agregar el permiso personalizado");
}

export async function removeMemberPersonalPermission(
  farmId,
  userId,
  permissionId,
  token = null
) {
  const url = buildApiUrl(
    `/farms/${farmId}/members/${userId}/personal-permissions/${permissionId}/`
  );
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  await handleResponse(res, "Error al retirar el permiso personalizado");
  return true;
}

/**
 * DELETE /api/farms/<farm_id>/members/<user_id>/
 * Retira al miembro indicado de la granja (no se permite retirar al propietario).
 */
export async function removeFarmMember(farmId, userId, token = null) {
  const url = buildApiUrl(`/farms/${farmId}/members/${userId}/`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  await handleResponse(res, "Error al retirar miembro de la granja");
  return true;
}

/* ==========================================================================
   4. INVITACIONES DE OPERARIOS
   ========================================================================== */

/**
 * POST /api/invitations/operario/
 * data: { email: string, farm_id: number }
 * Envía invitación para incorporarse a una granja.
 */
export async function sendOperarioInvitation(data, token = null) {
  const url = buildApiUrl(`/invitations/operario/`);
  const payload = {
    email: String(data.email || "").trim(),
    farm_id: Number(data.farm_id),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  return await handleResponse(res, "Error al enviar la invitación al operario");
}

/**
 * GET /api/invitations/?farm_id=<farm_id>
 * Lista las invitaciones correspondientes a la granja actual.
 */
export async function getFarmInvitations(farmId, token = null) {
  const url = buildApiUrl(`/invitations/?farm_id=${farmId}`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return await handleResponse(res, "Error al consultar invitaciones de la granja");
}

/* ==========================================================================
   6. MÓDULO DE AUDITORÍA POR GRANJA (EXCLUSIVO DE CONSULTA)
   ========================================================================== */

/**
 * GET /api/farms/core/<farm_id>/auditlogs/
 * Lista los registros de auditoría de la granja indicada.
 */
export async function getFarmAuditLogs(farmId, filters = {}, token = null) {
  const params = new URLSearchParams();
  ["date_from", "date_to", "origin", "origin_id", "user", "ip", "page"].forEach(
    (key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.set(key, String(filters[key]));
      }
    }
  );
  const query = params.toString();
  const url = buildApiUrl(
    `/farms/core/${farmId}/auditlogs/${query ? `?${query}` : ""}`
  );
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const data = await handleResponse(
    res,
    "Error al obtener registros de auditoría de la granja"
  );
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: Number(data?.count ?? 0),
    next: data?.next ?? null,
    previous: data?.previous ?? null,
    results: Array.isArray(data?.results) ? data.results : [],
  };
}

/**
 * GET /api/farms/core/<farm_id>/auditlogs/<id>/
 * Obtiene el detalle de un registro de auditoría de la granja.
 */
export async function getFarmAuditLog(farmId, auditId, token = null) {
  const url = buildApiUrl(`/farms/core/${farmId}/auditlogs/${auditId}/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return await handleResponse(
    res,
    "Error al obtener el detalle del registro de auditoría"
  );
}

/* ==========================================================================
   7. MÓDULO DE ALERTAS POR GRANJA (EXCLUSIVO DE CONSULTA)
   ========================================================================== */

/**
 * GET /api/farms/core/<farm_id>/alerts/
 * Admite filtros opcionales: source_type, severity, is_resolved.
 */
export async function getFarmAlerts(farmId, filters = {}, token = null) {
  const params = new URLSearchParams();
  if (filters.source_type && filters.source_type !== "all") {
    params.set("source_type", filters.source_type);
  }
  if (filters.severity && filters.severity !== "all") {
    params.set("severity", filters.severity);
  }
  if (
    filters.is_resolved !== undefined &&
    filters.is_resolved !== null &&
    filters.is_resolved !== "all"
  ) {
    params.set("is_resolved", String(filters.is_resolved));
  }

  const queryString = params.toString();
  const endpoint = `/farms/core/${farmId}/alerts/${
    queryString ? `?${queryString}` : ""
  }`;

  const url = buildApiUrl(endpoint);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return await handleResponse(res, "Error al obtener alertas de la granja");
}

/**
 * GET /api/farms/core/<farm_id>/alerts/<id>/
 * Obtiene el detalle de una alerta de la granja.
 */
export async function getFarmAlert(farmId, alertId, token = null) {
  const url = buildApiUrl(`/farms/core/${farmId}/alerts/${alertId}/`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  return await handleResponse(
    res,
    "Error al obtener el detalle de la alerta"
  );
}
