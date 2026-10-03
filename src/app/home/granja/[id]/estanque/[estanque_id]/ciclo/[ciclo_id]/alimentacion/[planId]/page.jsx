"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, AlertCircle, Pencil, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { feedingService } from "@/lib/feedingService";
import { usePermissions } from "@/lib/usePermissions";

function normalizeFieldErrors(fieldErrors) {
  if (!fieldErrors) return [];
  if (Array.isArray(fieldErrors)) {
    return fieldErrors.map((message) => ({ message: typeof message === "string" ? message : JSON.stringify(message) }));
  }
  return [{ message: fieldErrors.toString() }];
}

function formatDate(value = "") {
  return value ? value.slice(0, 10) : "";
}

const STATUS_LABELS = {
  scheduled: "Programado",
  completed: "Completado",
  skipped: "Omitido",
  in_progress: "En curso",
  cancelled: "Cancelado",
};

const STATUS_COLORS = {
  scheduled: "bg-slate-100 text-slate-700",
  completed: "bg-green-100 text-green-700",
  skipped: "bg-rose-100 text-rose-700",
  in_progress: "bg-blue-100 text-blue-700",
  cancelled: "bg-orange-100 text-orange-700",
};

export default function FeedingPlanDetail({ params }) {
  const { id, estanque_id, ciclo_id, planId } = use(params);
  const [plan, setPlan] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [ranges, setRanges] = useState([]);
  const [cycleName, setCycleName] = useState("");
  const [form, setForm] = useState({ feeding_schedule: "", start_date: "", end_date: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventError, setEventError] = useState(null);
  const [eventStatusOptions, setEventStatusOptions] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editStatus, setEditStatus] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const [units, setUnits] = useState([]);
  const [actualQuantity, setActualQuantity] = useState("");
  const [actualUnit, setActualUnit] = useState("");
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  const isFinished = useMemo(() => {
    if (!plan) return false;
    const ended = plan.state === "finished";
    if (ended) return true;
    if (plan.end_date) {
      const endDate = new Date(plan.end_date);
      return endDate < new Date();
    }
    return false;
  }, [plan]);

  const isInProgress = plan?.state === "in_progress";
  const isScheduled = plan?.state === "scheduled" || (!isInProgress && !isFinished);

  const scheduleNameById = useMemo(() => {
    return schedules.reduce((map, schedule) => {
      if (schedule?.id != null) {
        map[schedule.id.toString()] = schedule.name || schedule.title || `Cronograma #${schedule.id}`;
      }
      return map;
    }, {});
  }, [schedules]);

  const getScheduleLabel = (scheduleId) => {
    if (!scheduleId) return "—";
    const idKey = scheduleId.toString();
    return plan?.feeding_schedule_name || scheduleNameById[idKey] || scheduleId;
  };

  const getCycleLabel = () => {
    return plan?.cycle_name || cycleName || plan?.cycle || ciclo_id || "—";
  };

  useEffect(() => {
    if (permissions.loading) return;

    async function loadDetail() {
      setLoading(true);
      setLoadError(null);

      try {
        const [planData, scheduleData, rangeData] = await Promise.all([
          feedingService.getCycleFeedingPlanById(id, estanque_id, ciclo_id, planId),
          feedingService.getFeedingSchedules(id),
          // feedingService.getOccupiedRanges(id, ciclo_id),
        ]);

        if (!planData) {
          setLoadError("No se encontró el plan de alimentación.");
          return;
        }

        setPlan(planData);
        setSchedules(Array.isArray(scheduleData) ? scheduleData : []);
        // setRanges(Array.isArray(rangeData?.ranges) ? rangeData.ranges : []);
        setForm({
          feeding_schedule: planData.feeding_schedule?.toString() || planData.feeding_schedule_name?.toString() || "",
          start_date: formatDate(planData.start_date),
          end_date: formatDate(planData.end_date),
        });

        const token = localStorage.getItem("access");
        if (token) {
          // Use pond-scoped endpoint for cycle name
          const resCycle = await fetch(
            `https://backend-pongase-trucha.onrender.com/api/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          if (resCycle.ok) {
            const cycleData = await resCycle.json();
            setCycleName(cycleData.name || "");
          }
        }

        // Load events for this plan
        setEventsLoading(true);
        try {
          const scheduleId = planData.feeding_schedule;
          if (scheduleId) {
            const [eventsData, optionsData, unitsData] = await Promise.all([
              feedingService.getFeedingEvents(id, scheduleId, planId),
              feedingService.getFeedingOptions(),
              feedingService.getUnits(),
            ]);
            setEvents(Array.isArray(eventsData) ? eventsData : []);
            const statusOpts = optionsData?.feeding_event?.status;
            setEventStatusOptions(Array.isArray(statusOpts) ? statusOpts : []);
            setUnits(Array.isArray(unitsData) ? unitsData : []);
          }
        } catch (evtErr) {
          if (evtErr.status === 404) {
            setEvents([]);
          } else {
            setEventError("Error cargando eventos del plan.");
            console.error(evtErr);
          }
        } finally {
          setEventsLoading(false);
        }
      } catch (error) {
        if (error.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (error.status === 404) {
          setLoadError("Plan no accesible o no existe.");
          return;
        }
        setLoadError(error.message || "Error cargando datos del plan.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [id, ciclo_id, planId, permissions.loading]);

  const parseRanges = useMemo(() => {
    return ranges.filter((range) => {
      if (!plan) return true;
      if (range.id && plan.id && range.id.toString() === plan.id.toString()) {
        return false;
      }
      if (range.start_date === plan?.start_date && range.end_date === plan?.end_date) {
        return false;
      }
      return true;
    });
  }, [ranges, plan]);

  const conflictMessage = useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (start >= end) return "La fecha final debe ser posterior a la fecha de inicio.";

    const conflict = parseRanges.find((range) => {
      const rangeStart = new Date(range.start_date);
      const rangeEnd = new Date(range.end_date);
      return !(end < rangeStart || start > rangeEnd);
    });

    return conflict ? `Solapa con el rango ${conflict.start_date} - ${conflict.end_date}` : null;
  }, [form.start_date, form.end_date, parseRanges]);

  const setField = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEventStatus = async () => {
    if (!editingEvent || !editStatus) return;
    if (editStatus === "completed" && (!actualQuantity || !actualUnit)) {
      toast.error("Debes indicar la cantidad real y la unidad para marcar como completado.");
      return;
    }
    setSavingEvent(true);
    try {
      const payload = { status: editStatus };
      if (editStatus === "completed") {
        payload.actual_quantity = actualQuantity;
        payload.actual_unit = Number(actualUnit);
      }
      const updated = await feedingService.updateFeedingEvent(
        id,
        estanque_id,
        ciclo_id,
        planId,
        editingEvent.id,
        payload
      );
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEvent.id ? { ...e, ...updated } : e))
      );
      toast.success("Estado del evento actualizado.");
      setEditingEvent(null);
      setActualQuantity("");
      setActualUnit("");
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el evento.");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (!canManage) {
      setLoadError("No tienes permisos para modificar este plan.");
      return;
    }

    if (!plan) return;
    if (isFinished) return;

    const newErrors = {};
    if (!form.start_date) newErrors.start_date = ["Debe indicar la fecha de inicio."];
    if (!form.end_date) newErrors.end_date = ["Debe indicar la fecha de fin."];
    if (!form.feeding_schedule) newErrors.feeding_schedule = ["Debe indicar el cronograma."];
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (conflictMessage) {
      setErrors({ end_date: [conflictMessage] });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        cycle: Number(ciclo_id),
        feeding_schedule: Number(form.feeding_schedule),
        start_date: form.start_date,
        end_date: form.end_date,
      };

      const response = await feedingService.updateFeedingPlan(id, estanque_id, ciclo_id, planId, payload);
      if (response.status === 201) {
        toast.success("Se creó un nuevo plan a partir de esta fecha. El plan anterior continúa vigente hasta su fecha original.");
      } else {
        toast.success("Plan actualizado correctamente.");
      }

      const updatedPlan = response.payload;
      setPlan({ ...plan, ...updatedPlan });
      setForm({
        feeding_schedule: updatedPlan.feeding_schedule?.toString() || form.feeding_schedule,
        start_date: formatDate(updatedPlan.start_date) || form.start_date,
        end_date: formatDate(updatedPlan.end_date) || form.end_date,
      });
    } catch (error) {
      if (error.status === 400 && error.payload && typeof error.payload === "object") {
        setErrors(error.payload);
      } else {
        toast.error("No se pudo actualizar el plan.");
        console.error(error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/alimentacion`} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-5 h-5" /> Volver a planes
            </Link>
            <h1 className="mt-4 text-4xl font-bold">Plan de alimentación #{planId}</h1>
            <p className="text-slate-600 mt-2">Edita fechas y revisa el estado del plan.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              Estado: {plan?.state ? plan.state : "—"}
            </span> */}
            {isFinished && (
              <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-700">Finalizado</span>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando plan...
            </div>
          </div>
        )}

        {loadError && !loading && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>{loadError}</div>
            </div>
          </div>
        )}

        {!loading && !loadError && plan && (
          <div className="grid gap-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">Resumen del plan</h2>
                  <p className="text-slate-600">Detalles actuales del plan de alimentación.</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  <Pencil className="w-4 h-4" /> {plan.deleted_at ? "Archivado" : "Activo"}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Cronograma</p>
                    <p className="mt-2 text-lg font-semibold">{getScheduleLabel(plan?.feeding_schedule || plan?.feeding_schedule_name)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Ciclo</p>
                  <p className="mt-2 text-lg font-semibold">{getCycleLabel()}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Inicio</p>
                  <p className="mt-2 text-lg font-semibold">{plan.start_date || "—"}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Fin</p>
                  <p className="mt-2 text-lg font-semibold">{plan.end_date || "—"}</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <CheckCircle2 className="w-5 h-5" />
                <h2 className="text-2xl font-semibold">Editar plan</h2>
              </div>
              <p className="mt-2 text-slate-600">Envía siempre todos los campos requeridos. Si el plan está en curso, solo el fin es editable.</p>

              {isFinished && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                  Este plan ya finalizó y no puede modificarse.
                </div>
              )}

              <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
                <div className="grid gap-4 lg:grid-cols-3">
                  <Field>
                    <FieldLabel>Cronograma</FieldLabel>
                    <Select value={form.feeding_schedule || undefined} onValueChange={(value) => setField("feeding_schedule", value === "__NONE__" ? "" : value)} disabled={!canManage || isInProgress || isFinished}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cronograma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__NONE__">Selecciona</SelectItem>
                        {schedules.map((schedule) => (
                          <SelectItem key={schedule.id} value={schedule.id.toString()}>
                            {schedule.name || `Cronograma #${schedule.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError errors={normalizeFieldErrors(errors.feeding_schedule)} />
                  </Field>

                  <Field>
                    <FieldLabel>Fecha de inicio</FieldLabel>
                    <Input
                      type="date"
                      value={form.start_date}
                      onChange={(event) => setField("start_date", event.target.value)}
                      disabled={!canManage || isInProgress || isFinished}
                    />
                    <FieldError errors={normalizeFieldErrors(errors.start_date)} />
                  </Field>

                  <Field>
                    <FieldLabel>Fecha de fin</FieldLabel>
                    <Input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} disabled={!canManage || isFinished} />
                    <FieldError errors={normalizeFieldErrors(errors.end_date)} />
                  </Field>
                </div>

                {conflictMessage && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {conflictMessage}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button variant="outline" type="button" onClick={() => window.location.reload()}>
                    Recargar
                  </Button>
                  <Button type="submit" disabled={!canManage || isFinished || saving}>
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </Button>
                </div>
              </form>
            </section>
            {/* Events section */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <ListChecks className="w-5 h-5" />
                <h2 className="text-2xl font-semibold">Eventos de alimentación</h2>
              </div>
              <p className="mt-2 text-slate-600">Registro de todos los eventos registrados para este plan.</p>

              {eventsLoading && (
                <div className="mt-6 flex items-center justify-center gap-3 text-slate-600">
                  <Loader2 className="h-5 w-5 animate-spin" /> Cargando eventos...
                </div>
              )}

              {!eventsLoading && eventError && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {eventError}
                  </div>
                </div>
              )}

              {!eventsLoading && !eventError && events.length === 0 && (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
                  No hay eventos registrados para este plan.
                </div>
              )}

              {!eventsLoading && !eventError && events.length > 0 && (
                <div className="mt-6 grid gap-3">
                  {events.map((event, idx) => (
                    <div
                      key={event.id ?? idx}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">
                          {event.title || event.description || `Evento #${event.id ?? idx + 1}`}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${STATUS_COLORS[event.status] || "bg-slate-100 text-slate-700"}`}>
                            {event.status ? STATUS_LABELS[event.status] || event.status : "Sin estado"}
                          </span>
                          {canManage && (
                            <button
                              title="Editar estado"
                              onClick={() => { setEditingEvent(event); setEditStatus(event.status || ""); }}
                              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-1.5 text-sm text-slate-700 sm:grid-cols-2">
                        {event.date && <p><span className="font-medium">Fecha:</span> {event.date}</p>}
                        {event.scheduled_time && <p><span className="font-medium">Hora programada:</span> {event.scheduled_time}</p>}
                        {event.ration_number != null && <p><span className="font-medium">Ración #:</span> {event.ration_number}</p>}
                        {event.planned_quantity != null && <p><span className="font-medium">Cantidad planificada:</span> {event.planned_quantity}</p>}
                        {event.actual_quantity != null && <p><span className="font-medium">Cantidad real:</span> {event.actual_quantity}</p>}
                        {event.completed_at && <p><span className="font-medium">Completado:</span> {event.completed_at}</p>}
                        {event.completed_by && <p><span className="font-medium">Completado por:</span> {event.completed_by}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>

    {editingEvent && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-800">Editar estado del evento</h2>
          <p className="mt-1 text-sm text-slate-500">
            Evento #{editingEvent.id} &mdash; {editingEvent.date}
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
              <select
                value={editStatus}
                onChange={(e) => { setEditStatus(e.target.value); setActualQuantity(""); setActualUnit(""); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">Selecciona un estado</option>
                {eventStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{STATUS_LABELS[opt.value]}</option>
                ))}
              </select>
            </div>

            {editStatus === "completed" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Cantidad real <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={actualQuantity}
                    onChange={(e) => setActualQuantity(e.target.value)}
                    placeholder="Ej: 2.5"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Unidad <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={actualUnit}
                    onChange={(e) => setActualUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">Selecciona una unidad</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setEditingEvent(null)}
              disabled={savingEvent}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEventStatus}
              disabled={savingEvent || !editStatus || (editStatus === "completed" && (!actualQuantity || !actualUnit))}
            >
              {savingEvent ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
