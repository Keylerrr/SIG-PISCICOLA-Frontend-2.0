import { useEffect, useState, useMemo, useCallback } from "react";
import {
  PERMISSIONS,
  hasPermission,
  hasAppPermission,
  canAccessModule,
} from "@/lib/permissions";
import { getFarmMembers, getFarmRoles } from "@/lib/roleService";

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
    legacyPermissions: [],
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("access") : null;
      const user =
        typeof window !== "undefined"
          ? JSON.parse(localStorage.getItem("user") || "null")
          : null;

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
            legacyPermissions: [],
            loading: false,
          });
        }
        return;
      }

      try {
        // Obtenemos los miembros de la granja
        const members = await getFarmMembers(farmId, token);
        const me = Array.isArray(members)
          ? members.find((member) => member?.user?.id === user?.id)
          : null;

        const isFarmMember = Boolean(me);
        const isOwner = Boolean(me?.is_owner);

        let roleData = null;
        let appPermissions = [];
        let legacyPermissions = Array.isArray(me?.permissions) ? me.permissions : [];

        // Si el miembro tiene app_permissions directamente en su objeto
        if (Array.isArray(me?.app_permissions)) {
          appPermissions = me.app_permissions;
        }

        // Si tiene un farm_role asignado, buscamos el rol y sus permisos
        if (me?.farm_role) {
          try {
            const roles = await getFarmRoles(farmId, token);
            if (Array.isArray(roles)) {
              roleData = roles.find((r) => r.id === me.farm_role) || null;
              if (roleData) {
                if (Array.isArray(roleData.app_permissions) && appPermissions.length === 0) {
                  appPermissions = roleData.app_permissions;
                }
                if (Array.isArray(roleData.permissions) && legacyPermissions.length === 0) {
                  legacyPermissions = roleData.permissions;
                }
              }
            }
          } catch (roleErr) {
            console.error("Error al cargar roles de la granja:", roleErr);
          }
        }

        if (mounted) {
          setState({
            isFarmMember,
            isOwner,
            isAdmin,
            isProductor,
            farmRole: me?.farm_role || null,
            roleData,
            appPermissions,
            legacyPermissions,
            loading: false,
          });
        }
      } catch (error) {
        if (mounted) {
          setState({
            isFarmMember: false,
            isOwner: false,
            isAdmin,
            isProductor,
            farmRole: null,
            roleData: null,
            appPermissions: [],
            legacyPermissions: [],
            loading: false,
          });
        }
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [farmId]);

  // Evaluaciones de acceso completo
  const hasFullAccess = useMemo(() => {
    return (
      state.isAdmin ||
      state.isOwner ||
      (state.isProductor && state.isFarmMember) ||
      state.isProductor
    );
  }, [state.isAdmin, state.isOwner, state.isProductor, state.isFarmMember]);

  // Verificador genérico por app y acción
  const can = useCallback(
    (appKey, action = "view") => {
      if (hasFullAccess) return true;
      return hasAppPermission(state.appPermissions, appKey, action);
    },
    [hasFullAccess, state.appPermissions]
  );

  const canView = useCallback((appKey) => can(appKey, "view"), [can]);
  const canCreate = useCallback((appKey) => can(appKey, "create"), [can]);
  const canEdit = useCallback((appKey) => can(appKey, "edit"), [can]);
  const canDelete = useCallback((appKey) => can(appKey, "delete"), [can]);

  // Permisos de alto nivel para retrocompatibilidad con las páginas existentes
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
