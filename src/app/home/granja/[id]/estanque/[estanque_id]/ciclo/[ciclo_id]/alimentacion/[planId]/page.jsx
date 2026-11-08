"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Pencil,
  ListChecks,
  CalendarDays,
  Clock,
  Utensils,
  Info,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { feedingService } from "@/lib/feedingService";
import { usePermissions } from "@/lib/usePermissions";

/* ----------------------------- helpers ----------------------------- */

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

function formatTime(value) {
  return value ? value.slice(0, 5) : "—";
}

function formatQuantity(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("es-CO", { maximumFractionDigits: 3 });
}

function parseLocalDate(value) {
  if (!value) return null;
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLongDate(value) {
  const date = parseLocalDate(value);
  if (!date) return value || "Sin fecha";
  const text = date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatShortDate(value) {
  const date = parseLocalDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function todayKey() {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

const STATUS_LABELS = {
  scheduled: "Programado",
  completed: "Completado",
  skipped: "Omitido",
  in_progress: "En curso",
  cancelled: "Cancelado",
};

const STATUS_STYLES = {
  scheduled: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  completed: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  skipped: { badge: "bg-rose-100 text-rose-700", dot: "bg-rose-500" },
  in_progress: { badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  cancelled: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
};

const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300";

/* ----------------------------- component ----------------------------- */

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
  const [statusFilter, setStatusFilter] = useState("all");
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  const isFinished = useMemo(() => {
    if (!plan) return false;
    if (plan.state === "finished") return true;
    if (plan.end_date) {
      return new Date(plan.end_date) < new Date();
    }
    return false;
  }, [plan]);

  const isInProgress = plan?.state === "in_progress";

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

  const unitSymbolById = useMemo(() => {
    return units.reduce((map, unit) => {
      map[String(unit.id)] = unit.symbol || unit.name;
      return map;
    }, {});
  }, [units]);

  /* ----------------------------- data loading ----------------------------- */

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

  /* ----------------------------- derived data ----------------------------- */

  const parseRanges = useMemo(() => {
    return ranges.filter((range) => {
      if (!plan) return true;
      if (range.id && plan.id && range.id.toString() === plan.id.toString()) return false;
      if (range.start_date === plan?.start_date && range.end_date === plan?.end_date) return false;
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

  const stats = useMemo(() => {
    const total = events.length;
    const completed = events.filter((e) => e.status === "completed").length;
    const skipped = events.filter((e) => e.status === "skipped" || e.status === "cancelled").length;
    const pending = total - completed - skipped;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, skipped, pending, progress };
  }, [events]);

  const durationDays = useMemo(() => {
    const start = parseLocalDate(plan?.start_date);
    const end = parseLocalDate(plan?.end_date);
    if (!start || !end) return null;
    return Math.round((end - start) / 86400000) + 1;
  }, [plan]);

  const filterOptions = useMemo(() => {
    const counts = events.reduce((acc, e) => {
      const key = e.status || "none";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([value, count]) => ({
      value,
      label: STATUS_LABELS[value] || "Sin estado",
      count,
    }));
  }, [events]);

  const groupedEvents = useMemo(() => {
    const filtered = events.filter((e) => statusFilter === "all" || (e.status || "none") === statusFilter);
    const sorted = [...filtered].sort((a, b) => {
      const da = `${a.date || ""} ${a.scheduled_time || ""}`;
      const db = `${b.date || ""} ${b.scheduled_time || ""}`;
      return da.localeCompare(db);
    });
    const map = new Map();
    sorted.forEach((e) => {
      const key = e.date || "sin-fecha";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    return Array.from(map.entries());
  }, [events, statusFilter]);

  const today = todayKey();

  /* ----------------------------- handlers ----------------------------- */

  const setField = (field, value) => {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openEventEditor = (event) => {
    setEditingEvent(event);
    setEditStatus(event.status || "");
    setActualQuantity("");
    setActualUnit("");
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
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? { ...e, ...updated } : e)));
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

  /* ----------------------------- render pieces ----------------------------- */

  const planBadge = isFinished
    ? { label: "Finalizado", className: "bg-rose-100 text-rose-700" }
    : isInProgress
    ? { label: "En curso", className: "bg-sky-100 text-sky-700" }
    : { label: "Programado", className: "bg-slate-100 text-slate-700" };

  const renderEvent = (event, idx) => {
    const style = STATUS_STYLES[event.status] || STATUS_STYLES.scheduled;
    const isDone = event.status === "completed";
    const actualSymbol = event.actual_unit != null ? unitSymbolById[String(event.actual_unit)] : "";

    return (
      <li
        key={event.id ?? idx}
        className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm"
      >
        <div className="flex w-16 shrink-0 flex-col items-center">
          <span className="text-lg font-bold tabular-nums text-slate-900">{formatTime(event.scheduled_time)}</span>
          <span className="text-[11px] uppercase tracking-wide text-slate-400">
            {event.ration_number != null ? `Ración ${event.ration_number}` : "—"}
          </span>
        </div>

        <span className={`h-10 w-1 shrink-0 rounded-full ${style.dot}`} aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {event.title || event.description || `Evento #${event.id ?? idx + 1}`}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
            <span>
              Planificado:{" "}
              <span className="font-medium text-slate-700">{formatQuantity(event.planned_quantity)}</span>
            </span>
            {isDone && (
              <span>
                Real:{" "}
                <span className="font-medium text-emerald-700">
                  {formatQuantity(event.actual_quantity)} {actualSymbol}
                </span>
              </span>
            )}
            {event.completed_by && <span>Por {event.completed_by}</span>}
            {event.completed_at && <span>{event.completed_at}</span>}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style.badge}`}>
            {event.status ? STATUS_LABELS[event.status] || event.status : "Sin estado"}
          </span>
          {canManage && (
            <button
              type="button"
              title="Editar estado"
              onClick={() => openEventEditor(event)}
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </li>
    );
  };

  /* ----------------------------- render ----------------------------- */

  return (
    <>
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <Toaster position="top-center" />

        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div>
            <Link
              href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/alimentacion`}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Volver a planes
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Plan de alimentación #{planId}
              </h1>
              {plan && (
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planBadge.className}`}>
                  {planBadge.label}
                </span>
              )}
              {plan?.deleted_at && (
                <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                  Archivado
                </span>
              )}
            </div>
            {plan && (
              <p className="mt-2 flex flex-wrap items-center gap-x-2 text-slate-600">
                <CalendarDays className="h-4 w-4" />
                {formatShortDate(plan.start_date)} → {formatShortDate(plan.end_date)}
                {durationDays != null && <span className="text-slate-400">· {durationDays} días</span>}
                <span className="text-slate-400">· {getCycleLabel()}</span>
              </p>
            )}
          </div>

          {loading && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center gap-3 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" /> Cargando plan...
              </div>
            </div>
          )}

          {loadError && !loading && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5" />
                <div>{loadError}</div>
              </div>
            </div>
          )}

          {!loading && !loadError && plan && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* ------------------- MAIN: events ------------------- */}
              <main className="space-y-4">
                {/* Progress */}
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-slate-900">
                      <ListChecks className="h-5 w-5" />
                      <h2 className="text-xl font-semibold">Eventos de alimentación</h2>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{stats.progress}%</span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${stats.progress}%` }}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Total", value: stats.total, tone: "text-slate-900" },
                      { label: "Completados", value: stats.completed, tone: "text-emerald-600" },
                      { label: "Pendientes", value: stats.pending, tone: "text-sky-600" },
                      { label: "Omitidos", value: stats.skipped, tone: "text-rose-600" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-xs text-slate-500">{item.label}</p>
                        <p className={`text-2xl font-bold tabular-nums ${item.tone}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Filters */}
                {events.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {[{ value: "all", label: "Todos", count: events.length }, ...filterOptions].map((opt) => {
                      const active = statusFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setStatusFilter(opt.value)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                            active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label} <span className={active ? "text-slate-300" : "text-slate-400"}>{opt.count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {eventsLoading && (
                  <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-8 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" /> Cargando eventos...
                  </div>
                )}

                {!eventsLoading && eventError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> {eventError}
                    </div>
                  </div>
                )}

                {!eventsLoading && !eventError && events.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                    <Utensils className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    No hay eventos registrados para este plan.
                  </div>
                )}

                {/* Events grouped by day */}
                {!eventsLoading && !eventError && groupedEvents.length > 0 && (
                  <div className="space-y-6">
                    {groupedEvents.map(([date, dayEvents]) => {
                      const done = dayEvents.filter((e) => e.status === "completed").length;
                      const isToday = date === today;
                      return (
                        <section key={date}>
                          <div className="mb-2 flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-slate-800">{formatLongDate(date)}</h3>
                              {isToday && (
                                <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                                  Hoy
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {done}/{dayEvents.length} completados
                            </span>
                          </div>
                          <ul className="space-y-2">{dayEvents.map(renderEvent)}</ul>
                        </section>
                      );
                    })}
                  </div>
                )}

                {!eventsLoading && !eventError && events.length > 0 && groupedEvents.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
                    No hay eventos con este estado.
                  </div>
                )}
              </main>

              {/* ------------------- ASIDE: plan summary + edit ------------------- */}
              <aside className="space-y-4 lg:sticky lg:top-6">
                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900">Plan</h2>

                  <dl className="mt-4 divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-slate-500">Cronograma</dt>
                      <dd className="text-right font-semibold text-slate-900">
                        {getScheduleLabel(plan?.feeding_schedule || plan?.feeding_schedule_name)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-slate-500">Ciclo</dt>
                      <dd className="text-right font-semibold text-slate-900">{getCycleLabel()}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-slate-500">Inicio</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{plan.start_date || "—"}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <dt className="text-slate-500">Fin</dt>
                      <dd className="font-semibold tabular-nums text-slate-900">{plan.end_date || "—"}</dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Pencil className="h-4 w-4" /> Editar plan
                  </h2>

                  {isFinished ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                      Este plan ya finalizó y no puede modificarse.
                    </div>
                  ) : isInProgress ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      El plan está en curso: solo la fecha de fin es editable.
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Todos los campos son obligatorios.</p>
                  )}

                  <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
                    <Field>
                      <FieldLabel>Cronograma</FieldLabel>
                      <Select
                        value={form.feeding_schedule || undefined}
                        onValueChange={(value) => setField("feeding_schedule", value === "__NONE__" ? "" : value)}
                        disabled={!canManage || isInProgress || isFinished}
                      >
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

                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel>Inicio</FieldLabel>
                        <Input
                          type="date"
                          value={form.start_date}
                          onChange={(event) => setField("start_date", event.target.value)}
                          disabled={!canManage || isInProgress || isFinished}
                        />
                        <FieldError errors={normalizeFieldErrors(errors.start_date)} />
                      </Field>

                      <Field>
                        <FieldLabel>Fin</FieldLabel>
                        <Input
                          type="date"
                          value={form.end_date}
                          onChange={(event) => setField("end_date", event.target.value)}
                          disabled={!canManage || isFinished}
                        />
                        <FieldError errors={normalizeFieldErrors(errors.end_date)} />
                      </Field>
                    </div>

                    {conflictMessage && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                        {conflictMessage}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button variant="outline" type="button" className="flex-1" onClick={() => window.location.reload()}>
                        Recargar
                      </Button>
                      <Button type="submit" className="flex-1" disabled={!canManage || isFinished || saving}>
                        {saving ? "Guardando…" : "Guardar"}
                      </Button>
                    </div>
                  </form>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>

      {/* ------------------- Event status modal ------------------- */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">Actualizar evento</h2>

            <div className="mt-3 flex items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {editingEvent.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatTime(editingEvent.scheduled_time)}
              </span>
              <span className="ml-auto text-slate-400">#{editingEvent.id}</span>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    setEditStatus(e.target.value);
                    setActualQuantity("");
                    setActualUnit("");
                  }}
                  className={selectClass}
                >
                  <option value="">Selecciona un estado</option>
                  {eventStatusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {STATUS_LABELS[opt.value] || opt.value}
                    </option>
                  ))}
                </select>
              </div>

              {editStatus === "completed" && (
                <div className="grid grid-cols-2 gap-3">
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
                      className={selectClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Unidad <span className="text-rose-500">*</span>
                    </label>
                    <select value={actualUnit} onChange={(e) => setActualUnit(e.target.value)} className={selectClass}>
                      <option value="">Selecciona</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingEvent(null)} disabled={savingEvent}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEventStatus}
                disabled={savingEvent || !editStatus || (editStatus === "completed" && (!actualQuantity || !actualUnit))}
              >
                {savingEvent ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
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