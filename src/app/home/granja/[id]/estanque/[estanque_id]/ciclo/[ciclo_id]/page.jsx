"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
    ArrowLeft,
    Loader2,
    Calendar,
    CalendarX,
    Fish,
    ClipboardList,
    Map,
    CheckCircle2,
    Clock,
    XCircle,
    Pause,
    Layers,
    Stethoscope,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { Batches } from "@/app/components/batches/batches";
import { MonitoringSection } from "@/app/components/monitoring/MonitoringSection";
import { HarvestModal } from "@/app/components/harvest/HarvestModal";
import { HarvestHistorySection } from "@/app/components/harvest/HarvestHistorySection";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const STATE_LABELS = {
    in_progress: "En Ejecución",
    paused: "Pausado",
    finished: "Completado",
    cancelled: "Cancelado",
};

const STATE_COLORS = {
    in_progress: "bg-blue-100 text-blue-700 border border-blue-200",
    paused: "bg-yellow-100 text-yellow-700 border border-yellow-200",
    finished: "bg-green-100 text-green-700 border border-green-200",
    cancelled: "bg-red-100 text-red-700 border border-red-200",
};

const STATE_ICONS = {
    in_progress: <Clock className="w-4 h-4" />,
    paused: <Pause className="w-4 h-4" />,
    finished: <CheckCircle2 className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
};

export default function CicloDetalle() {
    const { ciclo_id, estanque_id, id } = useParams();
    const [ciclo, setCiclo] = useState(null);
    const [estanque, setEstanque] = useState(null);
    const [species, setSpecies] = useState([]);
    const [productionPlans, setProductionPlans] = useState([]);
    const [error, setError] = useState(null);
    const [harvestModalOpen, setHarvestModalOpen] = useState(false);
    const [harvestHistoryRefresh, setHarvestHistoryRefresh] = useState(0);
    const router = useRouter();

    const fetchData = useCallback(async () => {
        if (!id || !estanque_id || !ciclo_id) return;

        try {
            const token = localStorage.getItem("access");
            const headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            };

            // Fetch ciclo (pond-scoped endpoint)
            const resCiclo = await fetch(
                `${API_BASE}/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/`,
                { method: "GET", headers }
            );
            if (!resCiclo.ok) {
                const errorData = await resCiclo.clone().json().catch(() => ({}));
                throw new Error(
                    errorData.detail ||
                        errorData.message ||
                        `Error ${resCiclo.status} al obtener el ciclo`
                );
            }
            const dataCiclo = await resCiclo.json();
            setCiclo(dataCiclo);

            // Fetch pond info for context
            const resPond = await fetch(
                `${API_BASE}/farms/${id}/ponds/${estanque_id}/`,
                { method: "GET", headers }
            );
            if (resPond.ok) {
                setEstanque(await resPond.json());
            }

            // Fetch species for label resolution
            const resSpecies = await fetch(`${API_BASE}/species/`, { headers });
            if (resSpecies.ok) {
                const dataSpecies = await resSpecies.json();
                setSpecies(Array.isArray(dataSpecies) ? dataSpecies : []);
            }

            // Fetch production plans
            const resPlans = await fetch(
                `${API_BASE}/farms/${id}/production-plans/`,
                { headers }
            );

            if (resPlans.ok) {
                const dataPlans = await resPlans.json();
                setProductionPlans(Array.isArray(dataPlans) ? dataPlans : []);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    }, [id, estanque_id, ciclo_id]);

    const handleHarvestSuccess = useCallback(() => {
        fetchData();
        setHarvestHistoryRefresh((n) => n + 1);
        router.refresh();
    }, [fetchData, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const specieName = ciclo?.specie
        ? species.find((s) => s.id === ciclo.specie)?.name || `Especie #${ciclo.specie}`
        : null;

    const productionPlanName = ciclo?.production_plan
        ? productionPlans.find((p) => p.id === ciclo.production_plan)?.name ||
        `Plan #${ciclo.production_plan}`
        : null;

    return (
        <div className="min-h-screen bg-slate-50">
            <Toaster position="top-center" richColors />
            <HarvestModal
                open={harvestModalOpen}
                onOpenChange={setHarvestModalOpen}
                ciclo={ciclo}
                farmId={id}
                pondId={estanque_id}
                cycleId={ciclo_id}
                onSuccess={handleHarvestSuccess}
            />
            {/* Loading overlay */}
            {!ciclo && !error && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <p className="mt-4 font-medium text-slate-700">
                            Cargando información del ciclo...
                        </p>
                    </div>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
                        <p className="font-semibold">Error al cargar el ciclo</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
                {/* Back button */}
                <Link
                    href={`/home/granja/${id}/estanque/${estanque_id}/`}
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Estanque
                </Link>
            </div>

            {ciclo && (
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto space-y-6">
                        {/* Pond context banner */}
                        {estanque && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-blue-700">
                                <Map className="w-4 h-4 shrink-0" />
                                <span>
                                    Ciclo del estanque{" "}
                                    <span className="font-bold">{estanque.name}</span>
                                    {estanque.code && (
                                        <span className="ml-2 text-blue-500">({estanque.code})</span>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Cycle header card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{ciclo.name}</h1>
                                    {ciclo.comments?.length > 0 && (
                                        <p className="mt-2 text-slate-500 italic">"{ciclo.comments}"</p>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 shrink-0">
                                    <div
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${STATE_COLORS[ciclo.state] || "bg-gray-100 text-gray-700"}`}
                                    >
                                        {STATE_ICONS[ciclo.state]}
                                        {STATE_LABELS[ciclo.state] || ciclo.state}
                                    </div>
                                    {ciclo.state === "in_progress" && (
                                        <>
                                            <Link
                                                href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/alimentacion`}
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                            >
                                                <Layers className="w-4 h-4" />
                                                Planes de Alimentación
                                            </Link>
                                            <Link
                                                href={`/home/granja/${id}/estanque/${estanque_id}/ciclo/${ciclo_id}/salud`}
                                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                                            >
                                                <Stethoscope className="w-4 h-4" />
                                                Salud y Tratamientos
                                            </Link>
                                            <button
                                                onClick={() => setHarvestModalOpen(true)}
                                                className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                                            >
                                                <Fish className="w-4 h-4" />
                                                Terminar ciclo y cosechar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Info grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
                                    <span className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" /> Fecha de Inicio
                                    </span>
                                    <span className="font-bold text-slate-800">
                                        {ciclo.start_date || "No especificada"}
                                    </span>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
                                    <span className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                        <CalendarX className="w-3.5 h-3.5" /> Fin Estimado
                                    </span>
                                    <span className="font-bold text-slate-800">
                                        {ciclo.estimated_finish_date || "No especificada"}
                                    </span>
                                </div>

                                {ciclo.finish_date && (
                                    <div className="bg-green-50 p-4 rounded-xl flex flex-col gap-1">
                                        <span className="text-xs text-green-600 uppercase tracking-wide flex items-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Fecha Finalización
                                        </span>
                                        <span className="font-bold text-green-800">{ciclo.finish_date}</span>
                                    </div>
                                )}

                                {specieName && (
                                    <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                            <Fish className="w-3.5 h-3.5" /> Especie
                                        </span>
                                        <span className="font-bold text-slate-800">{specieName}</span>
                                    </div>
                                )}

                                {ciclo.production_plan && (
                                    <div className="bg-slate-50 p-4 rounded-xl flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                            <ClipboardList className="w-3.5 h-3.5" /> Plan de Producción
                                        </span>
                                        <span className="font-bold text-slate-800">
                                            {productionPlanName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monitoreo del ciclo */}
            {ciclo && (
                <div className="mt-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <MonitoringSection farmId={id} pondId={estanque_id} cycleId={ciclo_id} />
                </div>
            )}

            {/* Historial de Cosechas */}
            {ciclo && (
                <div className="mt-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
                    <HarvestHistorySection
                        farmId={id}
                        cycleId={ciclo_id}
                        refreshTrigger={harvestHistoryRefresh}
                    />
                </div>
            )}

            {/* Lotes del ciclo */}
            {ciclo && (
                <div className="mt-10 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="font-bold text-2xl text-slate-900">
                                    Lotes del Ciclo
                                </h2>
                                <p className="text-slate-500 text-sm mt-1">
                                    Lotes de{" "}
                                    <span className="font-medium">
                                        {estanque?.name || `Estanque #${estanque_id}`}
                                    </span>{" "}
                                    asignados a este ciclo.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {ciclo && (
                <div className="px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto pb-16">
                    <Batches id={id} pondId={estanque_id} cycleId={ciclo_id} />
                </div>
            )}
        </div>
    );
}
