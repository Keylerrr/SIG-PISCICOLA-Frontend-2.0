"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ListFilter } from "lucide-react";
import { toast } from "sonner";
import { MonitoringStatsCards } from "./MonitoringStatsCards";
import { MonitoringCharts } from "./MonitoringCharts";
import { BiometricsSamplingForm } from "./BiometricsSamplingForm";
import { useMonitoringData } from "@/hooks/useMonitoringData";
import {
  resetControlStatsFetchAudit,
  getControlStatsFetchCount,
} from "@/lib/monitoringService";
import { apiFetchJsonSafe } from "@/lib/apiClient";
import { assertPathSegment } from "@/lib/apiConfig";
import { useAuthReady } from "@/hooks/useAuthReady";

export function MonitoringSection({ farmId, pondId, cycleId }) {
    const [evaluations, setEvaluations] = useState([]);
    const [evaluationsLoading, setEvaluationsLoading] = useState(true);
    const [evaluationsError, setEvaluationsError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const { authReady, hasToken } = useAuthReady();

    useEffect(() => {
        resetControlStatsFetchAudit();
    }, [farmId, pondId, cycleId]);

    const {
        currentState,
        latestBiomassGainKg,
        chartSeries,
        isLoading: monitoringLoading,
        currentStateError,
        controlStatsError,
        chartsIsEmpty,
    } = useMonitoringData(farmId, pondId, cycleId, refreshKey);

    useEffect(() => {
        if (!monitoringLoading && typeof window !== "undefined") {
            console.log(
                `[Monitoring AUDIT] carga completada | control-stats HTTP en esta sesión: ${getControlStatsFetchCount()}`
            );
        }
    }, [monitoringLoading, refreshKey]);

    const fetchEvaluations = useCallback(async () => {
        if (!authReady || !hasToken || !farmId || !pondId || !cycleId) return;

        setEvaluationsLoading(true);
        setEvaluationsError(null);

        try {
            assertPathSegment(farmId, "farmId");
            assertPathSegment(pondId, "pondId");
            assertPathSegment(cycleId, "cycleId");

            const result = await apiFetchJsonSafe(
                `/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/fish-evaluations/`,
                { source: "MonitoringSection.fetchEvaluations" }
            );

            if (result.skipped) return;

            if (result.error) {
                throw result.error;
            }

            const evalsList = Array.isArray(result.data) ? result.data : [];
            evalsList.sort(
                (a, b) => new Date(b.evaluation_date) - new Date(a.evaluation_date)
            );
            setEvaluations(evalsList);
        } catch (err) {
            console.error("Error fetching evaluations:", err);
            setEvaluationsError(
                err.message || "Error al cargar las evaluaciones."
            );
            setEvaluations([]);
        } finally {
            setEvaluationsLoading(false);
        }
    }, [authReady, hasToken, farmId, pondId, cycleId]);

    useEffect(() => {
        fetchEvaluations();
    }, [fetchEvaluations, refreshKey]);

    const handleFormSuccess = () => {
        setIsModalOpen(false);
        toast.success("Evaluación registrada con éxito. Las métricas se han actualizado.");
        setRefreshKey((k) => k + 1);
        fetchEvaluations();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Monitoreo</h2>
                    <p className="text-sm text-slate-500">Métricas actuales y registro de muestreos biométricos</p>
                </div>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 w-full sm:w-auto">
                            <Plus className="w-4 h-4" />
                            <span>Registrar Muestreo</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl">Nuevo Muestreo Biométrico</DialogTitle>
                        </DialogHeader>
                        <BiometricsSamplingForm
                            farmId={farmId}
                            pondId={pondId}
                            cycleId={cycleId}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            <MonitoringStatsCards
                currentState={currentState}
                latestBiomassGainKg={latestBiomassGainKg}
                isLoading={monitoringLoading}
                error={currentStateError}
            />

            <MonitoringCharts
                chartSeries={chartSeries}
                isLoading={monitoringLoading}
                error={controlStatsError}
                isEmpty={chartsIsEmpty}
            />

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-8">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-800 font-medium">
                    <ListFilter className="w-4 h-4 text-slate-500" />
                    Últimas Evaluaciones
                </div>

                {evaluationsError && (
                    <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-100">
                        {evaluationsError}
                    </div>
                )}

                {evaluationsLoading ? (
                    <div className="p-8 text-center text-slate-400">Cargando evaluaciones...</div>
                ) : evaluations.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic">No hay evaluaciones registradas en este ciclo.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Fecha</th>
                                    <th className="px-6 py-3 font-medium">Muestra</th>
                                    <th className="px-6 py-3 font-medium">Mortalidad</th>
                                    <th className="px-6 py-3 font-medium">Peso Prom. (g)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {evaluations.slice(0, 5).map((ev) => (
                                    <tr key={ev.id || ev.evaluation_date} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {ev.evaluation_date}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {ev.sampled_quantity} peces
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <span className={ev.mortality_quantity > 0 ? "text-red-600 font-medium" : ""}>
                                                {ev.mortality_quantity} peces
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {ev.avg_weight_g} g
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
