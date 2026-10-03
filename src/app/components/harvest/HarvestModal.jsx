"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Plus, Trash2, Fish, Scale, AlertCircle, Info, CheckCircle2, Calendar, FileText, X } from "lucide-react";
import { toast } from "sonner";
import {
    extractApiErrors,
    formatBiomassKg,
    formatWeightGrams,
    parseCycleStockFromApi,
} from "./harvestUtils";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const SIZE_CATEGORIES = ["Small", "Medium", "Large", "Extra Large"];

const SIZE_CATEGORY_LABELS = {
    Small: "Pequeño",
    Medium: "Mediano",
    Large: "Grande",
    "Extra Large": "Extra Grande",
};

const EMPTY_CLASSIFICATION = () => ({
    size_category: "",
    fish_count: "",
    total_weight_g: "",
});

function TotalHarvestInfoBanner({ cycleStock, loadingStock }) {
    return (
        <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700 leading-relaxed">
                    <span className="font-semibold">Cosecha total:</span> Se calculará
                    automáticamente la cantidad de peces y el peso total basándose en el
                    stock vivo del ciclo.
                </p>
            </div>

            {loadingStock ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 px-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Consultando stock del ciclo...
                </div>
            ) : cycleStock ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Peso total en el ciclo
                        </p>
                        <p className="text-base font-bold text-slate-900">
                            {formatWeightGrams(cycleStock.weightG)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Biomasa estimada total
                        </p>
                        <p className="text-base font-bold text-slate-900">
                            {formatBiomassKg(cycleStock.biomassKg)}
                        </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                            Peces vivos
                        </p>
                        <p className="text-base font-bold text-slate-900">
                            {cycleStock.fishCount != null
                                ? Number(cycleStock.fishCount).toLocaleString("es-CO")
                                : "—"}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function HarvestTypeSelector({ value, onChange }) {
    const options = [
        {
            id: "total",
            label: "Cosecha Total",
            desc: "Cosechar todo el stock disponible del ciclo",
            icon: "🐟",
            color: "emerald",
        },
        {
            id: "partial",
            label: "Cosecha Parcial",
            desc: "Cosechar una parte del stock disponible",
            icon: "🎣",
            color: "blue",
        },
    ];

    return (
        <div className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 rounded-lg border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Fish className="w-4 h-4 text-slate-600" />
                Tipo de Cosecha
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {options.map(({ id, label, desc, icon, color }) => {
                    const isSelected = value === id;
                    const borderColor =
                        isSelected
                            ? color === "emerald"
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-blue-500 bg-blue-50"
                            : "border-slate-200 bg-white hover:border-slate-300";

                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            className={`text-left p-4 rounded-lg border-2 transition-all ${borderColor}`}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isSelected
                                            ? color === "emerald"
                                                ? "border-emerald-500"
                                                : "border-blue-500"
                                            : "border-slate-300"
                                    }`}
                                >
                                    {isSelected && (
                                        <span
                                            className={`w-2 h-2 rounded-full ${
                                                color === "emerald" ? "bg-emerald-500" : "bg-blue-500"
                                            }`}
                                        />
                                    )}
                                </span>
                                <span className="text-lg">{icon}</span>
                                <div>
                                    <span className="font-semibold text-sm text-slate-800 block">{label}</span>
                                    <span className="text-xs text-slate-500">{desc}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function ClassificationRow({ cls, index, total, onChange, onRemove }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Scale className="w-3 h-3 text-slate-400" />
                    Clasificación {index + 1}
                </span>
                {total > 1 && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 hover:bg-rose-50 rounded"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        Categoría *
                    </label>
                    <select
                        required
                        value={cls.size_category}
                        onChange={(e) => onChange("size_category", e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="">Seleccionar...</option>
                        {SIZE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {SIZE_CATEGORY_LABELS[cat]}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        Cantidad *
                    </label>
                    <input
                        type="number"
                        min="1"
                        required
                        placeholder="0"
                        value={cls.fish_count}
                        onChange={(e) => onChange("fish_count", e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                        Peso total (g) *
                    </label>
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={cls.total_weight_g}
                        onChange={(e) => onChange("total_weight_g", e.target.value)}
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

export function HarvestModal({ open, onOpenChange, ciclo, farmId, pondId, cycleId, onSuccess }) {
    const [harvestType, setHarvestType] = useState("total");
    const [date, setDate] = useState("");
    const [totalFishCount, setTotalFishCount] = useState("");
    const [observations, setObservations] = useState("");
    const [classifications, setClassifications] = useState([EMPTY_CLASSIFICATION()]);
    const [submitting, setSubmitting] = useState(false);
    const [cycleStock, setCycleStock] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);
    const modalRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        
        const handleEscape = (e) => {
            if (e.key === "Escape" && !submitting) {
                handleClose();
            }
        };
        
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden"; // Bloquear scroll
        
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [open, submitting]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !submitting) {
            handleClose();
        }
    };

    useEffect(() => {
        if (open) {
            setDate(new Date().toISOString().split("T")[0]);
        }
    }, [open]);

    useEffect(() => {
        if (!open || harvestType !== "total" || !farmId || !pondId || !cycleId) {
            setCycleStock(null);
            return;
        }

        let mounted = true;
        (async () => {
            setLoadingStock(true);
            try {
                const token = localStorage.getItem("access");
                const headers = {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                };
                const baseUrl = `${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}`;

                const [stateRes, statsRes] = await Promise.all([
                    fetch(`${baseUrl}/current_state/`, { headers }),
                    fetch(`${baseUrl}/control-stats/`, { headers }),
                ]);

                let currentState = null;
                let latestControlStat = null;

                if (stateRes.ok) {
                    currentState = await stateRes.json();
                }

                if (statsRes.ok) {
                    const statsList = await statsRes.json();
                    if (Array.isArray(statsList) && statsList.length > 0) {
                        statsList.sort(
                            (a, b) =>
                                new Date(b.control_date) -
                                new Date(a.control_date)
                        );
                        latestControlStat = statsList[0];
                    }
                }

                const parsed = parseCycleStockFromApi(
                    currentState,
                    latestControlStat
                );
                
                if (mounted) {
                    setCycleStock(parsed);
                }
            } catch {
                if (mounted) setCycleStock(null);
            } finally {
                if (mounted) setLoadingStock(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [open, harvestType, farmId, pondId, cycleId]);

    const resetForm = () => {
        setHarvestType("total");
        setDate(new Date().toISOString().split("T")[0]);
        setTotalFishCount("");
        setObservations("");
        setClassifications([EMPTY_CLASSIFICATION()]);
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onOpenChange(false);
    };

    const addClassification = () => {
        setClassifications((prev) => [...prev, EMPTY_CLASSIFICATION()]);
    };

    const removeClassification = (index) => {
        setClassifications((prev) => prev.filter((_, i) => i !== index));
    };

    const updateClassification = (index, field, value) => {
        setClassifications((prev) =>
            prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
        );
    };

    const validate = () => {
        if (!date) {
            toast.error("La fecha de cosecha es obligatoria.");
            return false;
        }

        if (harvestType === "partial") {
            const count = Number(totalFishCount);
            if (!totalFishCount || isNaN(count) || count <= 0) {
                toast.error("La cantidad total de peces cosechados debe ser mayor a 0.");
                return false;
            }
        }

        if (classifications.length === 0) {
            toast.error("Debe agregar al menos una clasificación comercial.");
            return false;
        }

        for (let i = 0; i < classifications.length; i++) {
            const c = classifications[i];
            if (!c.size_category) {
                toast.error(`Clasificación ${i + 1}: la categoría de tamaño es obligatoria.`);
                return false;
            }
            const fc = Number(c.fish_count);
            if (!c.fish_count || isNaN(fc) || fc <= 0) {
                toast.error(`Clasificación ${i + 1}: la cantidad de peces debe ser mayor a 0.`);
                return false;
            }
            const tw = Number(c.total_weight_g);
            if (!c.total_weight_g || isNaN(tw) || tw <= 0) {
                toast.error(`Clasificación ${i + 1}: el peso total debe ser mayor a 0.`);
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem("access");

            const payload = {
                cycle: ciclo.id,
                date,
                classifications: classifications.map((c) => ({
                    size_category: c.size_category,
                    fish_count: Number(c.fish_count),
                    total_weight_g: Number(c.total_weight_g),
                })),
            };

            if (observations.trim()) {
                payload.observations = observations.trim();
            }

            if (harvestType === "partial") {
                payload.total_fish_count = Number(totalFishCount);
            }

            const res = await fetch(`${API_BASE}/farms/${farmId}/harvests/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success("Cosecha registrada correctamente.");
                resetForm();
                onOpenChange(false);
                onSuccess();
            } else {
                const errorData = await res.json().catch(() => ({}));
                const messages = extractApiErrors(errorData);
                messages.slice(0, 5).forEach((msg) => toast.error(msg));
            }
        } catch (err) {
            toast.error(err.message || "Error de conexión al registrar la cosecha.");
        } finally {
            setSubmitting(false);
        }
    };

    const cycleStartDate = ciclo?.start_date ?? undefined;

    if (!open) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={handleOverlayClick}
        >
            {}
            <div 
                ref={modalRef}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
            >
                {}
                <div className="flex items-start justify-between p-5 border-b border-slate-200">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
                                <Fish className="w-4 h-4 text-emerald-600" />
                            </span>
                            Registrar Cosecha
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">
                            Ciclo: <span className="font-semibold text-slate-700">{ciclo?.name}</span>
                        </p>
                    </div>
                    
                    {}
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={submitting}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-colors disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 🔹 Formulario */}
                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                    <HarvestTypeSelector value={harvestType} onChange={setHarvestType} />
                    
                    {harvestType === "total" && (
                        <TotalHarvestInfoBanner
                            cycleStock={cycleStock}
                            loadingStock={loadingStock}
                        />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                                Fecha de cosecha <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                min={cycleStartDate}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={(e) => setDate(e.target.value)}
                                disabled={submitting}
                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {harvestType === "partial" && (
                            <div className="md:col-span-2">
                                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                                    <Fish className="w-3.5 h-3.5 text-blue-600" />
                                    Total de peces <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    placeholder="Ej: 200"
                                    value={totalFishCount}
                                    onChange={(e) => setTotalFishCount(e.target.value)}
                                    disabled={submitting}
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center justify-between mb-4">
                            <label className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5">
                                <Scale className="w-4 h-4 text-emerald-600" />
                                Clasificaciones Comerciales <span className="text-rose-500">*</span>
                            </label>
                            <button
                                type="button"
                                onClick={addClassification}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 border border-emerald-200 bg-white hover:bg-emerald-50 rounded-md px-3 py-1.5 transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Agregar
                            </button>
                        </div>

                        <div className="space-y-3">
                            {classifications.map((cls, idx) => (
                                <ClassificationRow
                                    key={idx}
                                    cls={cls}
                                    index={idx}
                                    total={classifications.length}
                                    onChange={(field, value) => updateClassification(idx, field, value)}
                                    onRemove={() => removeClassification(idx)}
                                />
                            ))}
                        </div>

                        {classifications.length > 1 && (
                            <div className="mt-4 rounded-md bg-white border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                {classifications.length} clasificaciones · 
                                Total peces:{" "}
                                <span className="font-semibold text-emerald-900">
                                    {classifications.reduce(
                                        (acc, c) => acc + (Number(c.fish_count) || 0),
                                        0
                                    )}
                                </span>
                                {" · "}
                                Total peso:{" "}
                                <span className="font-semibold text-emerald-900">
                                    {classifications
                                        .reduce(
                                            (acc, c) => acc + (Number(c.total_weight_g) || 0),
                                            0
                                        )
                                        .toLocaleString("es-CO")}{" "}
                                    g
                                </span>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            Observaciones <span className="font-normal text-slate-500">(opcional)</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Observaciones sobre la cosecha, condiciones del día..."
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* 🔹 Footer con botones */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px] flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Registrando...
                                </>
                            ) : (
                                <>
                                    <Fish className="w-4 h-4" />
                                    Registrar Cosecha
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}