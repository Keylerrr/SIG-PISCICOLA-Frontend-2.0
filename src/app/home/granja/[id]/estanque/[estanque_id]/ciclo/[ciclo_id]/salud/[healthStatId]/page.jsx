"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, Calendar, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { healthService } from "@/lib/healthService";
import { usePermissions } from "@/lib/usePermissions";

const SEVERITY_COLORS = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-rose-100 text-rose-700",
};

const SEVERITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

const PLAN_STATUS_COLORS = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-orange-100 text-orange-700",
};

export default function HealthStatDetail({ params }) {
  const { id, estanque_id, ciclo_id, healthStatId } = use(params);
  const [stat, setStat] = useState(null);
  const [plans, setPlans] = useState([]);
  const [options, setOptions] = useState(null);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const permissions = usePermissions(id);
  const canManage = permissions.canManageCycle;

  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    product: "",
    dose_per_application: "",
    unit: "",
    times_per_day: "1",
    gap_between_times_per_day: "0",
    gap_between_completed_day: "0",
    application_method: "",
    reason: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statData, plansData, optionsData, productsData, unitsData] = await Promise.all([
        healthService.getHealthStatById(id, estanque_id, ciclo_id, healthStatId),
        healthService.getTreatmentPlans(id, estanque_id, ciclo_id, healthStatId),
        healthService.getHealthOptions(),
        healthService.getProducts(id),
        healthService.getUnits(),
      ]);
      setStat(statData);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setOptions(optionsData);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [id, estanque_id, ciclo_id, healthStatId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date || !form.dose_per_application || !form.unit || !form.times_per_day || !form.application_method) {
      toast.error("Complete los campos obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.product === "") payload.product = null;
      else payload.product = Number(payload.product);
      
      payload.dose_per_application = Number(payload.dose_per_application);
      payload.unit = Number(payload.unit);
      payload.times_per_day = Number(payload.times_per_day);
      payload.gap_between_times_per_day = Number(payload.gap_between_times_per_day);
      payload.gap_between_completed_day = Number(payload.gap_between_completed_day);

      await healthService.createTreatmentPlan(id, estanque_id, ciclo_id, healthStatId, payload);
      toast.success("Plan de tratamiento creado exitosamente.");
      setShowCreate(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Error al crear el plan de tratamiento.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPlan = async (planId) => {
    if (!confirm("¿Está seguro de cancelar este plan de tratamiento?")) return;
    try {
      await healthService.deleteTreatmentPlan(id, estanque_id, ciclo_id, healthStatId, planId);
      toast.success("Plan cancelado correctamente.");
      fetchData();
    } catch (err) {
      toast.error(err.message || "No se pudo cancelar el plan.");
    }
  };

  if (loading && !stat) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" /> Cargando detalle...
        </div>
      </div>
    );
  }

  if (!stat) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="max-w-5xl mx-auto bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
          Registro no encontrado.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" richColors />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/salud`}
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" /> Volver a diagnósticos
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-slate-900">
              {stat.disease_name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-slate-500 text-sm flex items-center gap-1">
                <Calendar className="w-4 h-4" /> {stat.date}
              </span>
              <span
                className={`rounded-full px-3 py-0.5 text-xs font-bold ${SEVERITY_COLORS[stat.severity_level] || "bg-slate-100 text-slate-700"}`}
              >
                {SEVERITY_LABELS[stat.severity_level] || stat.severity_level}
              </span>
            </div>
            {stat.comments && (
              <p className="mt-3 text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                <span className="font-semibold">Notas:</span> {stat.comments}
              </p>
            )}
          </div>
          {canManage && (
            <Button
              onClick={() => setShowCreate(!showCreate)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" /> Nuevo Plan de Tratamiento
            </Button>
          )}
        </div>

        {showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Crear Plan de Tratamiento</h2>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancelar</Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de inicio *</label>
                  <input
                    type="date"
                    required
                    min={stat.date}
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de fin (estimada) *</label>
                  <input
                    type="date"
                    required
                    min={form.start_date || stat.date}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Producto a usar</label>
                  <select
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ninguno (o no inventariado)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Método de aplicación *</label>
                  <select
                    required
                    value={form.application_method}
                    onChange={(e) => setForm({ ...form, application_method: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecciona un método</option>
                    {options?.treatment_plan?.application_method?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Dosis por aplicación *</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={form.dose_per_application}
                      onChange={(e) => setForm({ ...form, dose_per_application: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="Ej. 2.5"
                    />
                    <select
                      required
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      className="w-24 rounded-lg border border-slate-200 px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Und</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Veces al día *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.times_per_day}
                    onChange={(e) => setForm({ ...form, times_per_day: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Minutos entre aplicaciones *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.gap_between_times_per_day}
                    onChange={(e) => setForm({ ...form, gap_between_times_per_day: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="0 si es una vez al día"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Días de descanso *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.gap_between_completed_day}
                    onChange={(e) => setForm({ ...form, gap_between_completed_day: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    placeholder="0 = todos los días"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Razón o motivo</label>
                  <input
                    type="text"
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notas adicionales</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Guardar Plan"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {plans.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm border border-slate-100">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-800">No hay planes de tratamiento</p>
            <p className="mt-1">Crea un plan para programar aplicaciones para este diagnóstico.</p>
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => {
            const product = products.find(p => p.id === plan.product);
            const unit = units.find(u => u.id === plan.unit);
            return (
              <Card key={plan.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">
                      Plan #{plan.id}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {plan.start_date} &rarr; {plan.end_date}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${PLAN_STATUS_COLORS[plan.status] || "bg-slate-100 text-slate-700"}`}
                  >
                    {options?.treatment_plan?.status?.find(o => o.value === plan.status)?.label || plan.status}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-700">
                  <p><span className="font-medium">Producto:</span> {product ? product.name : "N/A"}</p>
                  <p><span className="font-medium">Dosis:</span> {plan.dose_per_application} {unit?.symbol}</p>
                  <p><span className="font-medium">Frecuencia:</span> {plan.times_per_day} veces al día</p>
                  <p><span className="font-medium">Método:</span> {options?.treatment_plan?.application_method?.find(o => o.value === plan.application_method)?.label || plan.application_method}</p>
                  {plan.reason && <p><span className="font-medium">Razón:</span> {plan.reason}</p>}
                </CardContent>
                <CardFooter className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <Link
                    href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/salud/${healthStatId}/plan/${plan.id}`}
                    className="inline-flex items-center rounded-lg bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    Ver eventos / Editar
                  </Link>
                  {canManage && plan.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="inline-flex items-center gap-1 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => handleCancelPlan(plan.id)}
                      title="Cancelar plan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
