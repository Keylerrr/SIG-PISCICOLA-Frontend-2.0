"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MapPin } from "lucide-react";
import { useFlags } from "@/hooks/useFlags";
import { UserRoundX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";

export function RegisterWorker() {
  const [workers, setWorkers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null); 

  const { flags, loading } = useFlags();
  const canAssignManager = flags?.users?.assignManager;

  const [correo, setCorreo] = useState("");
  const [farms, setFarms] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("");
  
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState("");

  const [open, setOpen] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;

      try {
        const res = await fetch("https://backend-pongase-trucha.onrender.com/api/users/me/", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentUserId(data.id);
          setUserRole(data.role?.name); 
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (!canAssignManager) return;

    const token = localStorage.getItem("access");
    fetch("https://backend-pongase-trucha.onrender.com/api/users/productor/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al traer productores");
        return res.json();
      })
      .then((data) => setManagers(data))
      .catch(console.error);
  }, [canAssignManager]);

  useEffect(() => {
    if (loading) return;

    const fetchFarms = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;

      try {
        let url = "https://backend-pongase-trucha.onrender.com/api/farms/";

        if (canAssignManager) {
          if (!selectedManager) {
            setFarms([]);
            return;
          }
          url = `https://backend-pongase-trucha.onrender.com/api/farms/productor/${selectedManager}/`;
        }

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) throw new Error("Error al traer granjas");
        
        const data = await res.json();
        setFarms(data);
      } catch (err) {
        console.error("Error cargando granjas:", err);
      }
    };

    fetchFarms();
  }, [loading, canAssignManager, selectedManager]);

  const fetchWorkersViaFarms = useCallback(async (token, productorId) => {
    try {
      const farmsRes = await fetch(
        `https://backend-pongase-trucha.onrender.com/api/farms/productor/${productorId}/`,
        { headers: { Authorization: `Bearer ${token}` }}
      );

      if (!farmsRes.ok) {
        const farmsResAlt = await fetch(
          "https://backend-pongase-trucha.onrender.com/api/farms/",
          { headers: { Authorization: `Bearer ${token}` }}
        );
        if (!farmsResAlt.ok) throw new Error("Error al cargar granjas");
        var farms = await farmsResAlt.json();
      } else {
        var farms = await farmsRes.json();
      }

      const allOperarios = [];
      const seenUsers = new Set();

      for (const farm of farms) {
        const membersRes = await fetch(
          `https://backend-pongase-trucha.onrender.com/api/farms/${farm.id}/members/`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        if (membersRes.ok) {
          const members = await membersRes.json();
          for (const m of members) {
            if (!m.is_owner && m.status === "active" && !seenUsers.has(m.user?.id)) {
              seenUsers.add(m.user?.id);
              allOperarios.push({
                worker_id: m.user?.id,
                id: m.user?.id,
                name: m.user?.name || "",
                lastname: m.user?.lastname || "",
                email: m.user?.email || "",
                phone: m.user?.phone || "",
                farm_id: farm.id,
                farm_name: farm.name,
              });
            }
          }
        }
      }

      return allOperarios;
    } catch (err) {
      console.error("Error en fetchWorkersViaFarms:", err);
      throw err;
    }
  }, []);

  const fetchWorkers = useCallback(async (productorId = null) => {
    const token = localStorage.getItem("access");
    if (!token) return;

    setIsLoadingWorkers(true);

    try {
      const idToUse = productorId || currentUserId;

      if (!idToUse) {
        setWorkers([]);
        return;
      }

      let workersData = [];

      if (userRole === "Admin") {
        const url = `https://backend-pongase-trucha.onrender.com/api/users/productor/${idToUse}/operarios/`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorData = await res.clone().json().catch(() => ({}));
          throw new Error(errorData.detail || errorData.message || "Error al cargar operarios");
        }

        workersData = await res.json();
        
      } else {
        workersData = await fetchWorkersViaFarms(token, idToUse);
      }
      const normalized = workersData.map((w) => ({
        worker_id: w.id || w.worker_id || w.user?.id,
        id: w.id || w.worker_id || w.user?.id,
        name: w.name || w.user?.name || "",
        lastname: w.lastname || w.user?.lastname || "",
        email: w.email || w.user?.email || "",
        phone: w.phone || w.user?.phone || "",
        farm_id: w.farm_id,
        farm_name: w.farm_name,
      }));

      setWorkers(normalized);

    } catch (err) {
      console.error("Error en fetchWorkers:", err);
      toast.error(err.message || "Error cargando trabajadores");
      setWorkers([]); // Limpiar en caso de error
    } finally {
      setIsLoadingWorkers(false);
    }
  }, [currentUserId, userRole, fetchWorkersViaFarms]);

  useEffect(() => {
    if (currentUserId && userRole && !loading) {
      fetchWorkers(selectedManager);
    }
  }, [currentUserId, userRole, loading, selectedManager, fetchWorkers]);

  useEffect(() => {
    if (currentUserId && userRole && selectedManager) {
      fetchWorkers(selectedManager);
    }
  }, [selectedManager, currentUserId, userRole, fetchWorkers]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!correo || !selectedFarm) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    const token = localStorage.getItem("access");

    await toast.promise(
      fetch("https://backend-pongase-trucha.onrender.com/api/invitations/operario/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: correo,
          farm_id: Number(selectedFarm),
        }),
      }).then(async (res) => {
        let data = null;
        try {
          data = await res.json();
        } catch { }

        if (!res.ok) {
          const errorMsg = data?.detail || data?.message || data?.non_field_errors?.[0] || "Error al enviar invitación";
          throw new Error(errorMsg);
        }

        await fetchWorkers(selectedManager);

        return data;
      }),
      {
        loading: "Creando trabajador...",
        success: () => {
          setCorreo("");
          setSelectedFarm("");
          setOpen(false);
          return "Invitación enviada";
        },
        error: (err) => err.message || "Error al guardar",
      }
    );
  };

  const handleDeleteWorker = async () => {
    if (!workerToDelete) return;

    const token = localStorage.getItem("access");

    await toast.promise(
      fetch(
        `https://backend-pongase-trucha.onrender.com/api/farms/${workerToDelete.farm_id}/members/${workerToDelete.worker_id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      ).then(async (res) => {
        if (!res.ok) {
          let data = null;

          try {
            data = await res.json();
          } catch {}

          throw new Error(
            data?.detail ||
            data?.message ||
            "Error eliminando trabajador"
          );
        }

        await fetchWorkers(selectedManager);

        setDeleteDialogOpen(false);
        setWorkerToDelete(null);
      }),
      {
        loading: "Eliminando trabajador...",
        success: "Trabajador eliminado",
        error: (err) => err.message || "Error eliminando trabajador",
      }
    );
  };

  const handleOpenChange = (newOpen) => {
    setOpen(newOpen);
    if (!newOpen) {
      setCorreo("");
      setSelectedManager("");
      setSelectedFarm("");
    }
  };

  if (loading || (!currentUserId && !userRole)) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Gestión de Trabajadores</h1>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors">
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Trabajador</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <FieldGroup>
                <Field>
                  <Label>Correo del Operario</Label>
                  <Input
                    type="email"
                    placeholder="correo@correo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                  />
                </Field>

                {canAssignManager && (
                  <Field>
                    <Label>Productor</Label>
                    <Select 
                      onValueChange={(val) => {
                        setSelectedManager(val);
                        setSelectedFarm("");
                      }} 
                      value={selectedManager} 
                      required={canAssignManager}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un productor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {managers.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name} {m.lastname}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Guardar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.length === 0 ? (
          <p className="text-gray-500">No hay operarios aún</p>
        ) : (
          workers.map((w) => (
            <div key={w.id} className="border rounded-lg p-4 group border border-gray-200 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
              <p className="font-bold group-hover:text-blue-600">
                {w.name} {w.lastname}
              </p>
              <p className="text-sm text-gray-500">{w.email}</p>
              <p className="text-sm">{w.phone}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
