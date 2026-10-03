"use client";

import { useState, useEffect } from "react";
import { Loader2, X, GitBranch, Fish, MapPin, FileText } from "lucide-react";
import { toast } from "sonner";
import {
    extractApiErrors,
    isAssignablePond,
} from "./harvestUtils";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const BIOLOGICAL_STATE_LABELS = {
    alevin: "Alevín",
    rising: "Levante",
    fatting: "Engorde",
    breeding: "Reproducción",
};

const SIZE_CATEGORY_LABELS = {
    Small: "Pequeño",
    Medium: "Mediano",
    Large: "Grande",
    "Extra Large": "Extra Grande",
};

const POND_STATUS_LABELS = {
    active: "Activo",
    in_use: "En uso",
};

export function DeriveBatchModal({
    open,
    onOpenChange,
    farmId,
    harvestId,
    classification,
    onSuccess,
}) {
    const [ponds, setPonds] = useState([]);
    const [loadingPonds, setLoadingPonds] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [pondId, setPondId] = useState("");
    const [fishCount, setFishCount] = useState("");
    const [biologicalState, setBiologicalState] = useState("");
    const [comments, setComments] = useState("");

    useEffect(() => {
        if (!open || !farmId) return;

        const fetchPonds = async () => {
            setLoadingPonds(true);
            try {
                const token = localStorage.getItem("access");
                const res = await fetch(`${API_BASE}/farms/${farmId}/ponds/`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : [];
                    setPonds(list.filter(isAssignablePond));
                } else {
                    setPonds([]);
                    toast.error("No se pudieron cargar los estanques disponibles.");
                }
            } catch (err) {
                console.error("Error fetching ponds:", err);
                setPonds([]);
                toast.error("Error de conexión al cargar los estanques.");
            } finally {
                setLoadingPonds(false);
            }
        };

        fetchPonds();
    }, [open, farmId]);

    useEffect(() => {
        if (!open) {
            setPondId("");
            setFishCount("");
            setBiologicalState("");
            setComments("");
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (e) => {
            if (e.key === "Escape" && !submitting) onOpenChange(false);
        };
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "";
        };
    }, [open, submitting, onOpenChange]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget && !submitting) onOpenChange(false);
    };

    const available = classification?.available_fish_count ?? 0;
    const categoryLabel =
        SIZE_CATEGORY_LABELS[classification?.size_category] ||
        classification?.size_category ||
        "";

    const validate = () => {
        if (!pondId) {
            toast.error("Debe seleccionar un estanque destino.");
            return false;
        }
        if (!biologicalState) {
            toast.error("Debe seleccionar el estado biológico.");
            return false;
        }
        const count = Number(fishCount);
        if (!fishCount || isNaN(count) || count <= 0) {
            toast.error("La cantidad de peces debe ser mayor a 0.");
            return false;
        }
        if (count > available) {
            toast.error(
                `La cantidad no puede superar los ${available.toLocaleString("es-CO")} peces disponibles.`
            );
            return false;
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
                pond_id: Number(pondId),
                fish_count: Number(fishCount),
                biological_state: biologicalState,
            };
            if (comments.trim()) payload.comments = comments.trim();

            const res = await fetch(
                `${API_BASE}/farms/${farmId}/harvests/${harvestId}/classifications/${classification.id}/derive-batch/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (res.ok) {
                toast.success("Lote derivado correctamente.");
                onOpenChange(false);
                onSuccess();
            } else {
                const errorData = await res.json().catch(() => ({}));
                extractApiErrors(errorData)
                    .slice(0, 4)
                    .forEach((msg) => toast.error(msg));
            }
        } catch (err) {
            toast.error(
                err.message || "Error de conexión al derivar el lote. Verifique su red."
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={handleOverlayClick}
        >
            <div
                className="w-full max-w-lg bg-white rounded-xl shadow-2xl ring-1 ring-black/5 animate-in fade-in-0 zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between p-5 border-b border-slate-200">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
                                <GitBranch className="w-4 h-4 text-violet-600" />
                            </span>
                            Derivar a Lote
                        </h2>
                        {classification && (
                            <p className="text-slate-500 text-sm mt-1">
                                Clasificación:{" "}
                                <span className="font-semibold text-slate-700">
                                    {categoryLabel}
                                </span>{" "}
                                ·{" "}
                                <span className="text-emerald-600 font-medium">
                                    {available.toLocaleString("es-CO")} peces disponibles
                                </span>
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-2 transition-colors disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-600" />
                            Estanque destino <span className="text-rose-500">*</span>
                        </label>
                        {loadingPonds ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Cargando estanques...
                            </div>
                        ) : ponds.length === 0 ? (
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                No hay estanques activos o en uso disponibles para derivar.
                            </p>
                        ) : (
                            <select
                                required
                                value={pondId}
                                onChange={(e) => setPondId(e.target.value)}
                                disabled={submitting}
                                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Seleccionar estanque...</option>
                                {ponds.map((pond) => (
                                    <option key={pond.id} value={pond.id}>
                                        {pond.name}
                                        {pond.code ? ` (${pond.code})` : ""}
                                        {pond.status
                                            ? ` — ${POND_STATUS_LABELS[pond.status] || pond.status}`
                                            : ""}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                            <Fish className="w-3.5 h-3.5 text-slate-600" />
                            Estado biológico <span className="text-rose-500">*</span>
                        </label>
                        <select
                            required
                            value={biologicalState}
                            onChange={(e) => setBiologicalState(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                        >
                            <option value="">Seleccionar estado...</option>
                            {Object.entries(BIOLOGICAL_STATE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                            <Fish className="w-3.5 h-3.5 text-slate-600" />
                            Cantidad a derivar{" "}
                            <span className="text-rose-500">*</span>
                            <span className="ml-auto text-xs text-slate-400 font-normal">
                                máx. {available.toLocaleString("es-CO")}
                            </span>
                        </label>
                        <input
                            type="number"
                            min="1"
                            max={available}
                            required
                            placeholder={`Ej: ${available}`}
                            value={fishCount}
                            onChange={(e) => setFishCount(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-slate-900 mb-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            Comentarios{" "}
                            <span className="font-normal text-slate-500">(opcional)</span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Observaciones sobre el lote derivado..."
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            disabled={submitting}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none disabled:bg-slate-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || ponds.length === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[130px] flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Derivando...
                                </>
                            ) : (
                                <>
                                    <GitBranch className="w-4 h-4" />
                                    Derivar lote
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
