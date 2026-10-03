"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Stethoscope, Activity, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { healthService } from "@/lib/healthService";
import { usePermissions } from "@/lib/usePermissions";

const SEVERITY_COLORS = {
  low: "bg-green-100 text-green-700 border-green-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  critical: "bg-rose-100 text-rose-700 border-rose-200",
};

const SEVERITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export default function CycleHealth({ params }) {
  const { id, estanque_id, ciclo_id } = use(params);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  // New form state
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    disease_name: "",
    severity_level: "",
    comments: "",
    combined: false,
    sampled_quantity: "",
    mortality_quantity: "0",
    observations: "",
    batch_id: "",
    min_weight_g: "",
    max_weight_g: "",
  });
  const [saving, setSaving] = useState(false);
  const [options, setOptions] = useState(null);
  const [batches, setBatches] = useState([]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, optionsData, batchesData] = await Promise.all([
        healthService.getHealthStats(id, estanque_id, ciclo_id),
        healthService.getHealthOptions(),
        healthService.getCycleBatches(id, estanque_id, ciclo_id),
      ]);
      setStats(Array.isArray(statsData) ? statsData : []);
      setOptions(optionsData);
      setBatches(Array.isArray(batchesData) ? batchesData : []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los registros de salud.");
    } finally {
      setLoading(false);
    }
  }, [id, estanque_id, ciclo_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.disease_name || !form.severity_level) {
      toast.error("Complete los campos obligatorios.");
      return;
    }
    if (form.combined && !form.sampled_quantity) {
      toast.error("Debe ingresar la cantidad de muestra para el registro combinado.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        disease_name: form.disease_name,
        severity_level: form.severity_level,
        comments: form.comments,
      };

      if (form.combined) {
        if (!form.batch_id || !form.min_weight_g || !form.max_weight_g) {
          toast.error("Complete los campos requeridos para el muestreo (Lote, peso mínimo y máximo).");
          setSaving(false);
          return;
        }
        payload.sampled_quantity = Number(form.sampled_quantity);
        payload.batch_id = Number(form.batch_id);
        payload.min_weight_g = Number(form.min_weight_g);
        payload.max_weight_g = Number(form.max_weight_g);
        if (form.mortality_quantity) payload.mortality_quantity = Number(form.mortality_quantity);
        if (form.observations) payload.observations = form.observations;
      }

      await healthService.createHealthStat(id, estanque_id, ciclo_id, payload, form.combined);
      toast.success("Registro de salud creado.");
      setShowCreate(false);
      setForm({
        date: new Date().toISOString().split("T")[0],
        disease_name: "",
        severity_level: "",
        comments: "",
        combined: false,
        sampled_quantity: "",
        mortality_quantity: "0",
        observations: "",
        batch_id: "",
        min_weight_g: "",
        max_weight_g: "",
      });
      fetchStats();
    } catch (err) {
      toast.error(err.message || "Error al crear el registro.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (statId) => {
    if (!confirm("¿Está seguro de eliminar definitivamente este registro de salud?")) return;
    try {
      await healthService.deleteHealthStat(id, estanque_id, ciclo_id, statId, true);
      toast.success("Registro eliminado.");
      fetchStats();
    } catch (err) {
      if (err.payload?.blockers) {
        toast.error(err.payload.blockers.join("\n"));
      } else {
        toast.error(err.message || "No se pudo eliminar el registro.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" richColors />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}`}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Volver al ciclo
            </Link>
            <h1 className="mt-4 text-4xl font-bold flex items-center gap-3">
              <Stethoscope className="w-8 h-8 text-rose-500" /> Registros de Salud
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona diagnósticos y evalúa la salud del ciclo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <Button
                onClick={() => setShowCreate(!showCreate)}
                className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white"
              >
                <Plus className="w-4 h-4" /> Nuevo registro
              </Button>
            )}
          </div>
        </div>

        {showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800">Nuevo Diagnóstico</h2>
            <p className="text-slate-500 mb-6">Registra un nuevo estado de salud para el estanque.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    max={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enfermedad / Diagnóstico *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Ichthyophthirius"
                    value={form.disease_name}
                    onChange={(e) => setForm({ ...form, disease_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severidad *</label>
                  <select
                    required
                    value={form.severity_level}
                    onChange={(e) => setForm({ ...form, severity_level: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="">Selecciona una opción</option>
                    {options?.health_stat?.severity_level?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
                <textarea
                  rows={2}
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.combined}
                    onChange={(e) => setForm({ ...form, combined: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Registrar muestreo simultáneamente (POST combinado)
                </label>
                <p className="text-xs text-slate-500 ml-6 mt-1">Activa esta opción si este diagnóstico surge de una nueva evaluación física que aún no has registrado en el sistema.</p>
              </div>

              {form.combined && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lote evaluado *</label>
                    <select
                      required={form.combined}
                      value={form.batch_id}
                      onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    >
                      <option value="">Selecciona un lote</option>
                      {batches.map((b) => {
                        const batchId = b.pond_batch_detail?.batch?.id || b.pond_batch || b.id;
                        return <option key={b.id} value={b.id}>Lote #{batchId}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad muestreada *</label>
                    <input
                      type="number"
                      min="1"
                      required={form.combined}
                      value={form.sampled_quantity}
                      onChange={(e) => setForm({ ...form, sampled_quantity: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mortalidad encontrada</label>
                    <input
                      type="number"
                      min="0"
                      value={form.mortality_quantity}
                      onChange={(e) => setForm({ ...form, mortality_quantity: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso Mínimo (g) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={form.combined}
                      value={form.min_weight_g}
                      onChange={(e) => setForm({ ...form, min_weight_g: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Peso Máximo (g) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required={form.combined}
                      value={form.max_weight_g}
                      onChange={(e) => setForm({ ...form, max_weight_g: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones del muestreo</label>
                    <input
                      type="text"
                      value={form.observations}
                      onChange={(e) => setForm({ ...form, observations: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Guardar Registro"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando registros...
            </div>
          </div>
        )}

        {!loading && stats.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm border border-slate-100">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-800">Sin registros de salud</p>
            <p className="mt-1">No hay diagnósticos registrados para este ciclo.</p>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {stats.map((stat) => (
            <Card key={stat.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    {stat.disease_name}
                  </CardTitle>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                    <Calendar className="w-3.5 h-3.5" /> {stat.date}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold border ${SEVERITY_COLORS[stat.severity_level] || "bg-slate-100 text-slate-700"}`}
                >
                  {SEVERITY_LABELS[stat.severity_level] || stat.severity_level}
                </span>
              </CardHeader>
              <CardContent className="space-y-3">
                {stat.comments && (
                  <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="font-medium">Comentarios:</span> {stat.comments}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2 w-full justify-end">
                  <Link
                    href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/salud/${stat.id}`}
                    className="inline-flex items-center rounded-lg bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    Ver detalles y tratamientos
                  </Link>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="inline-flex items-center gap-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleDelete(stat.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
