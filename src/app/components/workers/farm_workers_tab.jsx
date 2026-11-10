"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users,
  Shield,
  ShieldCheck,
  Trash2,
  Edit2,
  NotebookPen,
  Check,
  AlertCircle,
  ArrowLeft,
  Info,
  Mail,
  History,
  BellRing,
  Eye,
  RefreshCw,
  Search,
  Crown,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getFarmApps,
  getFarmRoles,
  getFarmRole,
  createFarmRole,
  updateFarmRole,
  deleteFarmRole,
  getFarmMembers,
  updateFarmMember,
  removeFarmMember,
  addMemberPersonalPermission,
  removeMemberPersonalPermission,
  sendOperarioInvitation,
  getFarmInvitations,
  getFarmAuditLogs,
  getFarmAuditLog,
  getFarmAlerts,
  getFarmAlert,
} from "@/lib/roleService";
import { usePermissions } from "@/lib/usePermissions";

const PERSONAL_PERMISSION_OPERATIONS = ["view", "create", "update", "delete"];

const MODULE_LABELS = {
  production_batches: "Lotes de producción",
  production_cycles: "Ciclos de producción",
  farm_events: "Eventos de la granja",
  feeding_management: "Gestión de alimentación",
  harvest_management: "Gestión de cosechas",
  fish_health: "Salud de los peces",
  water_quality_monitoring: "Calidad del agua",
  pond_management: "Gestión de estanques",
  inventory_products: "Inventario de productos",
  inventory_purchases: "Compras",
  inventory_sales: "Ventas",
  species_catalog: "Catálogo de especies",
  farm_management: "Administración de la granja",
  alerts: "Alertas",
  audit_logs: "Auditoría",
  user_administration: "Administración de usuarios",
};

const ACTION_LABELS = {
  view: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
};

const getModuleLabel = (module, apiName) =>
  MODULE_LABELS[module] || apiName || module;

const getActionLabel = (action) =>
  ACTION_LABELS[action] || action;

const AUDIT_TYPE_LABELS = {
  All: "Todos los tipos",
  User: "Usuario",
  UserFarm: "Usuario de la finca",
  Farm: "Finca",
  FarmRole: "Rol de finca",
  Pond: "Estanque",
  UserFarmPond: "Personal de estanque",
  Product: "Producto",
  Supplier: "Proveedor",
  Specie: "Especie",
  Cycle: "Ciclo",
  Harvest: "Cosecha",
  Alert: "Alerta",
  Sale: "Venta",
  Client: "Cliente",
  Buy: "Compra",
  Invitation: "Invitación",
  ProductionPlan: "Plan de producción",
  InventoryMovement: "Movimiento de inventario",
};

const AUDIT_FIELD_LABELS = {
  name: "Nombre",
  status: "Estado",
  description: "Descripción",
  email: "Correo electrónico",
  farm_role_id: "Rol de la finca",
  role_id: "Rol",
  user_id: "Usuario",
  farm_id: "Finca",
  pond_id: "Estanque",
  phone: "Teléfono",
  active: "Activo",
  is_active: "Activo",
};

const getAuditTypeLabel = (type) =>
  AUDIT_TYPE_LABELS[type] || type || "Tipo desconocido";

const getAuditFieldLabel = (field) =>
  AUDIT_FIELD_LABELS[field] || String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatAuditValue = (value) => {
  if (value === null || value === undefined || value === "") return "Ninguno";
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "object") {
    if (value.nombre) return value.nombre;
    if (value.name) return value.name;
    if (value.id !== undefined) return `#${value.id}`;
    return JSON.stringify(value);
  }
  return String(value);
};

const getAuditChanges = (log) => {
  if (Array.isArray(log?.detail?.changes) && log.detail.changes.length > 0) {
    return log.detail.changes.map((change) => ({
      field: change.field || change.label || "Cambio",
      label: change.label || getAuditFieldLabel(change.field),
      before: change.before,
      after: change.after,
    }));
  }

  const oldValues =
    log?.old_values && typeof log.old_values === "object" ? log.old_values : {};
  const newValues =
    log?.new_values && typeof log.new_values === "object" ? log.new_values : {};
  const oldDisplayFields = oldValues.display?.fields;
  const newDisplayFields = newValues.display?.fields;
  const hasDisplayFields =
    (oldDisplayFields && typeof oldDisplayFields === "object") ||
    (newDisplayFields && typeof newDisplayFields === "object");
  const fields = hasDisplayFields
    ? [
        ...new Set([
          ...Object.keys(oldDisplayFields || {}),
          ...Object.keys(newDisplayFields || {}),
        ]),
      ]
    : [
        ...new Set([...Object.keys(oldValues), ...Object.keys(newValues)]),
      ].filter((field) => field !== "display");

  const getField = (values, displayFields, field) => {
    if (
      displayFields &&
      Object.prototype.hasOwnProperty.call(displayFields, field)
    ) {
      return displayFields[field];
    }
    return { label: getAuditFieldLabel(field), value: values[field] };
  };

  return fields
    .map((field) => {
      const oldField = getField(oldValues, oldDisplayFields, field);
      const newField = getField(newValues, newDisplayFields, field);
      return {
        field,
        label: newField.label || oldField.label || getAuditFieldLabel(field),
        before: oldField.value ?? null,
        after: newField.value ?? null,
        changed:
          JSON.stringify(oldField.value ?? null) !==
          JSON.stringify(newField.value ?? null),
      };
    })
    .filter((change) => change.changed);
};

const getAuditSummary = (log) =>
  log?.description ||
  log?.new_values?.display?.summary ||
  log?.old_values?.display?.summary ||
  log?.detail?.summary ||
  "Sin descripción";

// Tipos de entidades de auditoría admitidos para filtros
const AUDIT_TYPE_SOURCES = [
  "All",
  "User",
  "UserFarm",
  "Farm",
  "FarmRole",
  "FarmRoleAppPermission",
  "Pond",
  "UserFarmPond",
  "TypeProduct",
  "Product",
  "PurchaseDetail",
  "Supplier",
  "Specie",
  "SpecieParameter",
  "SpecieFeedingReference",
  "SpecieProductionReference",
  "Batch",
  "ProductionPlan",
  "Cycle",
  "FeedingSchedule",
  "FeedingPlan",
  "FeedingEvent",
  "DailyStat",
  "ProductUsageLog",
  "ControlStat",
  "FishEvaluated",
  "HealthStat",
  "TreatmentPlan",
  "TreatmentEvent",
  "AmbientalMeasurement",
  "Alert",
  "Sale",
  "InventoryMovement",
  "Harvest",
  "HarvestClassification",
  "Client",
  "Buy",
  "Invitation",
  "BatchTransfer",
  "GradingEvent",
  "SaleDetail",
  "CyclePondBatch",
  "PondBatch",
  "SpeciePondType",
  "ProductionReport",
];

export function FarmWorkers({ id, showBackButton = false, onBack = null }) {
  // Permisos en tiempo real de la granja actual
  const farmPermissions = usePermissions(id);
  const {
    hasFullAccess,
    isOwner: isCurrentFarmOwner,
    isAdmin: isCurrentAdmin,
    canManageUsers,
    canViewAuditLogs,
    canViewAlerts,
  } = farmPermissions;

  // Estado de datos (aislado por id de granja)
  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [apps, setApps] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditCount, setAuditCount] = useState(0);
  const [alerts, setAlerts] = useState([]);

  // Estados de carga independientes
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);

  // Pestaña activa: 'members' | 'roles' | 'invitations' | 'audit' | 'alerts'
  const [activeTab, setActiveTab] = useState("members");

  // Refresco manual
  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = useCallback(() => setRefreshKey((k) => k + 1), []);

  /* -------------------------------------------------------------------------
     MODALES PARA MIEMBROS
     ------------------------------------------------------------------------- */
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [memberRole, setMemberRole] = useState(null);
  const [memberStatus, setMemberStatus] = useState("active");
  const [memberParticularPerms, setMemberParticularPerms] = useState([]);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [personalPermissionModule, setPersonalPermissionModule] = useState("");
  const [personalPermissionOperation, setPersonalPermissionOperation] = useState("view");

  // Confirmación para retirar miembro
  const [deleteMemberTarget, setDeleteMemberTarget] = useState(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  /* -------------------------------------------------------------------------
     MODALES PARA ROLES
     ------------------------------------------------------------------------- */
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [roleAppPermissions, setRoleAppPermissions] = useState({});
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Confirmación para desactivar rol
  const [deleteConfirmRole, setDeleteConfirmRole] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  /* -------------------------------------------------------------------------
     MODALES PARA INVITACIONES
     ------------------------------------------------------------------------- */
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [invitationFilter, setInvitationFilter] = useState("all");

  /* -------------------------------------------------------------------------
     MODALES Y FILTROS PARA AUDITORÍA
     ------------------------------------------------------------------------- */
  const [auditSourceFilter, setAuditSourceFilter] = useState("All");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditDateTo, setAuditDateTo] = useState("");
  const [auditOriginId, setAuditOriginId] = useState("");
  const [auditUserFilter, setAuditUserFilter] = useState("");
  const [auditIpFilter, setAuditIpFilter] = useState("");
  const [appliedAuditFilters, setAppliedAuditFilters] = useState({});
  const [auditPage, setAuditPage] = useState(1);
  const [auditNext, setAuditNext] = useState(null);
  const [auditPrevious, setAuditPrevious] = useState(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [auditDetailOpen, setAuditDetailOpen] = useState(false);

  /* -------------------------------------------------------------------------
     MODALES Y FILTROS PARA ALERTAS
     ------------------------------------------------------------------------- */
  const [alertFilters, setAlertFilters] = useState({
    source_type: "all",
    severity: "all",
    is_resolved: "all",
  });
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertDetailOpen, setAlertDetailOpen] = useState(false);

  /* -------------------------------------------------------------------------
     CARGA INICIAL DE DATOS AL CAMBIAR DE GRANJA (id) O REFRESCAR
     ------------------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;
    if (!id) return;

    async function loadInitialFarmData() {
      try {
        const [membersData, rolesData, appsData] = await Promise.all([
          getFarmMembers(id).catch((err) => {
            console.error("Error cargando miembros de la granja:", err);
            return [];
          }),
          getFarmRoles(id).catch((err) => {
            console.error("Error cargando roles de la granja:", err);
            return [];
          }),
          getFarmApps(id).catch((err) => {
            console.error("Error cargando apps de la granja:", err);
            return [];
          }),
        ]);

        if (!mounted) return;
        setWorkers(Array.isArray(membersData) ? membersData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setApps(Array.isArray(appsData) ? appsData : []);
      } catch (err) {
        if (!mounted) return;
        console.error("Error general cargando datos de granja:", err);
        toast.error("Error al cargar la información de personal de la granja");
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }

    loadInitialFarmData();

    return () => {
      mounted = false;
    };
  }, [id, refreshKey]);

  /* -------------------------------------------------------------------------
     CARGA BAJO DEMANDA SEGÚN LA PESTAÑA SELECCIONADA
     ------------------------------------------------------------------------- */
  useEffect(() => {
    let mounted = true;
    if (!id) return;

    async function loadTabData() {
      if (activeTab === "invitations") {
        try {
          const data = await getFarmInvitations(id);
          if (!mounted) return;
          setInvitations(Array.isArray(data) ? data : []);
        } catch (err) {
          if (!mounted) return;
          console.error("Error cargando invitaciones:", err);
          toast.error("Error al consultar invitaciones de la granja");
        } finally {
          if (mounted) setLoadingTab(false);
        }
      } else if (activeTab === "audit") {
        try {
          const data = await getFarmAuditLogs(id, {
            ...appliedAuditFilters,
            page: auditPage,
          });
          if (!mounted) return;
          setAuditLogs(Array.isArray(data?.results) ? data.results : []);
          setAuditCount(Number(data?.count ?? data?.results?.length ?? 0));
          setAuditNext(data?.next || null);
          setAuditPrevious(data?.previous || null);
        } catch (err) {
          if (!mounted) return;
          console.error("Error cargando auditoría de la granja:", err);
          toast.error(err?.message || "Error al consultar el registro de auditoría");
        } finally {
          if (mounted) setLoadingTab(false);
        }
      } else if (activeTab === "alerts") {
        try {
          const data = await getFarmAlerts(id, alertFilters);
          if (!mounted) return;
          setAlerts(Array.isArray(data) ? data : []);
        } catch (err) {
          if (!mounted) return;
          console.error("Error cargando alertas de la granja:", err);
          toast.error("Error al consultar alertas de la granja");
        } finally {
          if (mounted) setLoadingTab(false);
        }
      }
    }

    loadTabData();

    return () => {
      mounted = false;
    };
  }, [
    id,
    activeTab,
    alertFilters,
    appliedAuditFilters,
    auditPage,
    refreshKey,
  ]);

  // Diccionario de nombres legibles para las aplicaciones dinámicas
  const appNamesMap = useMemo(() => {
    const map = {};
    for (const item of apps) {
      if (item?.app) {
        map[item.app] = item.name || item.app;
      }
    }
    return map;
  }, [apps]);

  // Restricciones de autorización en frontend:
  // - Solo el propietario o admin puede asignar roles y permisos particulares
  const canEditMembersAndRoles = hasFullAccess || isCurrentFarmOwner || isCurrentAdmin;
  // - Usuarios con MANAGE_USERS pueden cambiar estado, retirar miembros y enviar invitaciones
  const canManageStatusAndInvites = canEditMembersAndRoles || canManageUsers;

  // Helper para normalizar el ID de un rol asignado (soporta ID numérico u objeto { id, name })
  const extractRoleId = (farmRole) => {
    if (!farmRole) return null;
    if (typeof farmRole === "object" && farmRole.id !== undefined) {
      return Number(farmRole.id);
    }
    return Number(farmRole) || null;
  };

  /* =========================================================================
     OPERACIONES DE MIEMBROS
     ========================================================================= */

  // Abrir modal de configuración de miembro (rol, permisos particulares, estado)
  const handleOpenEditMember = (member) => {
    if (member.is_owner) {
      toast.info(
        "El propietario de la granja no puede ser modificado mediante esta sección."
      );
      return;
    }
    setEditingMember(member);
    setMemberStatus(member.status || "active");
    setMemberRole(extractRoleId(member.farm_role));
    setMemberParticularPerms(
      Array.isArray(member.personal_permissions)
        ? [...member.personal_permissions]
        : []
    );
    setMemberModalOpen(true);
  };

  // Guardar cambios del miembro con payloads específicos
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!editingMember?.user?.id) return;

    try {
      setIsSavingMember(true);

      const payload = {};

      // Cambio de estado
      if (memberStatus !== editingMember.status) {
        payload.status = memberStatus;
      }

      // Asignación de rol y permisos particulares (restringido a propietario / admin)
      if (canEditMembersAndRoles) {
        const initialRoleId = extractRoleId(editingMember.farm_role);
        if (memberRole !== initialRoleId) {
          payload.farm_role = memberRole;
        }

      }

      // Si no se modificó ningún campo, solo cerramos
      if (Object.keys(payload).length === 0) {
        setMemberModalOpen(false);
        setEditingMember(null);
        return;
      }

      await updateFarmMember(id, editingMember.user.id, payload);
      toast.success("Membresía actualizada correctamente");
      setMemberModalOpen(false);
      setEditingMember(null);

      // Recargar miembros
      const updated = await getFarmMembers(id);
      setWorkers(Array.isArray(updated) ? updated : []);
    } catch (err) {
      console.error("Error actualizando miembro:", err);
      toast.error(err.message || "Error al actualizar miembro");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleAddPersonalPermission = async () => {
    if (
      !editingMember?.user?.id ||
      !personalPermissionModule ||
      !availableOperationsForSelectedModule.includes(personalPermissionOperation)
    ) return;
    try {
      await addMemberPersonalPermission(id, editingMember.user.id, {
        module: personalPermissionModule,
        operation: personalPermissionOperation,
      });
      const updated = await getFarmMembers(id);
      setWorkers(Array.isArray(updated) ? updated : []);
      const refreshed = (Array.isArray(updated) ? updated : []).find(
        (member) => member.user?.id === editingMember.user.id
      );
      if (refreshed) {
        setEditingMember(refreshed);
        setMemberParticularPerms(refreshed.personal_permissions || []);
      }
      toast.success("Permiso personalizado agregado");
    } catch (err) {
      toast.error(err.message || "Error al agregar permiso personalizado");
    }
  };

  const handleRemovePersonalPermission = async (permissionId) => {
    if (!editingMember?.user?.id) return;
    try {
      await removeMemberPersonalPermission(
        id,
        editingMember.user.id,
        permissionId
      );
      const updated = await getFarmMembers(id);
      setWorkers(Array.isArray(updated) ? updated : []);
      const refreshed = (Array.isArray(updated) ? updated : []).find(
        (member) => member.user?.id === editingMember.user.id
      );
      if (refreshed) {
        setEditingMember(refreshed);
        setMemberParticularPerms(refreshed.personal_permissions || []);
      }
      toast.success("Permiso personalizado retirado");
    } catch (err) {
      toast.error(err.message || "Error al retirar permiso personalizado");
    }
  };

  const refreshPersonalPermissions = async () => {
    const updated = await getFarmMembers(id);
    setWorkers(Array.isArray(updated) ? updated : []);
    const refreshed = (Array.isArray(updated) ? updated : []).find(
      (member) => member.user?.id === editingMember?.user?.id
    );
    if (refreshed) {
      setEditingMember(refreshed);
      setMemberParticularPerms(refreshed.personal_permissions || []);
    }
  };

  const handleRemovePersonalPermissionsByModule = async (module) => {
    if (!editingMember?.user?.id) return;
    const permissions = personalPermissionsByModule.get(module) || [];

    try {
      await Promise.all(
        permissions.map((permission) =>
          removeMemberPersonalPermission(
            id,
            editingMember.user.id,
            permission.id
          )
        )
      );
      await refreshPersonalPermissions();
      toast.success("Permisos del módulo retirados");
    } catch (err) {
      toast.error(err.message || "Error al retirar los permisos del módulo");
    }
  };

  const handleRemoveAllPersonalPermissions = async () => {
    if (!editingMember?.user?.id) return;

    try {
      await Promise.all(
        memberParticularPerms.map((permission) =>
          removeMemberPersonalPermission(
            id,
            editingMember.user.id,
            permission.id
          )
        )
      );
      await refreshPersonalPermissions();
      toast.success("Permisos personalizados retirados");
    } catch (err) {
      toast.error(err.message || "Error al retirar los permisos personalizados");
    }
  };

  // Cambiar rápido estado de un miembro (activo / inactivo)
  const handleToggleMemberStatus = async (member) => {
    if (member.is_owner) {
      toast.info("No se puede cambiar el estado del propietario.");
      return;
    }
    const newStatus = member.status === "active" ? "inactive" : "active";
    try {
      await updateFarmMember(id, member.user.id, { status: newStatus });
      toast.success(
        newStatus === "active"
          ? `Membresía activada para ${member.user?.name || "el usuario"}`
          : `Membresía desactivada para ${member.user?.name || "el usuario"}`
      );
      const updated = await getFarmMembers(id);
      setWorkers(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast.error(err.message || "Error al actualizar estado del miembro");
    }
  };

  // Retirar miembro de la granja
  const handleRemoveMember = async () => {
    if (!deleteMemberTarget?.user?.id) return;
    if (deleteMemberTarget.is_owner) {
      toast.error("No está permitido retirar al propietario de la granja.");
      return;
    }

    try {
      setIsDeletingMember(true);
      await removeFarmMember(id, deleteMemberTarget.user.id);
      toast.success("Miembro retirado de la granja");
      setDeleteMemberTarget(null);
      const updated = await getFarmMembers(id);
      setWorkers(Array.isArray(updated) ? updated : []);
    } catch (err) {
      toast.error(err.message || "Error al retirar miembro");
    } finally {
      setIsDeletingMember(false);
    }
  };

  /* =========================================================================
     OPERACIONES DE ROLES (SOLO NAME Y APP_PERMISSIONS)
     ========================================================================= */

  // Abrir modal para crear rol
  const handleOpenCreateRole = () => {
    setEditingRoleId(null);
    setRoleName("");
    const initialPerms = {};
    apps.forEach((a) => {
      initialPerms[a.app] = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });
    setRoleAppPermissions(initialPerms);
    setRoleDialogOpen(true);
  };

  // Abrir modal para editar rol
  const handleOpenEditRole = async (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name || "");

    let fullRole = role;
    try {
      const fetched = await getFarmRole(id, role.id);
      if (fetched) fullRole = fetched;
    } catch (err) {
      console.warn("No se pudo cargar rol específico, usando datos de lista:", err);
    }

    const initialPerms = {};
    apps.forEach((a) => {
      initialPerms[a.app] = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });

    if (Array.isArray(fullRole.app_permissions)) {
      fullRole.app_permissions.forEach((p) => {
        if (p?.app) {
          const isViewOnlyApp =
            p.app === "alerts" || p.app === "audit_logs";

          initialPerms[p.app] = {
            can_view: Boolean(p.can_view),
            can_create: isViewOnlyApp ? false : Boolean(p.can_create),
            can_edit: isViewOnlyApp ? false : Boolean(p.can_edit),
            can_delete: isViewOnlyApp ? false : Boolean(p.can_delete),
          };
        }
      });
    }

    setRoleAppPermissions(initialPerms);
    setRoleDialogOpen(true);
  };

  // Cambiar un permiso individual por app
  const handlePermissionChange = (appKey, action, checked) => {
    const isViewOnlyApp =
      appKey === "alerts" || appKey === "audit_logs";

    // Alerts y audit_logs solo permiten consulta.
    if (isViewOnlyApp && action !== "can_view") {
      return;
    }

    setRoleAppPermissions((prev) => {
      const current = prev[appKey] || {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };

      const updated = { ...current, [action]: checked };

      // Regla: si se activa create, edit o delete, forzar can_view a true
      if (action !== "can_view" && checked) {
        updated.can_view = true;
      }

      // Regla: si se desactiva can_view, apagar create, edit y delete
      if (action === "can_view" && !checked) {
        updated.can_create = false;
        updated.can_edit = false;
        updated.can_delete = false;
      }

      return {
        ...prev,
        [appKey]: updated,
      };
    });
  };

  // Accesos rápidos por app
  const setQuickAccess = (appKey, level) => {
    const isViewOnlyApp =
      appKey === "alerts" || appKey === "audit_logs";

    setRoleAppPermissions((prev) => {
      let updated = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };

      if (level === "all") {
        updated = {
          can_view: true,
          can_create: !isViewOnlyApp,
          can_edit: !isViewOnlyApp,
          can_delete: !isViewOnlyApp,
        };
      } else if (level === "read") {
        updated = {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
      } else if (level === "none") {
        updated = {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
      }

      return {
        ...prev,
        [appKey]: updated,
      };
    });
  };

  // Guardar rol (Crear o Actualizar): el payload se centra exclusivamente en name y app_permissions
  const handleSaveRole = async (e) => {
    e.preventDefault();

    const trimmedName = roleName.trim();
    if (!trimmedName) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }

    // Filtrar solo permisos activos
    const appPermissionsPayload = Object.entries(roleAppPermissions)
      .filter(
        ([_, perms]) =>
          perms.can_view ||
          perms.can_create ||
          perms.can_edit ||
          perms.can_delete
      )
      .map(([appKey, perms]) => {
        const isViewOnlyApp =
          appKey === "alerts" || appKey === "audit_logs";
        return {
          app: appKey,
          can_view: Boolean(
            perms.can_view ||
              perms.can_create ||
              perms.can_edit ||
              perms.can_delete
          ),
          can_create: isViewOnlyApp ? false : Boolean(perms.can_create),
          can_edit: isViewOnlyApp ? false : Boolean(perms.can_edit),
          can_delete: isViewOnlyApp ? false : Boolean(perms.can_delete),
        };
      });

    try {
      setIsSavingRole(true);

      if (editingRoleId) {
        await updateFarmRole(id, editingRoleId, {
          name: trimmedName,
          app_permissions: appPermissionsPayload,
        });
        toast.success("Rol actualizado correctamente");
      } else {
        await createFarmRole(id, {
          name: trimmedName,
          app_permissions: appPermissionsPayload,
        });
        toast.success("Rol creado exitosamente");
      }

      setRoleDialogOpen(false);
      setEditingRoleId(null);
      setRoleName("");

      // Recargar roles y miembros
      reloadData();
    } catch (err) {
      console.error("Error guardando rol:", err);
      toast.error(err.message || "Error al guardar el rol");
    } finally {
      setIsSavingRole(false);
    }
  };

  // Desactivar rol
  const handleDeleteRole = async () => {
    if (!deleteConfirmRole) return;

    try {
      setIsDeletingRole(true);
      await deleteFarmRole(id, deleteConfirmRole.id);
      toast.success(`Rol "${deleteConfirmRole.name}" desactivado`);
      setDeleteConfirmRole(null);
      reloadData();
    } catch (err) {
      console.error("Error desactivando rol:", err);
      toast.error(err.message || "Error al desactivar el rol");
    } finally {
      setIsDeletingRole(false);
    }
  };

  /* =========================================================================
     OPERACIONES DE INVITACIONES
     ========================================================================= */

  const handleSendInvitation = async (e) => {
    e.preventDefault();
    const emailTrimmed = inviteEmail.trim().toLowerCase();

    if (!emailTrimmed || !emailTrimmed.includes("@")) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }

    try {
      setIsSendingInvite(true);
      await sendOperarioInvitation({
        email: emailTrimmed,
        farm_id: Number(id),
      });

      toast.success(`Invitación enviada con éxito a ${emailTrimmed}`);
      setInviteEmail("");
      setInviteModalOpen(false);

      // Recargar invitaciones de la granja
      const data = await getFarmInvitations(id);
      setInvitations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error enviando invitación:", err);
      toast.error(err.message || "Error al enviar la invitación");
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Filtrado de invitaciones
  const filteredInvitations = useMemo(() => {
    if (invitationFilter === "all") return invitations;
    return invitations.filter((inv) => inv.status === invitationFilter);
  }, [invitations, invitationFilter]);

  /* =========================================================================
     OPERACIONES Y FILTRADO DE AUDITORÍA
     ========================================================================= */

  const handleOpenAuditDetail = async (logItem) => {
    setSelectedAuditLog(logItem);
    setAuditDetailOpen(true);

    try {
      const fullLog = await getFarmAuditLog(id, logItem.id);
      if (fullLog) {
        setSelectedAuditLog(fullLog);
      }
    } catch (err) {
      console.warn("No se pudo cargar detalle extendido de auditoría:", err);
    }
  };

  const handleApplyAuditFilters = () => {
    if (auditDateFrom && auditDateTo && auditDateFrom > auditDateTo) {
      toast.error("La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }

    const origin = auditSourceFilter === "All" ? "" : auditSourceFilter;
    setAppliedAuditFilters({
      date_from: auditDateFrom,
      date_to: auditDateTo,
      origin,
      origin_id: auditOriginId,
      user: auditUserFilter,
      ip: auditIpFilter,
    });
    setAuditPage(1);
  };

  const handleClearAuditFilters = () => {
    setAuditDateFrom("");
    setAuditDateTo("");
    setAuditSourceFilter("All");
    setAuditOriginId("");
    setAuditUserFilter("");
    setAuditIpFilter("");
    setAppliedAuditFilters({});
    setAuditPage(1);
  };

  /* =========================================================================
     OPERACIONES Y FILTRADO DE ALERTAS
     ========================================================================= */

  const handleOpenAlertDetail = async (alertItem) => {
    setSelectedAlert(alertItem);
    setAlertDetailOpen(true);

    try {
      const fullAlert = await getFarmAlert(id, alertItem.id);
      if (fullAlert) {
        setSelectedAlert(fullAlert);
      }
    } catch (err) {
      console.warn("No se pudo cargar detalle extendido de alerta:", err);
    }
  };

  // Contar aplicaciones autorizadas para el rol
  const activeAppsCount = useMemo(() => {
    return Object.values(roleAppPermissions).filter(
      (p) => p.can_view || p.can_create || p.can_edit || p.can_delete
    ).length;
  }, [roleAppPermissions]);

  const selectedMemberRole = useMemo(
    () => roles.find((role) => role.id === memberRole),
    [roles, memberRole]
  );

  const roleGrantedOperations = useMemo(() => {
    const grants = new Map();
    (selectedMemberRole?.app_permissions || []).forEach((permission) => {
      const moduleOperations = new Set(grants.get(permission.app || permission.module) || []);
      if (permission.can_view) moduleOperations.add("view");
      if (permission.can_create) moduleOperations.add("create");
      if (permission.can_update || permission.can_edit) moduleOperations.add("update");
      if (permission.can_delete) moduleOperations.add("delete");
      grants.set(permission.app || permission.module, moduleOperations);
    });
    return grants;
  }, [selectedMemberRole]);

  const personalPermissionsByModule = useMemo(() => {
    const grouped = new Map();
    memberParticularPerms.forEach((permission) => {
      const permissions = grouped.get(permission.module) || [];
      permissions.push(permission);
      grouped.set(permission.module, permissions);
    });
    return grouped;
  }, [memberParticularPerms]);

  const availablePersonalModules = useMemo(() => {
    return apps.filter((app) => {
      const roleOperations = roleGrantedOperations.get(app.module) || new Set();
      const personalizedOperations = new Set(
        (personalPermissionsByModule.get(app.module) || []).map(
          (permission) => permission.operation === "update" ? "update" : permission.operation
        )
      );
      const operations =
        app.module === "alerts" || app.module === "audit_logs"
          ? ["view"]
          : PERSONAL_PERMISSION_OPERATIONS;

      return operations.some(
        (operation) =>
          !roleOperations.has(operation) &&
          !personalizedOperations.has(operation)
      );
    });
  }, [apps, roleGrantedOperations, personalPermissionsByModule]);

  const availableOperationsForSelectedModule = useMemo(() => {
    if (!personalPermissionModule) return [];
    const roleOperations = roleGrantedOperations.get(personalPermissionModule) || new Set();
    const personalizedOperations = new Set(
      (personalPermissionsByModule.get(personalPermissionModule) || []).map(
        (permission) => permission.operation
      )
    );
    const operations =
      personalPermissionModule === "alerts" || personalPermissionModule === "audit_logs"
        ? ["view"]
        : PERSONAL_PERMISSION_OPERATIONS;

    return operations.filter(
      (operation) =>
        !roleOperations.has(operation) &&
        !personalizedOperations.has(operation)
    );
  }, [
    personalPermissionModule,
    roleGrantedOperations,
    personalPermissionsByModule,
  ]);

  /* =========================================================================
     RENDER
     ========================================================================= */
  return (
    <div className="space-y-6">
      {/* BOTÓN VOLVER */}
      {showBackButton && (
        <button
          onClick={() => {
            if (onBack) onBack();
            else window.history.back();
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a la vista de la granja
        </button>
      )}

      {/* ENCABEZADO DE SECCIÓN */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              Personal y Permisos
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Granja #{id}
            </span>
            {isCurrentFarmOwner && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Crown className="w-3 h-3 text-amber-600" />
                Propietario
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Administra miembros, roles locales con permisos por módulo, invitaciones, auditoría y alertas exclusivas de esta granja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={reloadData}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            title="Refrescar datos de la granja"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>

          {canManageStatusAndInvites && (
            <Button
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-xs font-medium shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              Invitar Operario
            </Button>
          )}

          {canEditMembersAndRoles && (
            <Button
              size="sm"
              onClick={handleOpenCreateRole}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 text-xs font-medium shadow-xs"
            >
              <NotebookPen className="w-3.5 h-3.5" />
              Crear Rol
            </Button>
          )}
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex overflow-x-auto border-b border-slate-200 gap-2 sm:gap-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab("members")}
          className={`pb-3 px-1 transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === "members"
              ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Miembros ({workers.length})
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 px-1 transition-all relative flex items-center gap-2 whitespace-nowrap ${
            activeTab === "roles"
              ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles de la Granja ({roles.length})
        </button>

        {canManageStatusAndInvites && (
          <button
            onClick={() => setActiveTab("invitations")}
            className={`pb-3 px-1 transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "invitations"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Mail className="w-4 h-4" />
            Invitaciones
          </button>
        )}

        {canViewAuditLogs && (
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 px-1 transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "audit"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="w-4 h-4" />
            Auditoría
          </button>
        )}

        {canViewAlerts && (
          <button
            onClick={() => setActiveTab("alerts")}
            className={`pb-3 px-1 transition-all relative flex items-center gap-2 whitespace-nowrap ${
              activeTab === "alerts"
                ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BellRing className="w-4 h-4" />
            Alertas
          </button>
        )}
      </div>

      {/* =====================================================================
          TAB 1: MIEMBROS DE LA GRANJA
          ===================================================================== */}
      {activeTab === "members" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loadingInitial ? (
            <div className="p-12 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando personal de la granja...</p>
            </div>
          ) : workers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No hay miembros registrados en esta granja
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Invita operarios para asociarlos exclusivamente a esta granja.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4">Usuario</th>
                    <th className="py-3.5 px-4">Correo</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Rol Asignado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workers.map((w) => {
                    const memberRoleId = extractRoleId(w.farm_role);
                    const assignedRole = roles.find((r) => r.id === memberRoleId);
                    const isOwner = Boolean(w.is_owner);
                    const isActive = w.status === "active";
                    return (
                      <tr
                        key={w.user?.id || w.id}
                        className={`transition-colors ${
                          isOwner
                            ? "bg-amber-50/25 hover:bg-amber-50/40"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        {/* USUARIO */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full text-white font-semibold text-xs flex items-center justify-center shadow-xs shrink-0 ${
                                isOwner
                                  ? "bg-gradient-to-tr from-amber-500 to-amber-600 ring-2 ring-amber-200"
                                  : "bg-gradient-to-tr from-blue-600 to-indigo-500"
                              }`}
                            >
                              {(w.user?.name?.[0] || "U").toUpperCase()}
                              {(w.user?.lastname?.[0] || "").toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-slate-900">
                                  {w.user?.name} {w.user?.lastname}
                                </p>
                                {isOwner && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full border border-amber-300">
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    Dueño
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">
                                ID #{w.user?.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* CORREO */}
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                          {w.user?.email || "—"}
                        </td>

                        {/* ESTADO */}
                        <td className="py-3.5 px-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Activo
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Activo
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-3 h-3 text-slate-400" />
                                  Inactivo
                                </>
                              )}
                            </span>
                          )}
                        </td>

                        {/* ROL ASIGNADO */}
                        <td className="py-3.5 px-4">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                              Propietario
                            </span>
                          ) : assignedRole ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              {assignedRole.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Sin rol
                            </span>
                          )}
                        </td>

                        {/* ACCIONES */}
                        <td className="py-3.5 px-4 text-right">
                          {isOwner ? (
                            <span className="text-xs text-slate-400 italic">
                              No modificable
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón de configuración / edición de rol y membresía */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:border-blue-400"
                                onClick={() => handleOpenEditMember(w)}
                              >
                                <Edit2 className="w-3 h-3 mr-1" />
                                {canEditMembersAndRoles ? "Editar" : "Ver / Estado"}
                              </Button>

                              {/* Toggle rápido de estado */}
                              {canManageStatusAndInvites && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`h-8 px-2 text-xs font-medium ${
                                    isActive
                                      ? "text-amber-600 hover:bg-amber-50"
                                      : "text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                  onClick={() => handleToggleMemberStatus(w)}
                                  title={
                                    isActive
                                      ? "Desactivar miembro"
                                      : "Activar miembro"
                                  }
                                >
                                  {isActive ? (
                                    <UserX className="w-3.5 h-3.5" />
                                  ) : (
                                    <UserCheck className="w-3.5 h-3.5" />
                                  )}
                                </Button>
                              )}

                              {/* Retirar miembro */}
                              {canManageStatusAndInvites && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => setDeleteMemberTarget(w)}
                                  title="Retirar miembro de la granja"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {!loadingTab && (auditPrevious || auditNext) && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">
                Página {auditPage}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!auditPrevious}
                  onClick={() => {
                    const page = new URL(auditPrevious, window.location.origin).searchParams.get("page");
                    setAuditPage(page ? Number(page) : Math.max(1, auditPage - 1));
                  }}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!auditNext}
                  onClick={() => {
                    const page = new URL(auditNext, window.location.origin).searchParams.get("page");
                    setAuditPage(page ? Number(page) : auditPage + 1);
                  }}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: ROLES DE LA GRANJA (CONFIGURADOS CON APP_PERMISSIONS)
          ===================================================================== */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {loadingInitial ? (
            <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando roles de la granja...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-600">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No hay roles configurados en esta granja
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Los roles definen perfiles de trabajo locales autorizando acciones específicas por módulo del sistema.
              </p>
              {canEditMembersAndRoles && (
                <Button
                  onClick={handleOpenCreateRole}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Crear primer rol
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => {
                const appPerms = role.app_permissions || [];
                const membersWithRole = workers.filter(
                  (w) => extractRoleId(w.farm_role) === role.id
                );

                return (
                  <div
                    key={role.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* ENCABEZADO DE TARJETA DE ROL */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">
                              {role.name}
                            </h3>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                              {membersWithRole.length}{" "}
                              {membersWithRole.length === 1
                                ? "operario"
                                : "operarios"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            ID #{role.id}
                          </p>
                        </div>

                        {canEditMembersAndRoles && (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => handleOpenEditRole(role)}
                              title="Editar rol y permisos"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteConfirmRole(role)}
                              title="Desactivar rol"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* PERMISOS POR APLICACIÓN (APP_PERMISSIONS) */}
                      <div className="mt-4 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Permisos por módulo
                        </p>

                        {appPerms.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Sin permisos por módulo configurados.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {appPerms.map((perm) => {
                              const appLabel = getModuleLabel(
                                perm.app,
                                appNamesMap[perm.app]
                              );
                              const isViewOnlyApp =
                                perm.app === "alerts" ||
                                perm.app === "audit_logs";

                              const hasAnyAction =
                                perm.can_view ||
                                perm.can_create ||
                                perm.can_edit ||
                                perm.can_delete;

                              if (!hasAnyAction) return null;

                              return (
                                <div
                                  key={perm.app}
                                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-800">
                                      {appLabel}
                                    </span>
                                    {isViewOnlyApp && (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                        Solo Consulta
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {perm.can_view && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                        Ver
                                      </span>
                                    )}
                                    {perm.can_create && !isViewOnlyApp && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        Crear
                                      </span>
                                    )}
                                    {perm.can_edit && !isViewOnlyApp && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                        Editar
                                      </span>
                                    )}
                                    {perm.can_delete && !isViewOnlyApp && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                                        Eliminar
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {appPerms.filter((p) => p.can_view).length} módulos con acceso
                      </span>
                      {canEditMembersAndRoles && (
                        <button
                          onClick={() => handleOpenEditRole(role)}
                          className="text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
                        >
                          Configurar permisos &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: INVITACIONES DE OPERARIOS
          ===================================================================== */}
      {activeTab === "invitations" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Invitaciones de Operarios
              </h3>
              <p className="text-xs text-slate-500">
                Consulta el estado de las invitaciones enviadas para incorporarse a esta granja.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={invitationFilter}
                onValueChange={setInvitationFilter}
              >
                <SelectTrigger className="w-40 h-9 text-xs">
                  <SelectValue placeholder="Filtrar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="accepted">Aceptadas</SelectItem>
                  <SelectItem value="rejected">Rechazadas</SelectItem>
                  <SelectItem value="expired">Expiradas</SelectItem>
                </SelectContent>
              </Select>

              {canManageStatusAndInvites && (
                <Button
                  size="sm"
                  onClick={() => setInviteModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                >
                  <Mail className="w-3.5 h-3.5 mr-1" />
                  Nueva Invitación
                </Button>
              )}
            </div>
          </div>

          {loadingTab ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando invitaciones...</p>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No hay invitaciones registradas con el filtro seleccionado
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Usa el botón &quot;Nueva Invitación&quot; para enviar un enlace de incorporación a un operario.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Invitado por</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">ID de Invitación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvitations.map((inv) => {
                    const statusConfig = {
                      pending: {
                        label: "Pendiente",
                        bg: "bg-amber-50 text-amber-700 border-amber-200",
                        icon: Clock,
                      },
                      accepted: {
                        label: "Aceptada",
                        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                        icon: CheckCircle2,
                      },
                      rejected: {
                        label: "Rechazada",
                        bg: "bg-red-50 text-red-700 border-red-200",
                        icon: XCircle,
                      },
                      expired: {
                        label: "Expirada",
                        bg: "bg-slate-100 text-slate-600 border-slate-200",
                        icon: AlertCircle,
                      },
                    }[inv.status] || {
                      label: inv.status,
                      bg: "bg-slate-100 text-slate-700 border-slate-200",
                      icon: Info,
                    };

                    const StatusIcon = statusConfig.icon;

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-mono text-xs font-medium text-slate-900">
                          {inv.email}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.bg}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {inv.invited_by_name ||
                            (inv.invited_by ? `Usuario #${inv.invited_by}` : "—")}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {inv.created_at
                            ? new Date(inv.created_at).toLocaleString("es-CO", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-400">
                          #{inv.id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: AUDITORÍA POR GRANJA (EXCLUSIVO DE CONSULTA)
          ===================================================================== */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Registro de Auditoría de la Granja
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Solo Lectura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Historial cronológico de cambios realizados sobre los recursos pertenecientes a la granja #{id}.
              </p>
            </div>

            {auditCount > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {auditCount} registro{auditCount === 1 ? "" : "s"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Desde</label>
              <Input type="date" value={auditDateFrom} onChange={(e) => setAuditDateFrom(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Hasta</label>
              <Input type="date" value={auditDateTo} onChange={(e) => setAuditDateTo(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Origen</label>
              <Select value={auditSourceFilter} onValueChange={setAuditSourceFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {AUDIT_TYPE_SOURCES.map((src) => (
                    <SelectItem key={src} value={src}>{getAuditTypeLabel(src)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">ID del origen</label>
              <Input type="number" min="1" value={auditOriginId} onChange={(e) => setAuditOriginId(e.target.value)} placeholder="Ej. 12" className="h-9 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Usuario</label>
              <Input value={auditUserFilter} onChange={(e) => setAuditUserFilter(e.target.value)} placeholder="ID, nombre o correo" className="h-9 text-xs" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Dirección IP</label>
              <Input value={auditIpFilter} onChange={(e) => setAuditIpFilter(e.target.value)} placeholder="192.0.2.10" className="h-9 text-xs" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleClearAuditFilters}>
                Limpiar filtros
              </Button>
              <Button type="button" size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleApplyAuditFilters}>
                Aplicar filtros
              </Button>
            </div>
          </div>

          {loadingTab ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando registros de auditoría...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
              <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No se encontraron registros de auditoría para esta granja
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Los cambios sobre estanques, ciclos, roles e inventario de esta granja aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <article
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-slate-50/50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                          {getAuditTypeLabel(log.type_source)}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Registro #{log.id}
                        </span>
                        {log.source_id != null && (
                          <span className="font-mono text-[11px] text-slate-500">
                            Origen #{log.source_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-relaxed text-slate-800">
                        {getAuditSummary(log)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                          {log.user_name ||
                            (log.user ? `Usuario #${log.user}` : "Sistema / Automático")}
                        </span>
                        <span>
                          {log.created_at
                            ? new Date(log.created_at).toLocaleString("es-CO", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "Fecha no disponible"}
                        </span>
                        {log.ip && (
                          <span className="font-mono text-slate-400">
                            IP {log.ip}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAuditDetail(log)}
                      className="shrink-0 text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Ver cambios
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: ALERTAS DE LA GRANJA (EXCLUSIVO DE CONSULTA)
          ===================================================================== */}
      {activeTab === "alerts" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Alertas Registradas en la Granja
                </h3>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  Solo Lectura
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Monitorea las alertas operativas generadas exclusivamente en esta granja.
              </p>
            </div>

            {/* Filtros de Alertas: source_type, severity, is_resolved */}
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={alertFilters.source_type}
                onValueChange={(val) =>
                  setAlertFilters((prev) => ({ ...prev, source_type: val }))
                }
              >
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Fuente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las fuentes</SelectItem>
                  <SelectItem value="Health">Salud</SelectItem>
                  <SelectItem value="Stock">Stock</SelectItem>
                  <SelectItem value="Ambiental">Ambiental</SelectItem>
                  <SelectItem value="Control">Control</SelectItem>
                  <SelectItem value="Feeding">Alimentación</SelectItem>
                  <SelectItem value="Sale">Ventas</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={alertFilters.severity}
                onValueChange={(val) =>
                  setAlertFilters((prev) => ({ ...prev, severity: val }))
                }
              >
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={alertFilters.is_resolved}
                onValueChange={(val) =>
                  setAlertFilters((prev) => ({ ...prev, is_resolved: val }))
                }
              >
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue placeholder="Resolución" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="false">Activas (No resueltas)</SelectItem>
                  <SelectItem value="true">Resueltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingTab ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando alertas de la granja...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 rounded-xl">
              <BellRing className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No hay alertas que coincidan con los filtros seleccionados
              </p>
              <p className="text-xs text-slate-400 mt-1">
                El sistema no reporta incidencias críticas o advertencias en este momento.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3">Severidad</th>
                    <th className="py-3 px-3">Fuente</th>
                    <th className="py-3 px-3">Mensaje</th>
                    <th className="py-3 px-3">Valor / Umbral</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3 text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((al) => {
                    const severityConfig = {
                      critical: "bg-red-100 text-red-800 border-red-300",
                      high: "bg-orange-100 text-orange-800 border-orange-300",
                      medium: "bg-amber-100 text-amber-800 border-amber-300",
                      low: "bg-blue-100 text-blue-800 border-blue-300",
                    }[al.severity] || "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <tr key={al.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${severityConfig}`}
                          >
                            {al.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-xs text-slate-700">
                          {al.source_type}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-800 max-w-sm">
                          <p className="font-medium">{al.description || al.message}</p>
                          {al.message && al.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {al.message}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs font-mono text-slate-600">
                          {al.value !== null && al.value !== undefined ? (
                            <span>
                              {al.value}
                              {al.threshold !== null && al.threshold !== undefined && (
                                <span className="text-slate-400"> / lim: {al.threshold}</span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {al.is_resolved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Resuelta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600" />
                              Activa
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-500 whitespace-nowrap">
                          {al.created_at
                            ? new Date(al.created_at).toLocaleString("es-CO", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAlertDetail(al)}
                            className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL: EDITAR / CONFIGURAR MIEMBRO (ROL, PERMISOS PARTICULARES, ESTADO)
          ===================================================================== */}
      <Dialog open={memberModalOpen} onOpenChange={setMemberModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Administrar Membresía del Usuario</DialogTitle>
            <p className="text-xs text-slate-500">
              Ajusta el rol asignado, los permisos particulares y el estado del usuario en la granja #{id}.
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mt-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                {(editingMember?.user?.name?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {editingMember?.user?.name} {editingMember?.user?.lastname}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {editingMember?.user?.email}
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveMember} className="space-y-5 mt-3">
            {/* 1. ROL ASIGNADO EN LA GRANJA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Rol Asignado en la Granja
                </label>
                {!canEditMembersAndRoles && (
                  <span className="text-[10px] text-amber-700 font-medium">
                    (Solo el propietario puede modificar roles)
                  </span>
                )}
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {/* OPCIÓN: SIN ROL */}
                <button
                  type="button"
                  disabled={!canEditMembersAndRoles || isSavingMember}
                  onClick={() => setMemberRole(null)}
                  className={`w-full rounded-xl border p-2.5 text-left text-xs transition flex items-center justify-between ${
                    memberRole === null
                      ? "border-slate-400 bg-slate-100 font-semibold"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span>Sin rol asignado (retirar permisos de rol)</span>
                  {memberRole === null && <Check className="w-3.5 h-3.5 text-slate-700" />}
                </button>

                {/* ROLES DISPONIBLES */}
                {roles.map((r) => {
                  const isSelected = memberRole === r.id;
                  const activeCount = (r.app_permissions || []).filter(
                    (p) => p.can_view
                  ).length;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      disabled={!canEditMembersAndRoles || isSavingMember}
                      onClick={() => setMemberRole(r.id)}
                      className={`w-full rounded-xl border p-2.5 text-left text-xs transition flex items-center justify-between ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 font-semibold text-blue-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">{r.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {activeCount} módulos con acceso autorizados
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PERMISOS PARTICULARES DE LA MEMBRESÍA */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Permisos personalizados
                  </h4>
                  {canEditMembersAndRoles && memberParticularPerms.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 border-red-200 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleRemoveAllPersonalPermissions}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Eliminar todos
                    </Button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Permisos adicionales que se suman a los otorgados por el rol.
                </p>
              </div>

              {memberParticularPerms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-xs text-slate-400">
                  Este miembro no tiene permisos personalizados.
                </div>
              ) : (
                <div className="grid gap-3">
                  {[...personalPermissionsByModule.entries()].map(([module, permissions]) => {
                    return (
                      <div
                        key={module}
                        className="rounded-xl border border-blue-100 bg-white p-3 shadow-sm"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">
                            {getModuleLabel(
                              module,
                              apps.find((app) => app.module === module)?.name
                            )}
                          </p>
                          {canEditMembersAndRoles && (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => handleRemovePersonalPermissionsByModule(module)}
                              aria-label={`Eliminar todos los permisos del módulo ${module}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar módulo
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {permissions.map((permission) => (
                            <span
                              key={permission.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase text-blue-700"
                            >
                              {getActionLabel(permission.operation)}
                              {canEditMembersAndRoles && (
                                <button
                                  type="button"
                                  className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-500 hover:bg-blue-100 hover:text-red-600"
                                  onClick={() => handleRemovePersonalPermission(permission.id)}
                                  aria-label={`Eliminar permiso ${permission.module}.${permission.operation}`}
                                >
                                  <span aria-hidden="true">×</span>
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {canEditMembersAndRoles && (
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Módulo</label>
                    <Select
                      value={personalPermissionModule}
                      onValueChange={(module) => {
                        setPersonalPermissionModule(module);
                        if (module === "alerts" || module === "audit_logs") {
                          setPersonalPermissionOperation("view");
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availablePersonalModules.map((app) => (
                          <SelectItem key={app.module} value={app.module}>
                            {getModuleLabel(app.module, app.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Acción</label>
                    <Select value={personalPermissionOperation} onValueChange={setPersonalPermissionOperation}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableOperationsForSelectedModule
                          .map((operation) => (
                            <SelectItem key={operation} value={operation}>
                              {getActionLabel(operation)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" className="self-end" onClick={handleAddPersonalPermission} disabled={!personalPermissionModule}>
                    Agregar permiso
                  </Button>
                </div>
              )}
            </div>

            {/* 3. ESTADO DE LA MEMBRESÍA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Estado de la Membresía
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMemberStatus("active")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    memberStatus === "active"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => setMemberStatus("inactive")}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    memberStatus === "inactive"
                      ? "border-red-500 bg-red-50 text-red-800 shadow-xs"
                      : "border-slate-200 hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  Inactivo
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Al marcar como inactivo, las autorizaciones del usuario en esta granja quedan suspendidas.
              </p>
            </div>

            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMemberModalOpen(false)}
                disabled={isSavingMember}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingMember}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingMember ? "Guardando..." : "Guardar Membresía"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: CREAR / EDITAR ROL (EXCLUSIVO NAME Y APP_PERMISSIONS)
          ===================================================================== */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingRoleId ? "Editar Rol de Granja" : "Crear Nuevo Rol de Granja"}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Configura el perfil de trabajo y define con precisión los permisos autorizados por cada módulo del sistema.
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveRole} className="space-y-5 mt-2">
            {/* NOMBRE DEL ROL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Nombre del Rol <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej. Encargado Sanitario y Calidad"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            {/* SECCIÓN DE PERMISOS POR APLICACIÓN */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Permisos por módulo
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Habilitar Crear, Editar o Eliminar activará automáticamente la consulta.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {activeAppsCount} de {apps.length} apps autorizadas
                </span>
              </div>

              {apps.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-slate-400">
                  <p className="text-xs">No se encontraron aplicaciones dinámicas.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {apps.map((item) => {
                    const appKey = item.app;
                    const appLabel = getModuleLabel(appKey, item.name);
                    const isViewOnlyApp =
                      appKey === "alerts" || appKey === "audit_logs";

                    const perms = roleAppPermissions[appKey] || {
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    const hasAnyAction =
                      perms.can_view ||
                      perms.can_create ||
                      perms.can_edit ||
                      perms.can_delete;

                    return (
                      <div
                        key={appKey}
                        className={`rounded-xl border p-3 transition-all ${
                          hasAnyAction
                            ? "border-blue-300 bg-blue-50/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">
                              {appLabel}
                            </span>
                            {isViewOnlyApp && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                Permiso independiente (Solo Consulta)
                              </span>
                            )}
                          </div>

                          {/* ACCESOS RÁPIDOS */}
                          <div className="flex items-center gap-1 text-xs">
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "all")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 text-[10px] font-medium"
                            >
                              Acceso total
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "read")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium"
                            >
                              Solo lectura
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "none")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 text-[10px]"
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>

                        {/* CASILLAS DE VERIFICACIÓN */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
                          {/* CAN_VIEW */}
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={perms.can_view}
                              onChange={(e) =>
                                handlePermissionChange(
                                  appKey,
                                  "can_view",
                                  e.target.checked
                                )
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span
                              className={`font-medium ${
                                perms.can_view
                                  ? "text-emerald-700 font-bold"
                                  : "text-slate-600"
                              }`}
                            >
                              Ver
                            </span>
                          </label>

                          {/* CAN_CREATE (deshabilitado para view-only apps) */}
                          <label
                            className={`flex items-center gap-2 select-none ${
                              isViewOnlyApp
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isViewOnlyApp}
                              checked={isViewOnlyApp ? false : perms.can_create}
                              onChange={(e) =>
                                handlePermissionChange(
                                  appKey,
                                  "can_create",
                                  e.target.checked
                                )
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span
                              className={`font-medium ${
                                perms.can_create
                                  ? "text-blue-700 font-bold"
                                  : "text-slate-600"
                              }`}
                            >
                              Crear
                            </span>
                          </label>

                          {/* CAN_EDIT (deshabilitado para view-only apps) */}
                          <label
                            className={`flex items-center gap-2 select-none ${
                              isViewOnlyApp
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isViewOnlyApp}
                              checked={isViewOnlyApp ? false : perms.can_edit}
                              onChange={(e) =>
                                handlePermissionChange(
                                  appKey,
                                  "can_edit",
                                  e.target.checked
                                )
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span
                              className={`font-medium ${
                                perms.can_edit
                                  ? "text-amber-700 font-bold"
                                  : "text-slate-600"
                              }`}
                            >
                              Editar
                            </span>
                          </label>

                          {/* CAN_DELETE (deshabilitado para view-only apps) */}
                          <label
                            className={`flex items-center gap-2 select-none ${
                              isViewOnlyApp
                                ? "opacity-30 cursor-not-allowed"
                                : "cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isViewOnlyApp}
                              checked={isViewOnlyApp ? false : perms.can_delete}
                              onChange={(e) =>
                                handlePermissionChange(
                                  appKey,
                                  "can_delete",
                                  e.target.checked
                                )
                              }
                              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                            />
                            <span
                              className={`font-medium ${
                                perms.can_delete
                                  ? "text-red-700 font-bold"
                                  : "text-slate-600"
                              }`}
                            >
                              Eliminar
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleDialogOpen(false)}
                disabled={isSavingRole}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingRole}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isSavingRole
                  ? "Guardando..."
                  : editingRoleId
                  ? "Guardar Cambios del Rol"
                  : "Crear Rol"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: ENVIAR INVITACIÓN
          ===================================================================== */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar Operario a la Granja</DialogTitle>
            <p className="text-xs text-slate-500">
              El usuario recibirá una invitación para unirse exclusivamente a la granja #{id}.
            </p>
          </DialogHeader>

          <form onSubmit={handleSendInvitation} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Correo Electrónico del Operario <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="operario@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
              <span>
                Si la cuenta ya existe en SIG-PISCICOLA, el operario simplemente aceptará la invitación. Si es nueva, completará su registro inicial.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteModalOpen(false)}
                disabled={isSendingInvite}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSendingInvite}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {isSendingInvite ? "Enviando..." : "Enviar Invitación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: DETALLE DE AUDITORÍA (CON COMPARACIÓN DE VALORES DIFF)
          ===================================================================== */}
      <Dialog open={auditDetailOpen} onOpenChange={setAuditDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Detalle del Registro de Auditoría #{selectedAuditLog?.id}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Granja #{id} | Origen: {getAuditTypeLabel(selectedAuditLog?.type_source)}
              {selectedAuditLog?.source_id ? ` #${selectedAuditLog.source_id}` : ""}
            </p>
          </DialogHeader>

          {selectedAuditLog && (
            <div className="space-y-4 mt-2 text-xs">
              {/* METADATOS BÁSICOS */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Fecha y Hora
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedAuditLog.created_at
                      ? new Date(selectedAuditLog.created_at).toLocaleString("es-CO")
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Usuario Responsable
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedAuditLog.user_name ||
                      (selectedAuditLog.user ? `Usuario #${selectedAuditLog.user}` : "Sistema / Automático")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Dirección IP
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5 font-mono">
                    {selectedAuditLog.ip || "No registrada"}
                  </p>
                </div>
              </div>

              {/* DESCRIPCIÓN */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">
                  ¿Qué ocurrió?
                </span>
                <p className="mt-1 font-medium leading-relaxed text-slate-800">
                  {getAuditSummary(selectedAuditLog)}
                </p>
              </div>

              {/* COMPARACIÓN DE VALORES */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Detalle de los cambios
                </span>
                {selectedAuditLog.old_values === null && selectedAuditLog.new_values ? (
                  <p className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                    Registro creado
                  </p>
                ) : selectedAuditLog.new_values === null && selectedAuditLog.old_values ? (
                  <p className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
                    Registro eliminado
                  </p>
                ) : null}

                {getAuditChanges(selectedAuditLog).length > 0 ? (
                  <div className="divide-y rounded-xl border border-slate-200 overflow-hidden">
                    {getAuditChanges(selectedAuditLog).map((change, index) => (
                      <div
                        key={`${change.field}-${index}`}
                        className="grid grid-cols-1 gap-2 bg-white px-3 py-3 sm:grid-cols-[minmax(7rem,0.8fr)_1fr_1fr] sm:gap-3"
                      >
                        <span className="font-semibold text-slate-800">
                          {change.label}
                        </span>
                        <div className="min-w-0 rounded-lg bg-red-50/70 px-2.5 py-2">
                          <span className="block text-[9px] font-bold uppercase text-red-500">
                            Antes
                          </span>
                          <span className="break-words text-slate-700">
                            {formatAuditValue(change.before)}
                          </span>
                        </div>
                        <div className="min-w-0 rounded-lg bg-emerald-50/70 px-2.5 py-2">
                          <span className="block text-[9px] font-bold uppercase text-emerald-600">
                            Después
                          </span>
                          <span className="break-words font-medium text-slate-800">
                            {formatAuditValue(change.after)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs italic text-slate-400">
                    Este registro no incluye cambios de campos para comparar.
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAuditDetailOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: DETALLE DE ALERTA (SOLO LECTURA)
          ===================================================================== */}
      <Dialog open={alertDetailOpen} onOpenChange={setAlertDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Detalle de la Alerta #{selectedAlert?.id}
            </DialogTitle>
            <p className="text-xs text-slate-500 font-mono">
              Granja #{id} | Fuente: {selectedAlert?.source_type}
            </p>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-3 mt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Severidad
                  </span>
                  <p className="font-bold uppercase text-slate-800 mt-0.5">
                    {selectedAlert.severity}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Estado
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedAlert.is_resolved ? "Resuelta" : "Activa (No resuelta)"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Estanque / Ciclo
                  </span>
                  <p className="font-mono text-slate-800 mt-0.5">
                    {selectedAlert.pond ? `Estanque #${selectedAlert.pond}` : "Sin estanque"} /{" "}
                    {selectedAlert.cycle ? `Ciclo #${selectedAlert.cycle}` : "Sin ciclo"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Fecha de Creación
                  </span>
                  <p className="text-slate-800 mt-0.5">
                    {selectedAlert.created_at
                      ? new Date(selectedAlert.created_at).toLocaleString("es-CO")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Descripción y Mensaje
                </span>
                <p className="font-bold text-slate-900 mt-1">
                  {selectedAlert.description}
                </p>
                {selectedAlert.message && (
                  <p className="text-slate-600 mt-1">{selectedAlert.message}</p>
                )}
              </div>

              {selectedAlert.is_resolved && (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/30 text-emerald-900">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">
                    Datos de Resolución
                  </span>
                  <p className="mt-0.5">
                    Resuelta el:{" "}
                    {selectedAlert.resolved_at
                      ? new Date(selectedAlert.resolved_at).toLocaleString("es-CO")
                      : "—"}
                  </p>
                  <p className="mt-0.5">
                    Por: {selectedAlert.resolved_by_nam || `Usuario #${selectedAlert.resolved_by || "—"}`}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAlertDetailOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: CONFIRMAR DESACTIVACIÓN DE ROL
          ===================================================================== */}
      <Dialog
        open={Boolean(deleteConfirmRole)}
        onOpenChange={(open) => !open && setDeleteConfirmRole(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <AlertCircle className="w-5 h-5" />
            </div>
            <DialogTitle>Desactivar Rol de Granja</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              ¿Estás seguro de que deseas desactivar el rol{" "}
              <strong className="text-slate-800 font-semibold">
                &ldquo;{deleteConfirmRole?.name}&rdquo;
              </strong>
              ?
            </p>
          </DialogHeader>

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            Consecuencias inmediatas: sus permisos dejan de autorizar operaciones y todos los operarios asignados quedarán sin rol.
          </p>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmRole(null)}
              disabled={isDeletingRole}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={isDeletingRole}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingRole ? "Desactivando..." : "Sí, desactivar rol"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =====================================================================
          MODAL: CONFIRMAR RETIRO DE MIEMBRO
          ===================================================================== */}
      <Dialog
        open={Boolean(deleteMemberTarget)}
        onOpenChange={(open) => !open && setDeleteMemberTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-2">
              <UserX className="w-5 h-5" />
            </div>
            <DialogTitle>Retirar Miembro de la Granja</DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              ¿Confirmas el retiro de{" "}
              <strong className="text-slate-800 font-semibold">
                {deleteMemberTarget?.user?.name} {deleteMemberTarget?.user?.lastname}
              </strong>{" "}
              ({deleteMemberTarget?.user?.email}) de la granja #{id}?
            </p>
          </DialogHeader>

          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-lg">
            El usuario perderá el acceso inmediato a esta granja. Esto no elimina su cuenta global en el sistema.
          </p>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteMemberTarget(null)}
              disabled={isDeletingMember}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={isDeletingMember}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingMember ? "Retirando..." : "Sí, retirar miembro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
