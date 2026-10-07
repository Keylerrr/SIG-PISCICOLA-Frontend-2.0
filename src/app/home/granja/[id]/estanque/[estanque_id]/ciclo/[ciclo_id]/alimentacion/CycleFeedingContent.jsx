"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { feedingService } from "@/lib/feedingService";
import { usePermissions } from "@/lib/usePermissions";
import { FeedingPlanForm } from "@/app/components/feeding/feeding_plan_form";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const STATE_COLORS = {
  scheduled: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-100 text-blue-700",
  finished: "bg-green-100 text-green-700",
  archived: "bg-rose-100 text-rose-700",
};

const STATE_LABELS = {
  scheduled: "Programado",
  in_progress: "En curso",
  finished: "Finalizado",
  archived: "Archivado",
};

export default function CycleFeedingContent({
  farmId,
  pondId,
  cycleId,
  cycleName: initialCycleName = "",
  showBackLink = false,
}) {
  const [plans, setPlans] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [cycleName, setCycleName] = useState("");
  const displayName = initialCycleName || cycleName;
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const permissions = usePermissions(farmId);

  const canManage = permissions.canManageCycle;

  const fetchPlans = useCallback(async () => {
    if (!farmId || !pondId || !cycleId) return;
    setLoading(true);
    try {
      const [plansData, schedulesData] = await Promise.all([
        feedingService.getCycleFeedingPlans(farmId, pondId, cycleId),
        feedingService.getFeedingSchedules(farmId),
      ]);

      const allPlans = Array.isArray(plansData) ? plansData : [];
      setPlans(allPlans.filter((p) => p.deleted_at === null || p.deleted_at === undefined));
      setScheduleMap(
        Array.isArray(schedulesData)
          ? schedulesData.reduce((map, schedule) => {
              if (schedule?.id != null) {
                map[schedule.id.toString()] =
                  schedule.name || schedule.title || `Cronograma #${schedule.id}`;
              }
              return map;
            }, {})
          : {}
      );
    } catch (error) {
      if (error?.status === 404) {
        setPlans([]);
        return;
      }
      console.error("Error cargando planes de alimentación:", error);
    } finally {
      setLoading(false);
    }
  }, [farmId, pondId, cycleId]);

  useEffect(() => {
    if (initialCycleName || !farmId || !pondId || !cycleId) return;
    const loadCycleName = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;
      try {
        const response = await fetch(
          `${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) return;
        const data = await response.json();
        setCycleName(data.name || "");
      } catch (error) {
        console.error("Error cargando nombre del ciclo:", error);
      }
    };
    loadCycleName();
  }, [farmId, pondId, cycleId, initialCycleName]);

  useEffect(() => {
    if (permissions.loading) return;
    if (!permissions.isFarmMember && !permissions.canManageCycle && !permissions.isAdmin) return;
    fetchPlans();
  }, [fetchPlans, permissions.loading, permissions.isFarmMember, permissions.canManageCycle, permissions.isAdmin]);

  const getScheduleLabel = (plan) => {
    const key = plan?.feeding_schedule?.toString();
    return (
      plan?.feeding_schedule_name ||
      (key ? scheduleMap[key] : undefined) ||
      plan?.feeding_schedule ||
      "—"
    );
  };

  const getCycleLabel = (plan) =>
    plan?.cycle_name || cycleName || plan?.cycle || "—";

  const handleDelete = async () => {
    if (!planToDelete) return;
    setDeleting(true);
    try {
      await feedingService.deleteFeedingPlan(farmId, pondId, cycleId, planToDelete.id);
      toast.success(`Plan #${planToDelete.id} eliminado correctamente.`);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar el plan.");
    } finally {
      setDeleting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          {showBackLink && (
            <Link
              href={`/home/granja/${farmId}/estanque/${pondId}/ciclo/${cycleId}/`}
              className="text-slate-600 hover:text-slate-800 inline-flex items-center gap-2 mb-3 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al ciclo
            </Link>
          )}
          <h2 className="text-xl font-bold text-slate-900">Planes de alimentación</h2>
          {cycleName && (
            <p className="text-slate-600 mt-1 text-sm">
              Ciclo: <span className="font-medium">{cycleName}</span>
            </p>
          )}
          <p className="text-slate-500 text-sm mt-0.5">
            Planes asociados al ciclo del estanque.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && (
            <Button
              onClick={() => setShowCreate((prev) => !prev)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" /> Nuevo plan
            </Button>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Crear plan de alimentación</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Registra un plan nuevo y valida solapamientos para este ciclo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
              Cerrar
            </Button>
          </div>
          <FeedingPlanForm
            farmId={farmId}
            pondId={pondId}
            cycleId={cycleId}
            onSuccess={() => {
              setShowCreate(false);
              fetchPlans();
            }}
          />
        </div>
      )}

      {loading && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex justify-center items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Cargando planes...
          </div>
        </div>
      )}

      {!loading && plans.length === 0 && (
        <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm border border-slate-100">
          No hay planes de alimentación activos para este ciclo.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-slate-900">Plan #{plan.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">Cronograma:</span> {getScheduleLabel(plan)}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">Inicio:</span> {plan.start_date || "—"}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">Fin:</span> {plan.end_date || "—"}
              </p>
              <p className="text-slate-600">
                <span className="font-medium text-slate-700">Ciclo:</span> {getCycleLabel(plan)}
              </p>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_COLORS[plan.state] || "bg-slate-100 text-slate-700"}`}
              >
                {STATE_LABELS[plan.state] || plan.state || "Desconocido"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/home/granja/${farmId}/estanque/${pondId}/ciclo/${cycleId}/alimentacion/${plan.id}`}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Ver plan
                </Link>
                <Link
                  href={`/home/granja/${farmId}/alimentacion/${plan.feeding_schedule}/`}
                  className="text-blue-600 hover:underline text-xs font-medium"
                >
                  Ver cronograma
                </Link>
                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="inline-flex items-center gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs h-8"
                    onClick={() => setPlanToDelete(plan)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-800">¿Eliminar plan de alimentación?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Estás a punto de eliminar el <span className="font-semibold">Plan #{planToDelete.id}</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setPlanToDelete(null)}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Eliminando...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (showBackLink) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="max-w-6xl mx-auto">{content}</div>
      </div>
    );
  }

  return content;
}
