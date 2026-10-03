"use client";

import { useEffect, useState, useMemo } from "react";
import { MapPin, Pencil, Trash, Droplet } from "lucide-react";
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

  const filteredGranjas = useMemo(() => {
    if (!search?.trim()) return granjas;
    const term = search.toLowerCase().trim();
    return granjas.filter((g) => g.name?.toLowerCase().includes(term));
  }, [granjas, search]);

  const deptMap = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d.name])),
    [departamentos]
  );
  const cityMap = useMemo(
    () => new Map(ciudades.map((c) => [c.id, c.name])),
    [ciudades]
  );

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

      <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-4">
        {}
        {filteredGranjas.length === 0 && search && (
          <p className="text-center col-span-full text-gray-500 text-lg">
            No se encontraron granjas 😢
          </p>
        )}

        {}
        {filteredGranjas.map((g) => (
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

            <CardFooter>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {g.total_area_ha} ha
                </p>
                <p className="text-sm text-slate-500">Área Total</p>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
