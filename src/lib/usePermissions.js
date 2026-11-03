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
    particularPermissions: [],
    legacyPermissions: [],
    currentMember: null,
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
            particularPermissions: [],
            legacyPermissions: [],
            currentMember: null,
            loading: false,
          });
        }
        return;
      }

      try {
        // Obtenemos los miembros de la granja actual de forma estrictamente aislada
        const members = await getFarmMembers(farmId, token);
        const me = Array.isArray(members)
          ? members.find((member) => member?.user?.id === user?.id)
          : null;

        const isFarmMember = Boolean(me);
        const isOwner = Boolean(me?.is_owner);
        const isActive = me ? me.status === "active" : false;

        let roleData = null;
        let appPermissions = [];
        let particularPermissions = [];
        let legacyPermissions = [];

        // Si la membresía está activa (o el usuario es admin/propietario)
        if (isAdmin || isOwner || isActive) {
          if (Array.isArray(me?.permissions)) {
            particularPermissions = [...me.permissions];
            legacyPermissions = [...me.permissions];
          }

          if (Array.isArray(me?.app_permissions)) {
            appPermissions = [...me.app_permissions];
          }

          // Si tiene un farm_role asignado, cargamos el rol y sus permisos de la granja
          if (me?.farm_role) {
            try {
              const roles = await getFarmRoles(farmId, token);
              if (Array.isArray(roles)) {
                roleData = roles.find((r) => r.id === me.farm_role) || null;
                if (roleData) {
                  if (Array.isArray(roleData.app_permissions)) {
                    // Combinar app_permissions evitando duplicados
                    const existingApps = new Set(
                      appPermissions.map((p) => p.app)
                    );
                    for (const rolePerm of roleData.app_permissions) {
                      if (!existingApps.has(rolePerm.app)) {
                        appPermissions.push(rolePerm);
                      }
                    }
                  }

                  // Regla crítica: Un rol configurado con app_permissions no autoriza operaciones
                  // mediante permissions heredados ni hereda MANAGE_USERS ni MANAGE_FARM.
                  // Si el rol es antiguo y carece de app_permissions, solo entonces se consideran permisos heredados.
                  const isConfiguredRole =
                    Array.isArray(roleData.app_permissions) &&
                    roleData.app_permissions.length > 0;

                  if (
                    !isConfiguredRole &&
                    Array.isArray(roleData.permissions)
                  ) {
                    const setLeg = new Set(legacyPermissions);
                    for (const p of roleData.permissions) {
                      if (
                        p !== PERMISSIONS.MANAGE_USERS &&
                        p !== PERMISSIONS.MANAGE_FARM
                      ) {
                        setLeg.add(p);
                      }
                    }
                    legacyPermissions = Array.from(setLeg);
                  }
                }
              }
            } catch (roleErr) {
              console.error("Error al cargar roles de la granja:", roleErr);
            }
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
            particularPermissions,
            legacyPermissions,
            currentMember: me,
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
            particularPermissions: [],
            legacyPermissions: [],
            currentMember: null,
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
      return hasAppPermission(state.appPermissions, appKey, action);
    },
    [hasFullAccess, state.appPermissions]
  );

  const canView = useCallback((appKey) => can(appKey, "view"), [can]);
  const canCreate = useCallback((appKey) => can(appKey, "create"), [can]);
  const canEdit = useCallback((appKey) => can(appKey, "edit"), [can]);
  const canDelete = useCallback((appKey) => can(appKey, "delete"), [can]);

  // Gestión de usuarios y miembros:
  // Requiere ser propietario/admin o tener explícitamente MANAGE_USERS / MANAGE_FARM en los permisos particulares.
  const canManageUsers = useMemo(() => {
    if (hasFullAccess) return true;
    return (
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_USERS) ||
      hasPermission(state.particularPermissions, PERMISSIONS.MANAGE_FARM)
    );
  }, [hasFullAccess, state.particularPermissions]);

  // Módulo de Auditoría por granja (core_auditlogs):
  // Exclusivo de consulta por app_permissions o permisos generales
  const canViewAuditLogs = useMemo(() => {
    if (hasFullAccess) return true;
    return (
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
