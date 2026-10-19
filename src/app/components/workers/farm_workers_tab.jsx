"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  UserPen,
  NotebookPen,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Edit2,
  Users,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getFarmApps,
  getFarmRoles,
  createFarmRole,
  updateFarmRole,
  deleteFarmRole,
  getFarmMembers,
  assignMemberRole,
} from "@/lib/roleService";

/**
 * Componente principal para gestión de trabajadores y roles de una granja.
 * Basado en la nueva API de roles por app:
 * - GET /api/farms/<id>/roles/apps/
 * - GET /api/farms/<id>/roles/
 * - POST /api/farms/<id>/roles/
 * - PUT / PATCH /api/farms/<id>/roles/<role_id>/
 * - DELETE /api/farms/<id>/roles/<role_id>/
 * - PATCH /api/farms/<id>/members/<user_id>/ con { farm_role: <id> | null }
 */
export function FarmWorkers({ id, showBackButton = false, onBack = null }) {
  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [apps, setApps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("workers"); // 'workers' | 'roles'

  // Modal de asignación de rol a un trabajador
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Modal de creación / edición de rol
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null); // null = nuevo rol, number = editando
  const [roleName, setRoleName] = useState("");
  const [roleAppPermissions, setRoleAppPermissions] = useState({}); // { [appKey]: { can_view, can_create, can_edit, can_delete } }
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Modal de confirmación para eliminar rol
  const [deleteConfirmRole, setDeleteConfirmRole] = useState(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);
  const reloadData = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let mounted = true;
    if (!id) return;

    Promise.all([
      getFarmMembers(id).catch((err) => {
        console.error("Error cargando miembros:", err);
        return [];
      }),
      getFarmRoles(id).catch((err) => {
        console.error("Error cargando roles:", err);
        return [];
      }),
      getFarmApps(id).catch((err) => {
        console.error("Error cargando aplicaciones dinámicas:", err);
        return [];
      }),
    ])
      .then(([membersData, rolesData, appsData]) => {
        if (!mounted) return;
        setWorkers(Array.isArray(membersData) ? membersData : []);
        setRoles(Array.isArray(rolesData) ? rolesData : []);
        setApps(Array.isArray(appsData) ? appsData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Error general cargando datos de personal:", err);
        toast.error("Error al cargar los datos del personal y roles");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id, refreshKey]);

  // Diccionario de nombres legibles para las apps (usa los nombres del backend)
  const appNamesMap = useMemo(() => {
    const map = {};
    for (const item of apps) {
      if (item?.app) {
        map[item.app] = item.name || item.app;
      }
    }
    return map;
  }, [apps]);

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
  const handleOpenEditRole = (role) => {
    setEditingRoleId(role.id);
    setRoleName(role.name || "");

    const initialPerms = {};
    // Primero inicializar en false para todas las apps dinámicas conocidas
    apps.forEach((a) => {
      initialPerms[a.app] = {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
    });

    // Cargar los permisos existentes del rol
    if (Array.isArray(role.app_permissions)) {
      role.app_permissions.forEach((p) => {
        if (p?.app) {
          initialPerms[p.app] = {
            can_view: Boolean(p.can_view),
            can_create: Boolean(p.can_create),
            can_edit: Boolean(p.can_edit),
            can_delete: Boolean(p.can_delete),
          };
        }
      });
    }

    setRoleAppPermissions(initialPerms);
    setRoleDialogOpen(true);
  };

  // Modificar un permiso individual con la regla de negocio:
  // "can_view debe ser true si cualquiera de las otras acciones está habilitada."
  const handlePermissionChange = (appKey, action, checked) => {
    setRoleAppPermissions((prev) => {
      const current = prev[appKey] || {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };

      const updated = { ...current, [action]: checked };

      // Si activamos create, edit o delete, forzar can_view a true
      if (action !== "can_view" && checked) {
        updated.can_view = true;
      }

      // Si desactivamos can_view, apagar también create, edit y delete
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

  // Asignar rápidamente un nivel predefinido para una app
  const setQuickAccess = (appKey, level) => {
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
          can_create: true,
          can_edit: true,
          can_delete: true,
        };
      } else if (level === "read") {
        updated = {
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
      } else if (level === "write") {
        updated = {
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: false,
        };
      }

      return {
        ...prev,
        [appKey]: updated,
      };
    });
  };

  // Guardar rol (Crear o Actualizar)
  const handleSaveRole = async (e) => {
    e.preventDefault();

    const trimmedName = roleName.trim();
    if (!trimmedName) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }

    // Filtrar los permisos activos por app
    const appPermissionsPayload = Object.entries(roleAppPermissions)
      .filter(([_, perms]) => perms.can_view || perms.can_create || perms.can_edit || perms.can_delete)
      .map(([appKey, perms]) => ({
        app: appKey,
        can_view: Boolean(perms.can_view || perms.can_create || perms.can_edit || perms.can_delete),
        can_create: Boolean(perms.can_create),
        can_edit: Boolean(perms.can_edit),
        can_delete: Boolean(perms.can_delete),
      }));

    try {
      setIsSavingRole(true);

      if (editingRoleId) {
        // Actualizar rol existente
        await updateFarmRole(id, editingRoleId, {
          name: trimmedName,
          app_permissions: appPermissionsPayload,
        });
        toast.success("Rol actualizado correctamente");
      } else {
        // Crear nuevo rol
        await createFarmRole(id, {
          name: trimmedName,
          app_permissions: appPermissionsPayload,
        });
        toast.success("Rol creado exitosamente");
      }

      setRoleDialogOpen(false);
      setEditingRoleId(null);
      setRoleName("");
      // Recargar roles
      const updatedRoles = await getFarmRoles(id);
      setRoles(Array.isArray(updatedRoles) ? updatedRoles : []);
    } catch (err) {
      console.error("Error guardando rol:", err);
      toast.error(err.message || "Error al guardar el rol");
    } finally {
      setIsSavingRole(false);
    }
  };

  // Eliminar rol
  const handleDeleteRole = async () => {
    if (!deleteConfirmRole) return;

    try {
      setIsDeletingRole(true);
      await deleteFarmRole(id, deleteConfirmRole.id);
      toast.success(`Rol "${deleteConfirmRole.name}" desactivado`);
      setDeleteConfirmRole(null);
      // Recargar roles y miembros
      reloadData();
    } catch (err) {
      console.error("Error eliminando rol:", err);
      toast.error(err.message || "Error al desactivar el rol");
    } finally {
      setIsDeletingRole(false);
    }
  };

  // Asignar rol a operario (o retirar con null)
  const handleAssignRoleToWorker = async (userId, roleIdOrNull) => {
    try {
      setIsAssigning(true);
      await assignMemberRole(id, userId, roleIdOrNull);
      toast.success(
        roleIdOrNull === null
          ? "Rol retirado del trabajador"
          : "Rol asignado correctamente"
      );
      setAssignDialogOpen(false);
      setAssigningUser(null);
      // Recargar trabajadores
      const updatedMembers = await getFarmMembers(id);
      setWorkers(Array.isArray(updatedMembers) ? updatedMembers : []);
    } catch (err) {
      console.error("Error asignando rol:", err);
      toast.error(err.message || "Error al asignar el rol");
    } finally {
      setIsAssigning(false);
    }
  };

  // Contar cuántas aplicaciones tienen algún permiso activo en el modal de rol
  const activeAppsCount = useMemo(() => {
    return Object.values(roleAppPermissions).filter(
      (p) => p.can_view || p.can_create || p.can_edit || p.can_delete
    ).length;
  }, [roleAppPermissions]);

  // Lista de operarios (excluyendo al dueño/productor propietario)
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => !w.is_owner);
  }, [workers]);

  return (
    <div className="space-y-6">
      {/* BOTÓN VOLVER (opcional si se usa en la ruta independiente) */}
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

      {/* ENCABEZADO Y ACCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Personal y Permisos
            </h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Granja
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Administra los operarios de la granja y configura perfiles de rol con permisos específicos por módulo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenCreateRole}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2 font-medium"
          >
            <NotebookPen className="w-4 h-4" />
            Crear nuevo rol
          </Button>
        </div>
      </div>

      {/* PESTAÑAS: TRABAJADORES VS ROLES */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("workers")}
          className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${
            activeTab === "workers"
              ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Trabajadores asignados ({filteredWorkers.length})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 text-sm font-medium transition-all relative flex items-center gap-2 ${
            activeTab === "roles"
              ? "text-blue-600 border-b-2 border-blue-600 font-semibold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="w-4 h-4" />
          Roles de la granja ({roles.length})
        </button>
      </div>

      {/* CONTENIDO TAB: TRABAJADORES */}
      {activeTab === "workers" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm">Cargando personal de la granja...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No hay operarios registrados
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                No hay trabajadores secundarios asociados a esta granja. Puedes invitarlos desde la sección de administración o registro de operarios.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <th className="py-3.5 px-4">Operario</th>
                    <th className="py-3.5 px-4">Correo</th>
                    <th className="py-3.5 px-4">Rol en la Granja</th>
                    <th className="py-3.5 px-4">Permisos activos</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredWorkers.map((w) => {
                    const assignedRole = roles.find((r) => r.id === w.farm_role);
                    const appPerms = assignedRole?.app_permissions || [];
                    const activeApps = appPerms.filter(
                      (p) => p.can_view || p.can_create || p.can_edit || p.can_delete
                    );

                    return (
                      <tr key={w.user?.id || w.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                              {(w.user?.name?.[0] || "U").toUpperCase()}
                              {(w.user?.lastname?.[0] || "").toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {w.user?.name} {w.user?.lastname}
                              </p>
                              <span className="text-xs text-slate-400">
                                ID #{w.user?.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {w.user?.email}
                        </td>
                        <td className="py-3.5 px-4">
                          {assignedRole ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              {assignedRole.name}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                              Sin rol asignado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {activeApps.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {activeApps.slice(0, 3).map((p) => (
                                <span
                                  key={p.app}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {appNamesMap[p.app] || p.app}
                                </span>
                              ))}
                              {activeApps.length > 3 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-600">
                                  +{activeApps.length - 3} más
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              {assignedRole ? "Sin permisos activos" : "Ninguno"}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover:border-blue-400 hover:text-blue-600 gap-1.5 text-xs font-medium"
                            onClick={() => {
                              setAssigningUser(w);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPen className="w-3.5 h-3.5" />
                            {w.farm_role ? "Cambiar rol" : "Asignar rol"}
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

      {/* CONTENIDO TAB: ROLES DE LA GRANJA */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
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
                Los roles permiten otorgar permisos específicos por módulo (salud, alimentación, estanques, inventario, etc.) a los operarios.
              </p>
              <Button
                onClick={handleOpenCreateRole}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Crear primer rol
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((role) => {
                const appPerms = role.app_permissions || [];
                const membersWithRole = workers.filter(
                  (w) => w.farm_role === role.id
                );

                return (
                  <div
                    key={role.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
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
                          <p className="text-xs text-slate-400 mt-0.5">
                            ID de rol #{role.id}
                          </p>
                        </div>

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
                      </div>

                      {/* MATRIZ DE PERMISOS POR APP */}
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Permisos por Aplicación
                        </p>

                        {appPerms.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">
                            Sin permisos por app configurados.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                            {appPerms.map((perm) => {
                              const appLabel = appNamesMap[perm.app] || perm.app;
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
                                  <span className="font-medium text-slate-800">
                                    {appLabel}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    {perm.can_view && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                        Ver
                                      </span>
                                    )}
                                    {perm.can_create && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                                        Crear
                                      </span>
                                    )}
                                    {perm.can_edit && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                        Editar
                                      </span>
                                    )}
                                    {perm.can_delete && (
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
                      <button
                        onClick={() => handleOpenEditRole(role)}
                        className="text-blue-600 hover:text-blue-700 font-medium hover:underline inline-flex items-center gap-1"
                      >
                        Configurar permisos &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ASIGNAR ROL A OPERARIO */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asignar Rol a Operario</DialogTitle>
            <p className="text-sm text-slate-500">
              Selecciona el rol de la granja que definirá las autorizaciones de este trabajador.
            </p>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mt-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                {(assigningUser?.user?.name?.[0] || "U").toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {assigningUser?.user?.name} {assigningUser?.user?.lastname}
                </p>
                <p className="text-xs text-slate-500">
                  {assigningUser?.user?.email}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Roles disponibles
            </div>

            {/* OPCIÓN: QUITAR ROL (farm_role: null) */}
            <button
              type="button"
              disabled={isAssigning}
              onClick={() =>
                handleAssignRoleToWorker(assigningUser?.user?.id, null)
              }
              className={`w-full rounded-xl border p-3.5 text-left transition flex items-center justify-between ${
                assigningUser?.farm_role === null || !assigningUser?.farm_role
                  ? "border-slate-400 bg-slate-100/70"
                  : "border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              }`}
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  Sin rol asignado
                </p>
                <p className="text-xs text-slate-500">
                  Retira las autorizaciones locales de este operario en esta granja.
                </p>
              </div>
              {(assigningUser?.farm_role === null || !assigningUser?.farm_role) && (
                <span className="text-xs font-medium text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-full">
                  Estado actual
                </span>
              )}
            </button>

            {/* LISTA DE ROLES ACTIVOS */}
            {roles.map((role) => {
              const isCurrent = assigningUser?.farm_role === role.id;
              const appPerms = role.app_permissions || [];
              const activeCount = appPerms.filter((p) => p.can_view).length;

              return (
                <button
                  key={role.id}
                  type="button"
                  disabled={isAssigning || isCurrent}
                  onClick={() =>
                    handleAssignRoleToWorker(assigningUser.user.id, role.id)
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50/70 cursor-default"
                      : "border-slate-200 hover:bg-slate-50 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {role.name}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeCount} aplicaciones con permiso de consulta
                      </p>
                    </div>

                    {isCurrent && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        Rol actual
                      </span>
                    )}
                  </div>

                  {appPerms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {appPerms
                        .filter((p) => p.can_view)
                        .slice(0, 4)
                        .map((p) => (
                          <span
                            key={p.app}
                            className="inline-block text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                          >
                            {appNamesMap[p.app] || p.app}
                          </span>
                        ))}
                      {activeCount > 4 && (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          +{activeCount - 4} más
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false);
                setAssigningUser(null);
              }}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CREAR / EDITAR ROL */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingRoleId ? "Editar Rol de Granja" : "Crear Nuevo Rol de Granja"}
            </DialogTitle>
            <p className="text-sm text-slate-500">
              Configura el nombre del rol y define con precisión las acciones autorizadas por cada módulo del sistema.
            </p>
          </DialogHeader>

          <form onSubmit={handleSaveRole} className="space-y-6 mt-4">
            {/* NOMBRE DEL ROL */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-800">
                Nombre del rol <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej. Encargado de Sanidad y Monitoreo"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
                className="h-10 text-sm"
              />
              <p className="text-xs text-slate-400">
                Este nombre identifica el perfil de trabajo exclusivo para esta granja.
              </p>
            </div>

            {/* SECCIÓN DE PERMISOS POR APLICACIÓN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Permisos por Aplicación
                  </h4>
                  <p className="text-xs text-slate-500">
                    Habilitar Crear, Editar o Eliminar activará automáticamente la consulta.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {activeAppsCount} de {apps.length} apps autorizadas
                </span>
              </div>

              {apps.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 text-slate-400">
                  <p className="text-sm">No se pudieron cargar las aplicaciones del backend.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {apps.map((item) => {
                    const appKey = item.app;
                    const appLabel = item.name || appKey;
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
                        className={`rounded-xl border p-3.5 transition-all ${
                          hasAnyAction
                            ? "border-blue-300 bg-blue-50/20 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-slate-100">
                          <div>
                            <span className="font-bold text-sm text-slate-800">
                              {appLabel}
                            </span>
                            <span className="text-xs text-slate-400 ml-2 font-mono">
                              ({appKey})
                            </span>
                          </div>

                          {/* ACCESOS RÁPIDOS */}
                          <div className="flex items-center gap-1.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "all")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 text-[11px] font-medium"
                            >
                              Acceso total
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "read")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium"
                            >
                              Solo lectura
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuickAccess(appKey, "none")}
                              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 text-[11px]"
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>

                        {/* CASILLAS DE VERIFICACIÓN */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                          {/* CAN_VIEW */}
                          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
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
                                  ? "text-emerald-700 font-semibold"
                                  : "text-slate-600"
                              }`}
                            >
                              Consultar (GET)
                            </span>
                          </label>

                          {/* CAN_CREATE */}
                          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={perms.can_create}
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
                                  ? "text-blue-700 font-semibold"
                                  : "text-slate-600"
                              }`}
                            >
                              Crear (POST)
                            </span>
                          </label>

                          {/* CAN_EDIT */}
                          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={perms.can_edit}
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
                                  ? "text-amber-700 font-semibold"
                                  : "text-slate-600"
                              }`}
                            >
                              Editar (PUT/PATCH)
                            </span>
                          </label>

                          {/* CAN_DELETE */}
                          <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={perms.can_delete}
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
                                  ? "text-red-700 font-semibold"
                                  : "text-slate-600"
                              }`}
                            >
                              Eliminar (DELETE)
                            </span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* NOTA INFORMATIVA */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">
                  Actualización en tiempo real
                </p>
                <p className="mt-0.5 text-slate-500">
                  Las autorizaciones se consultan en cada petición del backend. Los cambios aplicados a este rol tendrán efecto inmediato para todos los operarios asignados, incluso con sesión activa.
                </p>
              </div>
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
                {isSavingRole ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Guardando...
                  </span>
                ) : editingRoleId ? (
                  "Guardar cambios del rol"
                ) : (
                  "Crear rol"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: CONFIRMAR DESACTIVACIÓN DE ROL */}
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
            Sus permisos dejarán de autorizar operaciones de inmediato en esta granja para todos los trabajadores que lo tengan asignado.
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
    </div>
  );
}