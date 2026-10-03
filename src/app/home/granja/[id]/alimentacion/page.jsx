"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "sonner";
import { feedingService } from "@/lib/feedingService";
import { usePermissions } from "@/lib/usePermissions";
import { FeedingScheduleForm } from "@/app/components/feeding/feeding_schedule_form";

const TYPES = [
  { key: "alevin", label: "Alevín" },
  { key: "rising", label: "Crecimiento" },
  { key: "fatting", label: "Engorde" },
  { key: "breeding", label: "Reproducción" },
];

export default function FarmFeeding({ params }) {
  const { id } = use(params);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [specieFilter, setSpecieFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [species, setSpecies] = useState([]);
  const [products, setProducts] = useState([]);
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await feedingService.getFeedingSchedules(id, {
        is_current: true,
        type: typeFilter || undefined,
        specie: specieFilter || undefined,
        product: productFilter || undefined,
      });
      setSchedules(
        Array.isArray(data)
          ? data.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          : []
      );
    } catch (error) {
      console.error("Error cargando cronogramas:", error);
      if (error.status === 401) {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFilters = async () => {
      const token = localStorage.getItem("access");

      try {
        const speciesResponse = await fetch("https://backend-pongase-trucha.onrender.com/api/species/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (speciesResponse.ok) {
          const data = await speciesResponse.json();
          setSpecies(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error cargando especies:", error);
      }

      try {
        const productResponse = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${id}/products/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (productResponse.ok) {
          const data = await productResponse.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error cargando productos de alimentación:", error);
      }
    };

    loadFilters();
  }, [id]);

  useEffect(() => {
    if (permissions.loading) return;
    if (!permissions.isFarmMember && !permissions.canManageCycle && !permissions.isAdmin) {
      return;
    }

    fetchSchedules();
  }, [id, typeFilter, specieFilter, permissions.loading, permissions.isFarmMember, permissions.canManageCycle, permissions.isAdmin]);

  const speciesById = useMemo(() => {
    return species.reduce((acc, item) => {
      acc[item.id.toString()] = item.name;
      return acc;
    }, {});
  }, [species]);

  const productsById = useMemo(() => {
    return products.reduce((acc, item) => {
      acc[item.id.toString()] = item.name;
      return acc;
    }, {});
  }, [products]);

  const filteredSchedules = useMemo(() => {
    return schedules;
  }, [schedules]);

  const getSpeciesLabel = (schedule) => {
    const specieValue = schedule.specie ?? schedule.specie_id;
    const specieKey = specieValue != null ? specieValue.toString() : "";
    return schedule.specie_name || speciesById[specieKey] || schedule.specie || "—";
  };

  const getProductLabel = (schedule) => {
    const productValue = schedule.product ?? schedule.product_id;
    const productKey = productValue != null ? productValue.toString() : "";
    return schedule.product_name || productsById[productKey] || schedule.product || "—";
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={`/home/granja/${id}/`} className="text-slate-600 hover:text-slate-800 inline-flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" /> Volver a la granja
            </Link>
            <h1 className="mt-4 text-4xl font-bold">Alimentación</h1>
            <p className="text-slate-600 mt-2">Cronogramas de alimentación vigentes para esta granja.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <Button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nuevo cronograma
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Tipo</label>
            <Select value={typeFilter || undefined} onValueChange={(value) => setTypeFilter(value === "__NONE__" ? "" : value)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Todos</SelectItem>
                {TYPES.map((option) => (
                  <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Especie</label>
            <Select value={specieFilter || undefined} onValueChange={(value) => setSpecieFilter(value === "__NONE__" ? "" : value)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Todas</SelectItem>
                {species.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Producto</label>
            <Select value={productFilter || undefined} onValueChange={(value) => setProductFilter(value === "__NONE__" ? "" : value)}>
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__NONE__">Todos</SelectItem>
                {products.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando cronogramas...
            </div>
          </div>
        )}

        {!loading && filteredSchedules.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm">
            No hay cronogramas activos para esta selección.
          </div>
        )}

        <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 px-4">
          {filteredSchedules.map((schedule) => (
            <Card key={schedule.id} className="group border border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">
                  <Link href={`/home/granja/${id}/alimentacion/${schedule.id}`} className="hover:text-blue-600">
                    {schedule.name}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">Especie: {getSpeciesLabel(schedule)}</p>
                <p className="text-sm text-slate-600">Tipo: {schedule.type || "—"}</p>
                <p className="text-sm text-slate-600">Producto: {getProductLabel(schedule)}</p>
                <p className="text-sm text-slate-600">Fecha de creación: {schedule.created_at || "—"}</p>
                {/* {schedule.warnings && (
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    {schedule.warnings}
                  </span>
                )} */}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                <Link href={`/home/granja/${id}/alimentacion/${schedule.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                  Detalle
                </Link>
                {schedule.is_current ? (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-green-700">Vigente</span>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Inactivo</span>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Crear cronograma de alimentación</h2>
                <p className="text-slate-600">Registra un cronograma nuevo para esta granja.</p>
              </div>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cerrar
              </Button>
            </div>
            <FeedingScheduleForm
              farmId={id}
              onSuccess={() => {
                setShowCreate(false);
                fetchSchedules();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
