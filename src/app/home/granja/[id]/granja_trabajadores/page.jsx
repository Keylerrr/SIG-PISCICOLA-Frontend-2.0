"use client";

import { useEffect, useState, useCallback, use } from "react";
import { ArrowLeft, UserCog, Plus, UserPen, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { toast } from "sonner";

export default function GranjaUsuarios({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assigningUser, setAssigningUser] = useState(null);

  const [openRole, setOpenRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [permissions, setPermissions] = useState([]);

  const PERMISSION_LABELS = {
      MANAGE_REVIEWS: "Gestión de Revisiones",
      MANAGE_INVENTORY: "Gestión de Inventario",
      MANAGE_CYCLE: "Gestión de Ciclos",
      MANAGE_POND: "Gestión de Estanques",
      MANAGE_FARM: "Administración Total de la Finca",
    };

    const PERMISSION_OPTIONS = [
    {
      key: "MANAGE_REVIEWS",
      title: "Gestión de Revisiones",
      description: "Permite administrar revisiones y controles.",
      includes: [],
    },
    {
      key: "MANAGE_INVENTORY",
      title: "Gestión de Inventario",
      description: "Productos, compras, proveedores y movimientos.",
      includes: [],
    },
    {
      key: "MANAGE_CYCLE",
      title: "Gestión de Ciclos",
      description: "Administración de ciclos productivos.",
      includes: ["MANAGE_REVIEWS"],
    },
    {
      key: "MANAGE_POND",
      title: "Gestión de Estanques",
      description: "Control y administración de estanques.",
      includes: [
        "MANAGE_CYCLE",
        "MANAGE_REVIEWS",
      ],
    },
    {
      key: "MANAGE_FARM",
      title: "Administración Total de la Finca",
      description: "Acceso completo a la gestión de la finca.",
      includes: [
        "MANAGE_POND",
        "MANAGE_INVENTORY",
        "MANAGE_CYCLE",
        "MANAGE_REVIEWS",
      ],
    },
  ];

  const expandPermissions = (selected) => {
    const set = new Set(selected);

    let changed = true;
    while (changed) {
      changed = false;
      for (const perm of Array.from(set)) {
        const option = PERMISSION_OPTIONS.find((p) => p.key === perm);
        if (!option) continue;

        for (const included of option.includes) {
          if (!set.has(included)) {
            set.add(included);
            changed = true;
          }
        }
      }
    }

    return Array.from(set);
  };

  const fetchWorkers = useCallback(async (currentToken) => {
    try {
      const res = await fetch(
        `https://backend-pongase-trucha.onrender.com/api/farms/${id}/members/`,
        {
          headers: { Authorization: `Bearer ${currentToken}` },
        }
      );

      const data = await res.json();
      setWorkers(data);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando trabajadores");
    }
  }, [id]);

  const fetchRoles = useCallback(async (currentToken) => {
    try {
      const res = await fetch(
        `https://backend-pongase-trucha.onrender.com/api/farms/${id}/roles/`,
        {
          headers: { Authorization: `Bearer ${currentToken}` },
        }
      );

      const data = await res.json();
      setRoles(data);
    } catch (err) {
      console.error(err);
      toast.error("Error cargando roles");
    }
  }, [id]);

  useEffect(() => {
    const currentToken = localStorage.getItem("access");
    if (!currentToken) return;

    const loadData = async () => {
      await fetchWorkers(currentToken);
      await fetchRoles(currentToken);
    };

    loadData();
  }, [fetchWorkers, fetchRoles]);

  const handleAssignRole = async (userId, roleId) => {
    const currentToken = localStorage.getItem("access");
    await toast.promise(
      fetch(
        `https://backend-pongase-trucha.onrender.com/api/farms/${id}/members/${userId}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            farm_role: roleId,
          }),
        }
      ).then(async (res) => {
        if (!res.ok) throw new Error("Error asignando rol");

        await fetchWorkers(currentToken);

        setAssignDialogOpen(false);
        setAssigningUser(null);
      }),
      {
        loading: "Asignando rol...",
        success: "Rol actualizado",
        error: "Error asignando rol",
      }
    );
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();

    if (!roleName) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const currentToken = localStorage.getItem("access");

    await toast.promise(
      fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${id}/roles/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          name: roleName,
          permissions: [...new Set(permissions)],
        }),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Error creando rol");

        setRoleName("");
        setPermissions([]);
        setOpenRole(false);
        await fetchRoles(currentToken);
      }),
      {
        loading: "Creando rol...",
        success: "Rol creado",
        error: "Error",
      }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      
      {/* VOLVER */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 hover:cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
        Volver a la Vista de la Granja
      </button>

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trabajadores</h1>

        {/* CREAR ROL */}
        <Dialog open={openRole} onOpenChange={setOpenRole}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-black text-white hover:cursor-pointer">
              <NotebookPen className="w-4 h-4" />
              Crear Rol
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear rol</DialogTitle>
              <p className="text-sm text-slate-500">
                Selecciona las acciones permitidas para este rol. Algunos permisos incluyen otros.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateRole} className="space-y-5 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre del rol</label>
                <Input
                  placeholder="Ej. Jefe de inventario"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium">Permisos concedidos</div>

                <div className="grid gap-3">
                  {PERMISSION_OPTIONS.map((perm) => {
                    const expandedPermissions = expandPermissions(permissions);

                    const isChecked =
                      permissions.includes(perm.key) ||
                      expandedPermissions.includes(perm.key);

                    const isInherited =
                      !permissions.includes(perm.key) &&
                      expandedPermissions.includes(perm.key);

                    return (
                      <label
                        key={perm.key}
                        className="flex items-start gap-3 rounded-lg border p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={isChecked}
                          disabled={isInherited}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPermissions((prev) => [...prev, perm.key]);
                            } else {
                              setPermissions((prev) =>
                                prev.filter((p) => p !== perm.key)
                              );
                            }
                          }}
                        />

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{perm.title}</span>
                          </div>

                          <p className="text-sm text-slate-600">{perm.description}</p>

                          {perm.includes.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {perm.includes.map((included) => (
                                <span
                                  key={included}
                                  className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                                >
                                  + {PERMISSION_LABELS[included]}
                                </span>
                              ))}
                            </div>
                          )}

                          {isInherited && (
                            <p className="mt-1 text-xs text-amber-600">
                              Este permiso ya viene incluido por otro permiso superior.
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-3">
                <div className="text-sm font-medium">Permisos efectivos</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {expandPermissions(permissions).map((perm) => (
                    <span
                      key={perm}
                      className="rounded-full bg-white px-3 py-1 text-xs border"
                    >
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpenRole(false);
                    setRoleName("");
                    setPermissions([]);
                  }}
                >
                  Cancelar
                </Button>

                <Button type="submit" className="hover:cursor-pointer">
                  Crear rol
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow p-4">
        {workers.length === 0 ? (
          <p className="text-gray-500">No hay trabajadores</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-3">Nombre</th>
                <th className="py-3">Email</th>
                <th className="py-3">Rol</th>
                <th className="py-3">Acción</th>
              </tr>
            </thead>

            <tbody>
              {workers
                .filter(w => !w.is_owner)
                .map((w) => (
                  <tr key={w.user.id} className="border-b">
                    <td className="py-3">{w.user.name} {w.user.lastname}</td>
                    <td className="py-3">{w.user.email}</td>
                    <td className="py-3">
                      {roles.find(r => r.id === w.farm_role)?.name || "Sin rol"}
                    </td>
                    <td className="py-3">
                      <Dialog
                        open={assignDialogOpen}
                        onOpenChange={setAssignDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="hover:cursor-pointer"
                            onClick={() => {
                              setAssigningUser(w);
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPen className="w-4 h-4 mr-1" />
                            Asignar Rol
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Asignar Rol</DialogTitle>

                            <p className="text-sm text-slate-500">
                              Selecciona un rol para:
                            </p>

                            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium">
                              {assigningUser?.user?.name}{" "}
                              {assigningUser?.user?.lastname}
                            </div>
                          </DialogHeader>

                          <div className="space-y-3 mt-4">
                            {roles.map((role) => {
                              const isCurrent =
                                assigningUser?.farm_role === role.id;

                              return (
                                <button
                                  key={role.id}
                                  type="button"
                                  disabled={isCurrent}
                                  onClick={() =>
                                    handleAssignRole(
                                      assigningUser.user.id,
                                      role.id
                                    )
                                  }
                                  className={`
                                    w-full rounded-xl border p-4 text-left transition
                                    ${
                                      isCurrent
                                        ? "border-emerald-500 bg-emerald-50"
                                        : "hover:bg-slate-50 hover:border-slate-400"
                                    }
                                  `}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="font-semibold">
                                        {role.name}
                                      </h3>

                                      <p className="text-sm text-slate-500 mt-1">
                                        {(role.permissions || []).length} permisos
                                      </p>
                                    </div>

                                    {isCurrent && (
                                      <span className="text-xs font-medium text-emerald-600">
                                        Rol actual
                                      </span>
                                    )}
                                  </div>

                                  {(role.permissions || []).length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {role.permissions.map((perm) => (
                                        <span
                                          key={perm}
                                          className="rounded-full border px-2 py-1 text-xs bg-white"
                                        >
                                          {PERMISSION_LABELS[perm] || perm}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}