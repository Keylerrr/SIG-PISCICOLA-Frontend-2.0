"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, ChevronRight, Layers, ListChecks, Calendar, AlertCircle, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "sonner";
import { feedingService } from "@/lib/feedingService";
import { usePermissions } from "@/lib/usePermissions";

const STATE_LABELS = {
  in_progress: "En curso",
  paused: "Pausado",
  finished: "Finalizado",
  archived: "Archivado",
  scheduled: "Programado",
};

const STATUS_LABELS = {
  scheduled: "Programado",
  completed: "Completado",
  skipped: "Omitido",
  in_progress: "En curso",
  cancelled: "Cancelado",
};

const STATE_COLORS = {
  in_progress: "bg-blue-100 text-blue-700",
  paused: "bg-yellow-100 text-yellow-700",
  finished: "bg-green-100 text-green-700",
  archived: "bg-rose-100 text-rose-700",
  scheduled: "bg-slate-100 text-slate-700",
};

export default function ScheduleDetail({ params }) {
  const { id, scheduleId } = use(params);
  const [versions, setVersions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventError, setEventError] = useState(null);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  useEffect(() => {
    if (permissions.loading) return;
    if (!permissions.isFarmMember && !permissions.canManageCycle && !permissions.isAdmin) {
      setLoading(false);
      setLoadingError("No tienes permisos para ver este cronograma.");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setLoadingError(null);

      try {
        const [versionData, planData, speciesData] = await Promise.all([
          feedingService.getScheduleVersions(id, scheduleId),
          feedingService.getScheduleFeedingPlans(id, scheduleId),
          fetch("https://backend-pongase-trucha.onrender.com/api/species/", {
            headers: { Authorization: `Bearer ${localStorage.getItem("access")}` },
          }),
        ]);

        const versionList = Array.isArray(versionData) ? versionData : [];
        setVersions(versionList.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        setPlans(Array.isArray(planData) ? planData : []);

        if (speciesData.ok) {
          const speciesJson = await speciesData.json();
          setSpecies(Array.isArray(speciesJson) ? speciesJson : []);
        }
      } catch (error) {
        if (error.status === 401) {
          window.location.href = "/login";
          return;
        }

        if (error.status === 404) {
          setPlans([]);
          setVersions([]);
          return;
        }

        setLoadingError(error.message || "Error cargando detalle del cronograma.");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, permissions.loading, permissions.isFarmMember, permissions.canManageCycle, permissions.isAdmin, scheduleId]);

  const speciesById = useMemo(() => {
    return species.reduce((map, specie) => {
      if (specie?.id != null) {
        map[specie.id.toString()] = specie.name || specie.label || "";
      }
      return map;
    }, {});
  }, [species]);

  const getSpeciesLabel = (version) => {
    if (!version) return "—";
    if (version.specie_name) return version.specie_name;
    if (typeof version.specie === "object" && version.specie?.name) return version.specie.name;
    const specieKey = version.specie != null ? version.specie.toString() : "";
    return speciesById[specieKey] || version.specie || "—";
  };

  const handleSelectPlan = async (plan) => {
    if (selectedPlan?.id === plan.id) {
      setSelectedPlan(null);
      setEvents([]);
      setEventError(null);
      return;
    }

    setSelectedPlan(plan);
    setEvents([]);
    setEventError(null);
    setEventsLoading(true);

    try {
      const planEvents = await feedingService.getFeedingEvents(id, scheduleId, plan.id);
      setEvents(Array.isArray(planEvents) ? planEvents : []);
    } catch (error) {
      if (error.status === 404) {
        setEventError("No se encontró información de eventos para este plan.");
        setEvents([]);
      } else {
        setEventError("Error cargando eventos del plan.");
        console.error(error);
      }
    } finally {
      setEventsLoading(false);
    }
  };

  const renderEventItem = (event) => {
    return (
      <div key={event.id ?? Math.random()} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-slate-900">{event.title || event.description || `Evento #${event.id || event.pk}`}</p>
          <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
            event.status === "completed" ? "bg-green-100 text-green-700" :
            event.status === "missed" ? "bg-rose-100 text-rose-700" :
            event.status === "in_progress" ? "bg-blue-100 text-blue-700" :
            event.status === "cancelled" ? "bg-orange-100 text-orange-700" :
            "bg-slate-100 text-slate-700"
          }`}>
            {event.status ? STATUS_LABELS[event.status] || event.status : "Sin estado"}
          </span>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          {event.date && <p><strong>Fecha:</strong> {event.date}</p>}
          {event.scheduled_time && <p><strong>Hora:</strong> {event.scheduled_time}</p>}
          {event.ration_number != null && <p><strong>Ración #:</strong> {event.ration_number}</p>}
          {event.planned_quantity != null && <p><strong>Cantidad planificada:</strong> {event.planned_quantity}</p>}
          {event.actual_quantity != null && <p><strong>Cantidad real:</strong> {event.actual_quantity}</p>}
          {event.completed_at && <p><strong>Completado:</strong> {event.completed_at}</p>}
          {event.pond_name && <p><strong>Estanque:</strong> {event.pond_name}</p>}
          {event.pond && !event.pond_name && <p><strong>Estanque:</strong> {typeof event.pond === "object" ? event.pond.name : event.pond}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" />

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-slate-600">
              <Link href={`/home/granja/${id}/alimentacion`} className="inline-flex items-center gap-2 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" /> Volver a alimentación
              </Link>
              <span className="text-slate-400">/</span>
              <span className="text-slate-700 font-semibold">Cronograma #{scheduleId}</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold">Detalle del cronograma</h1>
            <p className="text-slate-600 mt-2">Historial de versiones y planes de alimentación asociados.</p>
          </div>
        </div>

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando detalle...
            </div>
          </div>
        )}

        {loadingError && !loading && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5" />
              <div>{loadingError}</div>
            </div>
          </div>
        )}

        {!loading && !loadingError && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 text-slate-900">
                <Layers className="h-5 w-5" />
                <h2 className="text-2xl font-semibold">Historial de versiones</h2>
              </div>
              <p className="mt-2 text-slate-600">Cadena histórica completa del cronograma. Solo lectura.</p>

              {versions.length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600">
                  No hay versiones disponibles para este cronograma.
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {versions.map((version) => (
                    <Card key={version.id} className="border-slate-200 shadow-none">
                      <CardHeader>
                        <CardTitle className="text-lg font-semibold">{version.name || `Versión #${version.id}`}</CardTitle>
                        <p className="text-sm text-slate-600">Creado: {version.created_at || "—"}</p>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm text-slate-700">
                        <p>Tipo: {version.type || "—"}</p>
                        <p>Especie: {getSpeciesLabel(version)}</p>
                        {version.parent && <p>Padre: #{version.parent}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-slate-900">
                  <ListChecks className="h-5 w-5" />
                  <h2 className="text-2xl font-semibold">Planes de alimentación asociados</h2>
                </div>
                <button
                  onClick={() => setShowArchived((prev) => !prev)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    showArchived
                      ? "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  {showArchived ? "Ocultar archivados" : "Mostrar archivados"}
                  {!showArchived && plans.filter((p) => p.deleted_at !== null && p.deleted_at !== undefined).length > 0 && (
                    <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      {plans.filter((p) => p.deleted_at !== null && p.deleted_at !== undefined).length}
                    </span>
                  )}
                </button>
              </div>
              <p className="mt-2 text-slate-600">Lista de planes que usan este cronograma.</p>

              {plans.filter((p) => showArchived || (p.deleted_at === null || p.deleted_at === undefined)).length === 0 ? (
                <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600">
                  {plans.length === 0
                    ? "No se encontraron planes asociados."
                    : "No hay planes activos. Activa \"Mostrar archivados\" para verlos."}
                </div>
              ) : (
                <div className="mt-6 grid gap-4">
                  {plans
                    .filter((p) => showArchived || (p.deleted_at === null || p.deleted_at === undefined))
                    .map((plan) => (
                    <Card key={plan.id} className="border-slate-200 shadow-none">
                      <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold">Plan #{plan.id}</CardTitle>
                            <p className="text-sm text-slate-600">Ciclo: {plan.cycle || "—"}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_COLORS[plan.state] || "bg-slate-100 text-slate-700"}`}>
                              {STATE_LABELS[plan.state] || plan.state || "Desconocido"}
                            </span>
                            <Button variant="outline" size="sm" onClick={() => handleSelectPlan(plan)}>
                              {selectedPlan?.id === plan.id ? "Ocultar eventos" : "Ver eventos"}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-2 text-sm text-slate-700">
                        <p>Inicio: {plan.start_date || "—"}</p>
                        <p>Fin: {plan.end_date || "—"}</p>
                        <p>Archivado: {plan.deleted_at ? "Sí" : "No"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {selectedPlan && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3 text-slate-900">
                  <AlertCircle className="h-5 w-5" />
                  <h2 className="text-2xl font-semibold">Eventos del plan #{selectedPlan.id}</h2>
                </div>
                {eventsLoading ? (
                  <div className="mt-6 flex items-center justify-center gap-3 text-slate-600">
                    <Loader2 className="h-5 w-5 animate-spin" /> Cargando eventos...
                  </div>
                ) : eventError ? (
                  <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
                    {eventError}
                  </div>
                ) : events.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-slate-600">
                    No hay eventos disponibles para este plan.
                  </div>
                ) : (
                  <div className="mt-6 grid gap-4">
                    {events.map(renderEventItem)}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
