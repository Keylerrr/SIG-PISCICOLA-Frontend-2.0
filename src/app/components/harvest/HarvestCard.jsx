"use client";

import { useState, useCallback } from "react";
import {
    ChevronDown,
    ChevronUp,
    Loader2,
    Calendar,
    Fish,
    Scale,
    FileText,
    GitBranch,
} from "lucide-react";
import { DeriveBatchModal } from "./DeriveBatchModal";
import { getHarvestTypeLabel } from "./harvestUtils";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const SIZE_CATEGORY_LABELS = {
    Small: "Pequeño",
    Medium: "Mediano",
    Large: "Grande",
    "Extra Large": "Extra Grande",
};

const HARVEST_TYPE_LABELS = {
    total: "Total",
    partial: "Parcial",
};

function resolveHarvestTypeLabel(harvest) {
    return (
        getHarvestTypeLabel(harvest?.type) ||
        getHarvestTypeLabel(harvest?.harvest_type) ||
        HARVEST_TYPE_LABELS[harvest?.type] ||
        "—"
    );
}

function ClassificationBadge({ classification }) {
    const { derived_fish_count = 0, available_fish_count = 0 } = classification;

    if (available_fish_count === 0 && derived_fish_count > 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                <GitBranch className="w-3 h-3" />
                Completamente derivada
            </span>
        );
    }
    if (derived_fish_count > 0 && available_fish_count > 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <GitBranch className="w-3 h-3" />
                Parcialmente recultivada
            </span>
        );
    }
    return null;
}

export function HarvestCard({ harvest, farmId, onRefresh }) {
    const [expanded, setExpanded] = useState(false);
    const [classifications, setClassifications] = useState([]);
    const [loadingClass, setLoadingClass] = useState(false);
    const [classError, setClassError] = useState(null);
    const [fetchedOnce, setFetchedOnce] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedClassification, setSelectedClassification] = useState(null);

    const fetchClassifications = useCallback(async () => {
        setLoadingClass(true);
        setClassError(null);
        try {
            const token = localStorage.getItem("access");
            const res = await fetch(
                `${API_BASE}/farms/${farmId}/harvests/${harvest.id}/classifications/`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (res.ok) {
                const data = await res.json();
                setClassifications(Array.isArray(data) ? data : []);
            } else {
                setClassError("No se pudieron cargar las clasificaciones.");
            }
        } catch {
            setClassError("Error de conexión al cargar clasificaciones.");
        } finally {
            setLoadingClass(false);
        }
    }, [farmId, harvest.id]);

    const handleToggle = () => {
        if (!expanded && !fetchedOnce) {
            setFetchedOnce(true);
            fetchClassifications();
        }
        setExpanded((v) => !v);
    };

    const handleDeriveSuccess = () => {
        // Refresh classifications and parent list
        fetchClassifications();
        onRefresh();
    };

    const openDeriveModal = (cls) => {
        setSelectedClassification(cls);
        setModalOpen(true);
    };

    const weightKg = harvest.total_weight_g
        ? (harvest.total_weight_g / 1000).toLocaleString("es-CO", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "—";

    const typeLabel = resolveHarvestTypeLabel(harvest);
    const typeKey = String(harvest.type || harvest.harvest_type || "").toLowerCase();
    const typeColor =
        typeKey === "total"
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-blue-100 text-blue-700 border-blue-200";

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-shadow hover:shadow-md">
                {/* Card header — always visible */}
                <div className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        {/* Left: date + type + counts */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Date */}
                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                <span className="font-semibold text-slate-800">
                                    {harvest.date || "Sin fecha"}
                                </span>
                            </div>

                            {/* Type badge */}
                            <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeColor}`}
                            >
                                {typeLabel}
                            </span>

                            {/* Fish count */}
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Fish className="w-3.5 h-3.5 text-slate-400" />
                                <span>
                                    {harvest.total_fish_count != null
                                        ? `${harvest.total_fish_count.toLocaleString("es-CO")} peces`
                                        : "—"}
                                </span>
                            </div>

                            {/* Weight */}
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Scale className="w-3.5 h-3.5 text-slate-400" />
                                <span>{weightKg} kg</span>
                            </div>
                        </div>

                        {/* Right: expand button */}
                        <button
                            onClick={handleToggle}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg px-3 py-1.5 transition-colors shrink-0"
                        >
                            {expanded ? (
                                <>
                                    <ChevronUp className="w-4 h-4" />
                                    Ocultar
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4" />
                                    Ver detalles
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Expandable detail */}
                {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                        {/* Harvest metadata */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white rounded-lg border border-slate-100 p-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Fecha
                                </p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {harvest.date || "—"}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-100 p-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Tipo
                                </p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {typeLabel}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-100 p-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Total peces
                                </p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {harvest.total_fish_count != null
                                        ? harvest.total_fish_count.toLocaleString("es-CO")
                                        : "—"}
                                </p>
                            </div>
                            <div className="bg-white rounded-lg border border-slate-100 p-3">
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Peso total
                                </p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {weightKg} kg
                                </p>
                            </div>
                        </div>

                        {/* Observations */}
                        {harvest.observations && (
                            <div className="bg-white rounded-lg border border-slate-100 p-3 flex items-start gap-2">
                                <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <p className="text-sm text-slate-600 italic">
                                    {harvest.observations}
                                </p>
                            </div>
                        )}

                        {/* Classifications */}
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                <Scale className="w-4 h-4 text-slate-500" />
                                Clasificaciones Comerciales
                            </h4>

                            {loadingClass ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 py-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Cargando clasificaciones...
                                </div>
                            ) : classError ? (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                                    {classError}
                                </div>
                            ) : classifications.length === 0 ? (
                                <div className="text-sm text-slate-500 italic py-2">
                                    No hay clasificaciones registradas.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-100 text-xs text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-2.5 font-medium">
                                                    Categoría
                                                </th>
                                                <th className="px-4 py-2.5 font-medium">
                                                    Cantidad
                                                </th>
                                                <th className="px-4 py-2.5 font-medium">
                                                    Derivados
                                                </th>
                                                <th className="px-4 py-2.5 font-medium">
                                                    Disponibles
                                                </th>
                                                <th className="px-4 py-2.5 font-medium">
                                                    Estado
                                                </th>
                                                <th className="px-4 py-2.5 font-medium" />
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {classifications.map((cls) => (
                                                <tr
                                                    key={cls.id}
                                                    className="hover:bg-slate-50/60 transition-colors"
                                                >
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {SIZE_CATEGORY_LABELS[
                                                            cls.size_category
                                                        ] || cls.size_category}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {cls.fish_count?.toLocaleString("es-CO")} peces
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {(cls.derived_fish_count ?? 0).toLocaleString(
                                                            "es-CO"
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={
                                                                (cls.available_fish_count ?? 0) > 0
                                                                    ? "text-emerald-600 font-semibold"
                                                                    : "text-slate-400"
                                                            }
                                                        >
                                                            {(
                                                                cls.available_fish_count ?? 0
                                                            ).toLocaleString("es-CO")}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <ClassificationBadge
                                                            classification={cls}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {(cls.available_fish_count ?? 0) > 0 && (
                                                            <button
                                                                onClick={() => openDeriveModal(cls)}
                                                                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-800 border border-violet-200 bg-violet-50 hover:bg-violet-100 rounded-md px-3 py-1.5 transition-colors whitespace-nowrap"
                                                            >
                                                                <GitBranch className="w-3.5 h-3.5" />
                                                                Derivar a lote
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Derive Batch Modal */}
            <DeriveBatchModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                farmId={farmId}
                harvestId={harvest.id}
                classification={selectedClassification}
                onSuccess={handleDeriveSuccess}
            />
        </>
    );
}
