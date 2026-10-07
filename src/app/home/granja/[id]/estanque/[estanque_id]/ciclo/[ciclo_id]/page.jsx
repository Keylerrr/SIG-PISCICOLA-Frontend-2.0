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
    Activity,
    Utensils,
} from "lucide-react";
import { Toaster } from "sonner";
import { Batches } from "@/app/components/batches/batches";
import { MonitoringSection } from "@/app/components/monitoring/MonitoringSection";
import { HarvestModal } from "@/app/components/harvest/HarvestModal";
import { HarvestHistorySection } from "@/app/components/harvest/HarvestHistorySection";
import CycleFeedingContent from "./alimentacion/CycleFeedingContent";
import CycleHealthContent from "./salud/CycleHealthContent";

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
    const [tab, setTab] = useState("monitoreo");
    const router = useRouter();

    const mainTabs = [
        { key: "monitoreo", label: "Monitoreo", icon: Activity, visible: true },
        { key: "lotes", label: "Lotes", icon: Layers, visible: true },
        { key: "alimentacion", label: "Alimentación", icon: Utensils, visible: true },
        { key: "salud", label: "Salud", icon: Stethoscope, visible: true },
        { key: "cosechas", label: "Cosechas", icon: Fish, visible: true },
    ];

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
        <div className="relative min-h-screen bg-slate-50">
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

            <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
                {/* Volver */}
                <Link
                    href={`/home/granja/${id}/estanque/${estanque_id}/`}
                    className="inline-flex items-center gap-2 rounded text-sm text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Estanque
                </Link>

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
                {ciclo && (
                    <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{ciclo.name}</h1>
                                {ciclo.comments?.length > 0 && (
                                    <p className="mt-2 text-slate-500 italic">&quot;{ciclo.comments}&quot;</p>
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
                                    <button
                                        type="button"
                                        onClick={() => setHarvestModalOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    >
                                        <Fish className="w-4 h-4" />
                                        Terminar ciclo y cosechar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr gap-4 border-t border-slate-100 pt-4">
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
                    </header>
                )}

                {/* PESTAÑAS PRINCIPALES Y CONTENIDO */}
                {ciclo && (
                    <>
                        {/* Tab Bar */}
                        <div
                            role="tablist"
                            aria-label="Secciones del ciclo"
                            className="flex gap-1 overflow-x-auto border-b border-slate-200"
                        >
                            {mainTabs
                                .filter((t) => t.visible)
                                .map((t) => {
                                    const Icon = t.icon;
                                    const active = tab === t.key;

                                    return (
                                        <button
                                            key={t.key}
                                            type="button"
                                            role="tab"
                                            id={`tab-${t.key}`}
                                            aria-selected={active}
                                            aria-controls={`panel-${t.key}`}
                                            onClick={() => setTab(t.key)}
                                            className={`flex items-center gap-2 whitespace-nowrap rounded-t border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                                                active
                                                    ? "border-blue-600 text-blue-700"
                                                    : "border-transparent text-slate-500 hover:text-slate-800"
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            {t.label}
                                        </button>
                                    );
                                })}
                        </div>

                        {/* 1. MONITOREO */}
                        <section
                            role="tabpanel"
                            id="panel-monitoreo"
                            aria-labelledby="tab-monitoreo"
                            hidden={tab !== "monitoreo"}
                            className={`space-y-5 pb-8 ${tab !== "monitoreo" ? "hidden" : ""}`}
                        >
                            <MonitoringSection
                                farmId={id}
                                pondId={estanque_id}
                                cycleId={ciclo_id}
                            />
                        </section>

                        {/* 2. LOTES */}
                        <section
                            role="tabpanel"
                            id="panel-lotes"
                            aria-labelledby="tab-lotes"
                            hidden={tab !== "lotes"}
                            className={`space-y-4 pb-8 ${tab !== "lotes" ? "hidden" : ""}`}
                        >
                            <div>
                                <h2 className="font-bold text-xl text-slate-900">
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
                            <Batches id={id} pondId={estanque_id} cycleId={ciclo_id} />
                        </section>

                        {/* 3. ALIMENTACIÓN */}
                        <section
                            role="tabpanel"
                            id="panel-alimentacion"
                            aria-labelledby="tab-alimentacion"
                            hidden={tab !== "alimentacion"}
                            className={`space-y-5 pb-8 ${tab !== "alimentacion" ? "hidden" : ""}`}
                        >
                            <CycleFeedingContent
                                farmId={id}
                                pondId={estanque_id}
                                cycleId={ciclo_id}
                                cycleName={ciclo.name}
                                showBackLink={false}
                            />
                        </section>

                        {/* 4. SALUD */}
                        <section
                            role="tabpanel"
                            id="panel-salud"
                            aria-labelledby="tab-salud"
                            hidden={tab !== "salud"}
                            className={`space-y-5 pb-8 ${tab !== "salud" ? "hidden" : ""}`}
                        >
                            <CycleHealthContent
                                farmId={id}
                                pondId={estanque_id}
                                cycleId={ciclo_id}
                                showBackLink={false}
                            />
                        </section>

                        {/* 5. COSECHAS */}
                        <section
                            role="tabpanel"
                            id="panel-cosechas"
                            aria-labelledby="tab-cosechas"
                            hidden={tab !== "cosechas"}
                            className={`space-y-5 pb-8 ${tab !== "cosechas" ? "hidden" : ""}`}
                        >
                            <HarvestHistorySection
                                farmId={id}
                                cycleId={ciclo_id}
                                refreshTrigger={harvestHistoryRefresh}
                            />
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}
