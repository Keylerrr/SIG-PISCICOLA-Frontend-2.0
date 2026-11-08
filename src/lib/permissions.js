export const PERMISSIONS = {
  MANAGE_REVIEWS: "MANAGE_REVIEWS",
  MANAGE_INVENTORY: "MANAGE_INVENTORY",
  MANAGE_CYCLE: "MANAGE_CYCLE",
  MANAGE_POND: "MANAGE_POND",
  MANAGE_FARM: "MANAGE_FARM",
  MANAGE_USERS: "MANAGE_USERS",
};

const hierarchy = {
  MANAGE_FARM: [
    "MANAGE_POND",
    "MANAGE_CYCLE",
    "MANAGE_REVIEWS",
    "MANAGE_INVENTORY",
    "MANAGE_USERS",
  ],

  MANAGE_POND: [
    "MANAGE_CYCLE",
    "MANAGE_REVIEWS",
  ],

  MANAGE_CYCLE: [
    "MANAGE_REVIEWS",
  ],
};

export function expandPermissions(permissions = []) {
  const set = new Set(permissions);

  let changed = true;

  while (changed) {
    changed = false;

    for (const perm of Array.from(set)) {
      const inherited = hierarchy[perm] || [];

      for (const p of inherited) {
        if (!set.has(p)) {
          set.add(p);
          changed = true;
        }
      }
    }
  }

  return Array.from(set);
}

export function hasPermission(userPermissions, permission) {
  return expandPermissions(userPermissions).includes(permission);
}

/**
 * Valida si un conjunto de app_permissions autoriza una acción sobre una app.
 * Reglas del backend:
 * - GET / HEAD / OPTIONS requieren can_view.
 * - POST requiere can_create (y can_view).
 * - PUT / PATCH requieren can_edit (y can_view).
 * - DELETE requiere can_delete (y can_view).
 *
 * @param {Array<{app: string, can_view: boolean, can_create: boolean, can_edit: boolean, can_delete: boolean}>} appPermissions
 * @param {string} appKey - Clave de la aplicación (e.g. 'health', 'monitoring', 'production', 'ponds')
 * @param {string} action - 'view' | 'create' | 'edit' | 'delete' | 'manage'
 */
export function hasAppPermission(appPermissions = [], appKey, action = "view") {
  if (!Array.isArray(appPermissions) || !appKey) return false;

  const key = String(appKey).trim().toLowerCase();
  const perm = appPermissions.find(
    (p) => String(p?.app || "").trim().toLowerCase() === key
  );

  if (!perm) return false;

  const normalizedAction = String(action || "view").toLowerCase();

  // alerts y audit_logs son permisos independientes y solamente aceptan can_view
  if (key === "alerts" || key === "audit_logs") {
    if (
      normalizedAction === "view" ||
      normalizedAction === "read" ||
      normalizedAction === "get" ||
      normalizedAction === "head" ||
      normalizedAction === "options" ||
      normalizedAction === "manage" ||
      normalizedAction === "any"
    ) {
      return Boolean(perm.can_view);
    }
    return false;
  }

  switch (normalizedAction) {
    case "view":
    case "read":
    case "get":
    case "head":
    case "options":
      return Boolean(perm.can_view);

    case "create":
    case "post":
      return Boolean(perm.can_create && perm.can_view);

    case "edit":
    case "update":
    case "put":
    case "patch":
      return Boolean(perm.can_edit && perm.can_view);

    case "delete":
      return Boolean(perm.can_delete && perm.can_view);

    case "manage":
    case "any":
      return Boolean(perm.can_view);

    default:
      return Boolean(perm.can_view);
  }
}

/**
 * Evalúa si el usuario puede acceder/gestionar un módulo determinado,
 * considerando tanto el nuevo sistema de app_permissions como el sistema heredado.
 */
export function canAccessModule({
  appPermissions = [],
  legacyPermissions = [],
  moduleName,
  action = "view",
}) {
  const normModule = String(moduleName || "").trim().toLowerCase();

  // Mapeos comunes entre módulos y apps del backend / permisos heredados
  const map = {
    production: {
      apps: ["production", "cycles", "produccion"],
      legacy: [PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_FARM],
    },
    cycles: {
      apps: ["production", "cycles", "produccion"],
      legacy: [PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_FARM],
    },
    ponds: {
      apps: ["ponds", "estanques"],
      legacy: [PERMISSIONS.MANAGE_POND, PERMISSIONS.MANAGE_FARM],
    },
    inventory: {
      apps: ["inventory", "inventario"],
      legacy: [PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.MANAGE_FARM],
    },
    farms: {
      apps: ["farms", "granjas"],
      legacy: [PERMISSIONS.MANAGE_FARM],
    },
    health: {
      apps: ["health", "salud"],
      legacy: [PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_FARM],
    },
    feeding: {
      apps: ["feeding", "alimentacion"],
      legacy: [PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_FARM],
    },
    monitoring: {
      apps: ["monitoring", "monitoreo"],
      legacy: [PERMISSIONS.MANAGE_REVIEWS, PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_FARM],
    },
    sales: {
      apps: ["sales", "ventas"],
      legacy: [PERMISSIONS.MANAGE_INVENTORY, PERMISSIONS.MANAGE_FARM],
    },
    harvest: {
      apps: ["harvest", "cosecha", "production"],
      legacy: [PERMISSIONS.MANAGE_CYCLE, PERMISSIONS.MANAGE_FARM],
    },
    users: {
      apps: ["users", "members"],
      legacy: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_FARM],
    },
    personal: {
      apps: ["users", "members"],
      legacy: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_FARM],
    },
    audit: {
      apps: ["audit_logs"],
      legacy: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_FARM],
    },
    auditlogs: {
      apps: ["audit_logs"],
      legacy: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_FARM],
    },
    alerts: {
      apps: ["alerts"],
      legacy: [],
    },
  };

  const config = map[normModule] || { apps: [normModule], legacy: [] };

  // Verificar app_permissions
  for (const app of config.apps) {
    if (hasAppPermission(appPermissions, app, action)) {
      return true;
    }
  }

  // Verificar permisos heredados
  for (const leg of config.legacy) {
    if (hasPermission(legacyPermissions, leg)) {
      return true;
    }
  }

  return false;
}