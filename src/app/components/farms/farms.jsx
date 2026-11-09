"use client";

import { useEffect, useState, useMemo } from "react";
import { MapPin, Pencil, Trash, Droplet, User, Waves, X } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FarmRegisterForm } from "./farm_form";
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
  ALL,
  STATUS_LABELS,
  buildFarmView,
  countPonds,
  filterFarms,
  getDepartmentOptions,
  getStatusOptions,
  ownerNameFromMembers,
} from "@/lib/farmFilters";
import { Toaster, toast } from "sonner";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";
const WATER_SOURCE_LABELS = {
  river: "Río",
  stream: "Quebrada",
  lake: "Lago/Laguna",
  spring: "Manantial",
  reservoir: "Embalse",
  deep_well: "Pozo profundo",
  municipal: "Acueducto municipal",
  irrigation_canal: "Canal de riego",
};

async function refreshAccessToken() {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem("access", data.access);
    if (data.refresh) localStorage.setItem("refresh", data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

function getErrorMessage(res) {
  return res
    .clone()
    .json()
    .catch(() => ({}))
    .then((data) => data.detail || data.message || `Error ${res.status}: ${res.statusText}`);
}

export function Farms({ search = "" }) {
  const [granjas, setGranjas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(true);

  // D-12: filtros por departamento y estado, y datos extra de cada granja
  const [departmentFilter, setDepartmentFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [extras, setExtras] = useState({}); // { [farmId]: { owner, pondsCount } }

  const deptMap = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d.name])),
    [departamentos]
  );
  const cityMap = useMemo(
    () => new Map(ciudades.map((c) => [c.id, c.name])),
    [ciudades]
  );

  const views = useMemo(
    () => granjas.map((g) => buildFarmView(g, { deptMap, cityMap, extra: extras[g.id] })),
    [granjas, deptMap, cityMap, extras]
  );
  const departmentOptions = useMemo(() => getDepartmentOptions(views), [views]);
  const statusOptions = useMemo(() => getStatusOptions(views), [views]);
  const filteredViews = useMemo(
    () => filterFarms(views, { query: search, department: departmentFilter, status: statusFilter }),
    [views, search, departmentFilter, statusFilter]
  );
  const hasFilters = departmentFilter !== ALL || statusFilter !== ALL;

  useEffect(() => {
    const fetchGranjas = async () => {
      setLoading(true);
      try {
        let token = localStorage.getItem("access");

        const fetchWithRetry = async (attemptToken) => {
          const res = await fetch(`${API_BASE}/farms/`, {
            headers: { Authorization: `Bearer ${attemptToken}` },
          });

          if (res.status === 401) {
            const newToken = await refreshAccessToken();
            if (!newToken) throw new Error("Sesión expirada");
            return fetchWithRetry(newToken);
          }

          if (!res.ok) {
            const msg = await getErrorMessage(res);
            throw new Error(msg);
          }

          return res.json();
        };

        const data = await fetchWithRetry(token);
        setGranjas(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando granjas:", error);
        if (error.message === "Sesión expirada") {
          toast.error("Tu sesión ha expirado. Inicia sesión nuevamente.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGranjas();
  }, []);

  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [deptRes, cityRes] = await Promise.all([
          fetch(`${API_BASE}/departments/`),
          fetch(`${API_BASE}/cities/`),
        ]);

        if (deptRes.ok) setDepartamentos(await deptRes.json());
        if (cityRes.ok) setCiudades(await cityRes.json());
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };

    loadCatalogs();
  }, []);

  // Propietario y número de estanques: la API de /farms/ no los trae, se consultan por granja
  // (máx. 4 a la vez). Si el backend agrega owner_name / ponds_count, estas consultas no se hacen.
  useEffect(() => {
    const pending = granjas.filter(
      (g) => !(g.owner_name || typeof g.owner === "string") || (g.ponds_count ?? g.pond_count) == null
    );
    if (pending.length === 0) return;

    let cancelled = false;
    const token = localStorage.getItem("access");
    const headers = { Authorization: `Bearer ${token}` };
    const readJson = async (promise) => {
      try {
        const res = await promise;
        return res.ok ? await res.json() : null;
      } catch {
        return null;
      }
    };

    const loadExtra = async (g) => {
      const [ponds, members] = await Promise.all([
        readJson(fetch(`${API_BASE}/farms/${g.id}/ponds/`, { headers })),
        readJson(fetch(`${API_BASE}/farms/${g.id}/members/`, { headers })),
      ]);
      if (cancelled) return;
      setExtras((prev) => ({
        ...prev,
        [g.id]: { pondsCount: countPonds(ponds), owner: ownerNameFromMembers(members) },
      }));
    };

    const queue = [...pending];
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length && !cancelled) await loadExtra(queue.shift());
    });
    Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [granjas]);

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access");

    await toast.promise(
      (async () => {
        const res = await fetch(`${API_BASE}/farms/${id}/`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const msg = await getErrorMessage(res);
          throw new Error(msg);
        }
        return { message: "Granja eliminada correctamente" };
      })(),
      {
        loading: "Eliminando granja...",
        success: () => {
          setGranjas((prev) => prev.filter((g) => g.id !== id));
          return "Granja eliminada correctamente";
        },
        error: (err) =>
          err.message.includes("401")
            ? "Sesión expirada. Recarga la página."
            : err.message || "Error al eliminar",
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-50">
        <p className="text-slate-500">Cargando granjas...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      {/* Filtros (D-12) */}
      <div className="max-w-6xl mx-auto px-4 pt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full bg-white sm:w-56" aria-label="Filtrar por departamento">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL}>Todos los departamentos</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full bg-white sm:w-48" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value={ALL}>Todos los estados</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s] || s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button
              variant="outline"
              onClick={() => {
                setDepartmentFilter(ALL);
                setStatusFilter(ALL);
              }}
            >
              <X className="mr-1 h-4 w-4" /> Limpiar filtros
            </Button>
          )}

          <p className="text-sm text-slate-500 sm:ml-auto" aria-live="polite">
            {filteredViews.length} de {views.length} {views.length === 1 ? "granja" : "granjas"}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-4">
        {filteredViews.length === 0 && (
          <p className="text-center col-span-full text-gray-500 text-lg">
            {views.length === 0
              ? "Aún no hay granjas registradas."
              : "No se encontraron granjas con esa búsqueda o filtros."}
          </p>
        )}

        {filteredViews.map((v) => {
          const g = v.raw;
          return (
          <Card
            key={g.id}
            className="group border hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <CardHeader>
              <CardTitle className="text-2xl font-bold group-hover:text-blue-600">
                <a href={`/home/granja/${g.id}/`}>{g.name}</a>
              </CardTitle>

              {}
              <CardDescription className="flex items-center gap-2 font-bold">
                <MapPin className="w-4 h-4" />
                {deptMap.get(g.department) || "—"} - {cityMap.get(g.city) || "—"}
              </CardDescription>

              {}
              <CardDescription className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                <Droplet className="w-4 h-4 text-blue-500" />
                <span>Fuente: {WATER_SOURCE_LABELS[g.water_source] || "No especificada"}</span>
              </CardDescription>

              {/* Propietario y estanques (D-12) */}
              <CardDescription className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                <User className="w-4 h-4 text-blue-500" />
                <span>
                  Propietario:{" "}
                  {v.owner === undefined ? "Cargando..." : v.owner || "Sin registrar"}
                </span>
              </CardDescription>

              <CardDescription className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                <Waves className="w-4 h-4 text-blue-500" />
                <span>
                  {v.pondsCount === undefined
                    ? "Estanques: Cargando..."
                    : v.pondsCount === null
                      ? "Estanques: Sin dato"
                      : `${v.pondsCount} ${v.pondsCount === 1 ? "estanque" : "estanques"}`}
                </span>
              </CardDescription>

              {}
              <CardAction>
                <div className="flex gap-3">
                  {/* ✏️ Editar */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Pencil className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] max-w-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Editar granja?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Edita <span className="font-bold">{g.name}</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <FarmRegisterForm
                        op={0}
                        idProp={g.id}
                        nombreProp={g.name}
                        departamentoProp={g.department}
                        ciudadProp={g.city}
                        direccionProp={g.address}
                        areaProp={g.total_area_ha}
                        waterSourceProp={g.water_source}
                      />

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Trash className="text-red-600 cursor-pointer hover:text-red-700 transition-colors" />
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[95vw] max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar granja?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará <span className="font-bold">{g.name}</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(g.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardAction>
            </CardHeader>

            <CardFooter className="items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {g.total_area_ha} ha
                </p>
                <p className="text-sm text-slate-500">Área Total</p>
              </div>

              {v.status && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    v.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : v.status === "inactive"
                        ? "bg-slate-200 text-slate-600"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_LABELS[v.status] || v.status}
                </span>
              )}
            </CardFooter>
          </Card>
          );
        })}
      </div>
    </>
  );
}