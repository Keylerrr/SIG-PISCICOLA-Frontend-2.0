"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
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

export default function CycleFeeding({ params }) {
  const { id, estanque_id, ciclo_id } = use(params);
  const [plans, setPlans] = useState([]);
  const [scheduleMap, setScheduleMap] = useState({});
  const [cycleName, setCycleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const permissions = usePermissions(id);

  const canManage = permissions.canManageCycle;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [plansData, schedulesData] = await Promise.all([
        feedingService.getCycleFeedingPlans(id, estanque_id, ciclo_id),
        feedingService.getFeedingSchedules(id),
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
      if (error.status === 404) {
        setPlans([]);
        return;
      }
      console.error("Error cargando planes de alimentación:", error);
    } finally {
      setLoading(false);
    }
  }, [id, ciclo_id]);

  useEffect(() => {
    if (!id || !estanque_id || !ciclo_id) return;
    const loadCycleName = async () => {
      const token = localStorage.getItem("access");
      if (!token) return;
      try {
        // Use pond-scoped endpoint
        const response = await fetch(
          `${API_BASE}/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/`,
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
  }, [id, estanque_id, ciclo_id]);

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
      await feedingService.deleteFeedingPlan(id, estanque_id, ciclo_id, planToDelete.id);
      toast.success(`Plan #${planToDelete.id} eliminado correctamente.`);
      setPlanToDelete(null);
      fetchPlans();
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar el plan.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {/* Updated back link points to pond-scoped ciclo detail */}
            <Link
              href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/`}
              className="text-slate-600 hover:text-slate-800 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" /> Volver al ciclo
            </Link>
            <h1 className="mt-4 text-4xl font-bold">Planes de alimentación</h1>
            {cycleName && (
              <p className="text-slate-600 mt-1">
                Ciclo: <span className="font-medium">{cycleName}</span>
              </p>
            )}
            <p className="text-slate-500 text-sm mt-1">
              Planes asociados al ciclo del estanque.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canManage && (
              <Button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Nuevo plan
              </Button>
            )}
          </div>
        </div>

        {loading && (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex justify-center gap-3 text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando planes...
            </div>
          </div>
        )}

        {!loading && plans.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center text-slate-600 shadow-sm">
            No hay planes de alimentación activos para este ciclo.
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-2xl font-semibold">Plan #{plan.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-slate-600">
                  Cronograma: {getScheduleLabel(plan)}
                </p>
                <p className="text-sm text-slate-600">Inicio: {plan.start_date || "—"}</p>
                <p className="text-sm text-slate-600">Fin: {plan.end_date || "—"}</p>
                <p className="text-sm text-slate-600">Ciclo: {getCycleLabel(plan)}</p>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${STATE_COLORS[plan.state] || "bg-slate-100 text-slate-700"}`}
                >
                  {STATE_LABELS[plan.state] || plan.state || "Desconocido"}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Updated plan detail link to use pond-scoped path */}
                  <Link
                    href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/alimentacion/${plan.id}`}
                    className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver plan
                  </Link>
                  <Link
                    href={`/home/granja/${id}/alimentacion/${plan.feeding_schedule}/`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver cronograma
                  </Link>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="inline-flex items-center gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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

        {showCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Crear plan de alimentación</h2>
                <p className="text-slate-600">
                  Registra un plan nuevo y valida solapamientos para este ciclo.
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cerrar
              </Button>
            </div>
            <FeedingPlanForm
              farmId={id}
              pondId={estanque_id}
              cycleId={ciclo_id}
              onSuccess={() => {
                setShowCreate(false);
                fetchPlans();
              }}
            />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
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
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Eliminando...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" />Eliminar</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
