import { useEffect, useState, useMemo, useCallback } from "react";
import {
  PERMISSIONS,
  hasPermission,
  hasAppPermission,
  canAccessModule,
} from "@/lib/permissions";
import {
  getFarmMember,
  getCurrentUserFarmPermissions,
} from "@/lib/roleService";

function normalizeRole(role) {
  if (!role) return "";
  if (typeof role === "string") return role.toLowerCase();
  return (role.name || role).toString().toLowerCase();
}

export function usePermissions(farmId) {
  const [state, setState] = useState({
    isFarmMember: false,
    isOwner: false,
    isAdmin: false,
    isProductor: false,
    farmRole: null,
    roleData: null,
    appPermissions: [],
    particularPermissions: [],
    legacyPermissions: [],
    currentMember: null,
    loading: true,
    permissionsError: null,
  });

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("access") : null;
      let user = null;
      try {
        user =
          typeof window !== "undefined"
            ? JSON.parse(localStorage.getItem("user") || "null")
            : null;
      } catch (error) {
        console.error("Error al leer el usuario de la sesión:", error);
      }

      const normalizedRole = normalizeRole(user?.role);
      const isAdmin = normalizedRole === "admin";
      const isProductor = normalizedRole === "productor";

      if (!token || !farmId) {
        if (mounted) {
          setState({
            isFarmMember: false,
            isOwner: false,
            isAdmin,
            isProductor,
            farmRole: null,
            roleData: null,
            appPermissions: [],
            particularPermissions: [],
            legacyPermissions: [],
            currentMember: null,
            loading: false,
            permissionsError: null,
          });
        }
        return;
      }

      try {
        const effectivePermissions = await getCurrentUserFarmPermissions(
          farmId,
          token
        );
        const appPermissions = effectivePermissions.modules
          .filter((item) => item?.module)
          .map((item) => {
            const operations = new Set(
              Array.isArray(item.permissions)
                ? item.permissions.map((operation) =>
                    String(operation).toLowerCase()
                  )
                : []
            );
            const canView = operations.has("view");
            const canCreate = operations.has("create");
            const canEdit =
              operations.has("edit") || operations.has("update");
            const canDelete = operations.has("delete");

            return {
              app: item.module,
              module: item.module,
              can_view: canView,
              can_create: canCreate,
              can_edit: canEdit,
              can_update: canEdit,
              can_delete: canDelete,
            };
          });

        if (mounted) {
          setState({
            isFarmMember: !isAdmin,
            isOwner: false,
            isAdmin,
            isProductor,
            farmRole: null,
            roleData: null,
            appPermissions,
            particularPermissions: [],
            legacyPermissions: [],
            currentMember: null,
            loading: false,
            permissionsError: null,
          });
        }

        if (user?.id != null) {
          try {
            const me = await getFarmMember(farmId, user.id, token);
            if (mounted) {
              setState((current) => ({
                ...current,
                isFarmMember: true,
                isOwner: Boolean(me?.is_owner),
                farmRole: me?.farm_role ?? me?.farm_role_id ?? null,
                currentMember: me,
              }));
            }
          } catch {
            // La consulta de metadatos de membresía no bloquea la carga de módulos.
          }
        }
      } catch (error) {
        console.error("Error al cargar los permisos efectivos de la granja:", error);
        if (mounted) {
          setState({
            isFarmMember: false,
            isOwner: false,
            isAdmin,
            isProductor,
            farmRole: null,
            roleData: null,
            appPermissions: [],
            particularPermissions: [],
            legacyPermissions: [],
            currentMember: null,
            loading: false,
            permissionsError: error.message || "No se pudieron cargar los permisos de la granja.",
          });
        }
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [farmId]);

  // Evaluaciones de acceso completo:
  // - Administrador global conserva privilegios globales.
  // - El productor propietario conserva la administración de su propia granja (is_owner: true).
  // - El rol global 'Productor' por sí solo NO otorga acceso total si no es propietario de esta granja.
  const hasFullAccess = useMemo(() => {
    return state.isAdmin || state.isOwner;
  }, [state.isAdmin, state.isOwner]);

  // Verificador genérico por app y acción
  const can = useCallback(
    (appKey, action = "view") => {
      if (hasFullAccess) return true;
      return canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: appKey,
        action,
      });
    },
    [hasFullAccess, state.appPermissions, state.legacyPermissions]
  );

  const canView = useCallback((appKey) => can(appKey, "view"), [can]);
  const canCreate = useCallback((appKey) => can(appKey, "create"), [can]);
  const canEdit = useCallback((appKey) => can(appKey, "edit"), [can]);
  const canDelete = useCallback((appKey) => can(appKey, "delete"), [can]);

  // Gestión de usuarios y miembros:
  // También admite los permisos granulares de user_administration configurados en el rol.
  const canManageUsers = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: "users",
        action: "view",
      }) ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_USERS) ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_FARM)
    );
  }, [
    hasFullAccess,
    state.appPermissions,
    state.legacyPermissions,
    state.particularPermissions,
  ]);

  // Módulo de Auditoría por granja (audit_logs):
  // Exclusivo de consulta por app_permissions o permisos generales
  const canViewAuditLogs = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      hasAppPermission(state.appPermissions, "audit_logs", "view") ||
      hasAppPermission(state.appPermissions, "core_auditlogs", "view") ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_USERS) ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_FARM)
    );
  }, [hasFullAccess, state.appPermissions, state.particularPermissions]);

  // Módulo de Alertas por granja (core_alerts):
  // Permiso independiente en app_permissions
  const canViewAlerts = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      hasAppPermission(state.appPermissions, "core_alerts", "view") ||
      hasAppPermission(state.appPermissions, "alerts", "view") ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_FARM)
    );
  }, [hasFullAccess, state.appPermissions, state.particularPermissions]);

  // Permisos por módulo de la granja (retrocompatibilidad)
  const canManageCycle = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: "production",
        action: "view",
      }) ||
      hasPermission(state.legacyPermissions, PERMISSIONS.MANAGE_CYCLE)
    );
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManagePonds = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: "ponds",
        action: "view",
      }) ||
      hasPermission(state.legacyPermissions, PERMISSIONS.MANAGE_POND)
    );
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageInventory = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: "inventory",
        action: "view",
      }) ||
      hasPermission(state.legacyPermissions, PERMISSIONS.MANAGE_INVENTORY)
    );
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageFarm = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      canAccessModule({
        appPermissions: state.appPermissions,
        legacyPermissions: state.legacyPermissions,
        moduleName: "farms",
        action: "view",
      }) ||
      hasPermission(state.legacyPermissions, PERMISSIONS.MANAGE_FARM)
    );
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageHealth = useMemo(() => {
    if (hasFullAccess) return true;
    return canAccessModule({
      appPermissions: state.appPermissions,
      legacyPermissions: state.legacyPermissions,
      moduleName: "health",
      action: "view",
    });
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageFeeding = useMemo(() => {
    if (hasFullAccess) return true;
    return canAccessModule({
      appPermissions: state.appPermissions,
      legacyPermissions: state.legacyPermissions,
      moduleName: "feeding",
      action: "view",
    });
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageMonitoring = useMemo(() => {
    if (hasFullAccess) return true;
    return canAccessModule({
      appPermissions: state.appPermissions,
      legacyPermissions: state.legacyPermissions,
      moduleName: "monitoring",
      action: "view",
    });
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  const canManageSales = useMemo(() => {
    if (hasFullAccess) return true;
    return canAccessModule({
      appPermissions: state.appPermissions,
      legacyPermissions: state.legacyPermissions,
      moduleName: "sales",
      action: "view",
    });
  }, [hasFullAccess, state.appPermissions, state.legacyPermissions]);

  return {
    ...state,
    hasFullAccess,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    hasAppPermission: can,
    particularPermissions: state.particularPermissions,
    memberPermissions: state.particularPermissions,
    canManageUsers,
    canViewAuditLogs,
    canViewAlerts,
    canManageCycle,
    canManagePonds,
    canManageInventory,
    canManageFarm,
    canManageHealth,
    canManageFeeding,
    canManageMonitoring,
    canManageSales,
  };
}
