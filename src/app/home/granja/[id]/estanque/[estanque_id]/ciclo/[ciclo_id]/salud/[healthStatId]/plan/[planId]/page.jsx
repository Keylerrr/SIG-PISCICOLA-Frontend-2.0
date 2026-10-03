"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Calendar, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { healthService } from "@/lib/healthService";
import { usePermissions } from "@/lib/usePermissions";

const EVENT_STATUS_COLORS = {
  scheduled: "bg-slate-100 text-slate-700",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-rose-100 text-rose-700",
  in_progress: "bg-blue-100 text-blue-700",
  cancelled: "bg-orange-100 text-orange-700",
};

export default function TreatmentPlanDetail({ params }) {
  const { id, estanque_id, ciclo_id, healthStatId, planId } = use(params);
  const [plan, setPlan] = useState(null);
  const [events, setEvents] = useState([]);
  const [options, setOptions] = useState(null);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Event State
  const [editingEvent, setEditingEvent] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [actualDose, setActualDose] = useState("");
  const [actualUnit, setActualUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);

  const permissions = usePermissions(id);
  const canManage = permissions.canManageCycle;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [planData, eventsData, optionsData, productsData, unitsData] = await Promise.all([
        healthService.getTreatmentPlanById(id, estanque_id, ciclo_id, healthStatId, planId),
        healthService.getTreatmentPlanEvents(id, estanque_id, ciclo_id, healthStatId, planId),
        healthService.getHealthOptions(),
        healthService.getProducts(id),
        healthService.getUnits(),
      ]);
      setPlan(planData);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setOptions(optionsData);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar los datos del plan y eventos.");
    } finally {
      setLoading(false);
    }
  }, [id, estanque_id, ciclo_id, healthStatId, planId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEvent = async () => {
    if (!editStatus) {
      toast.error("Debe seleccionar un estado.");
      return;
    }
    
    const payload = { status: editStatus };
    if (editStatus === "completed") {
      if (!actualDose || !actualUnit) {
        toast.error("Debe especificar la dosis y unidad real cuando se completa.");
        return;
      }
      payload.actual_dose = Number(actualDose);
      payload.actual_unit = Number(actualUnit);
    } else {
      payload.actual_dose = null;
      payload.actual_unit = null;
    }
    if (notes) {
      payload.notes = notes;
    }

    setSavingEvent(true);
    try {
      await healthService.updateTreatmentEvent(id, estanque_id, ciclo_id, healthStatId, planId, editingEvent.id, payload);
      toast.success("Estado del evento actualizado.");
      setEditingEvent(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Error al actualizar evento.");
    } finally {
      setSavingEvent(false);
    }
  };

  const getStatusLabel = (val) => {
    const list = options?.treatment_event?.status_closeable || options?.treatment_plan?.status || [];
    const item = list.find(l => l.value === val);
    return item ? item.label : val;
  };

  if (loading && !plan) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-3 text-slate-600">
          <Loader2 className="w-6 h-6 animate-spin" /> Cargando plan y eventos...
        </div>
      </div>
    );
  }

  const product = products.find(p => p.id === plan?.product);
  const planUnit = units.find(u => u.id === plan?.unit);

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <Toaster position="top-center" richColors />

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-4">
            <div>
              <Link
                href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/salud/${healthStatId}`}
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" /> Volver al diagnóstico
              </Link>
              <h1 className="mt-4 text-3xl font-bold text-slate-900 flex items-center gap-2">
                Plan de Tratamiento #{planId}
              </h1>
            </div>

            {plan && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Detalles Generales</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium text-slate-700">Estado:</span> {plan.status}</p>
                      <p><span className="font-medium text-slate-700">Producto:</span> {product ? product.name : "N/A"}</p>
                      <p><span className="font-medium text-slate-700">Dosis planificada:</span> {plan.dose_per_application} {planUnit?.symbol}</p>
                      <p><span className="font-medium text-slate-700">Motivo:</span> {plan.reason || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Programación</h3>
                    <div className="space-y-2">
                      <p><span className="font-medium text-slate-700">Fecha de inicio:</span> {plan.start_date}</p>
                      <p><span className="font-medium text-slate-700">Fecha estimada fin:</span> {plan.end_date}</p>
                      <p><span className="font-medium text-slate-700">Frecuencia:</span> {plan.times_per_day} veces/día</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-500" /> Aplicaciones / Eventos
            </h2>

            {events.length === 0 && (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center text-slate-500">
                No hay eventos programados en este plan.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((ev, idx) => (
                <div key={ev.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-lg text-slate-800">Aplicación #{ev.ration_number || idx + 1}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {ev.date} {ev.scheduled_time && `- ${ev.scheduled_time}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${EVENT_STATUS_COLORS[ev.status] || "bg-slate-100 text-slate-700"}`}>
                        {getStatusLabel(ev.status)}
                      </span>
                      {canManage && (
                        <button
                          title="Editar estado"
                          onClick={() => {
                            setEditingEvent(ev);
                            setEditStatus(ev.status === 'scheduled' ? "" : ev.status);
                            setActualDose(ev.actual_dose || plan?.dose_per_application || "");
                            setActualUnit(ev.actual_unit || plan?.unit || "");
                            setNotes(ev.notes || "");
                          }}
                          className="bg-blue-50 text-blue-600 p-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-700">
                    <p><span className="font-medium">Planificado:</span> {ev.planned_quantity} {units.find(u => u.id === ev.planned_unit)?.symbol}</p>
                    {ev.status === "completed" && (
                      <p><span className="font-medium text-green-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5"/> Real:</span> {ev.actual_dose} {units.find(u => u.id === ev.actual_unit)?.symbol}</p>
                    )}
                    {ev.completed_at && (
                      <p className="col-span-2"><span className="font-medium">Aplicado en:</span> {new Date(ev.completed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-800 mb-1">Registrar aplicación</h2>
            <p className="text-sm text-slate-500 mb-5">
              Aplicación #{editingEvent.ration_number} - {editingEvent.date}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    setEditStatus(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione...</option>
                  {options?.treatment_event?.status_closeable?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  {/* Default fallback just in case options are empty */}
                  {!options?.treatment_event?.status_closeable && (
                    <>
                      <option value="completed">Completado</option>
                      <option value="skipped">Omitido</option>
                    </>
                  )}
                </select>
              </div>

              {editStatus === "completed" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dosis real aplicada *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={actualDose}
                      onChange={(e) => setActualDose(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad *</label>
                    <select
                      value={actualUnit}
                      onChange={(e) => setActualUnit(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccione unidad</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notas u observaciones (opcional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={savingEvent}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEvent} disabled={savingEvent} className="bg-blue-600 hover:bg-blue-700">
                {savingEvent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
