"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
    Calendar, CalendarX, Pencil, Trash, History, Zap, ChevronDown,
    ChevronUp, Plus, Fish, Scale, Loader2, ChevronRight,
} from "lucide-react";
import {
    Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction,
} from "@/components/ui/card";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import Link from "next/link";
import { CycleRegisterForm } from "./cycle_form";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const STATE_LABELS = {
    in_progress: "En Ejecución",
    paused: "Pausado",
    finished: "Completado",
    cancelled: "Cancelado",
};
const STATE_COLORS = {
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    paused: "bg-yellow-100 text-yellow-700 border-yellow-200",
    finished: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
};
const BIO_STATE_LABELS = {
    alevin: "Alevín", rising: "Levante", fatting: "Engorde", breeding: "Reproducción",
};

const ACTIVE_STATES = ["in_progress", "paused"];
const HISTORY_STATES = ["finished", "cancelled"];

// ── Inline batches for a single cycle ──────────────────────────────
function CycleBatches({ farmId, pondId, cycleId }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!farmId || !pondId || !cycleId) return;
        const fetchBatches = async () => {
            try {
                const token = localStorage.getItem("access");
                const res = await fetch(
                    `${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/cycle-batches/`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) throw new Error();
                const data = await res.json();
                setBatches(Array.isArray(data) ? data : []);
            } catch {
                setBatches([]);
            } finally {
                setLoading(false);
            }
        };
        fetchBatches();
    }, [farmId, pondId, cycleId]);

    if (loading) return (
        <div className="flex items-center gap-2 py-3 px-1 text-sm text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando lotes...
        </div>
    );

    if (batches.length === 0) return (
        <p className="text-sm text-slate-400 italic py-2 px-1">Sin lotes asignados a este ciclo.</p>
    );

    return (
        <div className="mt-2 space-y-1.5">
            {batches.map((item) => {
                const b = item.pond_batch_detail?.batch ?? item.batch ?? item;
                const qty = item.quantity ?? item.current_quantity ?? b.initial_quantity;
                const spName = b.specie?.name ?? `Especie #${b.specie}`;
                return (
                    <div key={item.id}
                        className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm"
                    >
                        <div className="flex items-center gap-2 text-slate-700">
                            <Fish className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="font-medium">Lote #{b.id ?? item.id}</span>
                            <span className="text-slate-400">·</span>
                            <span>{spName}</span>
                            {b.biological_state && (
                                <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                    {BIO_STATE_LABELS[b.biological_state] ?? b.biological_state}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                            <Scale className="w-3 h-3" />
                            {qty ?? "—"} peces
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ── Single cycle card ───────────────────────────────────────────────
function CycleCard({ c, farmId, pondId, onDelete, speciesMap }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <Card className="group border hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all">
            <CardHeader>
                <CardTitle className="text-2xl font-bold group-hover:text-blue-600 flex items-center justify-between gap-2">
                    <Link
                        href={`/home/granja/${farmId}/estanque/${pondId}/ciclo/${c.id}/`}
                        className="truncate"
                    >
                        {c.name}
                    </Link>
                </CardTitle>

                <CardDescription className="flex items-center gap-2 text-sm mt-0.5">
                    <Calendar className="w-3.5 h-3.5" /> Inicio: {c.start_date || "—"}
                    <span className="text-slate-300">·</span>
                    <CalendarX className="w-3.5 h-3.5" /> Est.: {c.estimated_finish_date || "—"}
                </CardDescription>

                {c.specie && (
                    <CardDescription className="flex items-center gap-1 text-xs mt-0.5 text-blue-600">
                        <Fish className="w-3 h-3" />
                        {speciesMap[c.specie] ?? `Especie #${c.specie}`}
                    </CardDescription>
                )}

                <CardAction>
                    <div className="flex gap-2 items-center">
                        {/* Edit */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="text-blue-500 hover:text-blue-700 transition-colors p-1">
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] max-w-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Editar ciclo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Editando <span className="font-bold">{c.name}</span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <CycleRegisterForm
                                    op={2} idProp={c.id} farmProp={farmId} pondProp={pondId}
                                    specieProp={c.specie} productionPlanProp={c.production_plan}
                                    nameProp={c.name} startDateProp={c.start_date}
                                    estimatedFinishDateProp={c.estimated_finish_date}
                                    stateProp={c.state} commentsProp={c.comments}
                                    minWeightGProp={c.min_weight_g} avgWeightGProp={c.avg_weight_g}
                                    maxWeightGProp={c.max_weight_g}
                                />
                                <AlertDialogFooter><AlertDialogCancel>Cerrar</AlertDialogCancel></AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Delete */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="text-red-400 hover:text-red-600 transition-colors p-1">
                                    <Trash className="w-4 h-4" />
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="w-[95vw] max-w-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar ciclo?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Se eliminará <span className="font-bold">{c.name}</span> permanentemente.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => onDelete(c.id)} className="bg-red-600 hover:bg-red-700">
                                        Eliminar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardAction>
            </CardHeader>

            {c.comments && (
                <CardContent className="pt-0 pb-2">
                    <p className="text-xs text-slate-400 italic">&quot;{c.comments}&quot;</p>
                </CardContent>
            )}

            <CardFooter className="flex flex-col gap-3 pt-2">
                <div className="w-full flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATE_COLORS[c.state] ?? "bg-gray-100 text-gray-700"}`}>
                        {STATE_LABELS[c.state] ?? c.state}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setExpanded((v) => !v)}
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded px-2 py-0.5 transition-colors"
                        >
                            {expanded ? <><ChevronUp className="w-3 h-3" /> Ocultar lotes</> : <><ChevronDown className="w-3 h-3" /> Ver lotes</>}
                        </button>
                    </div>
                </div>

                {expanded && (
                    <div className="w-full border-t border-slate-100 pt-3">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Lotes del ciclo</p>
                        <CycleBatches farmId={farmId} pondId={pondId} cycleId={c.id} />
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}

// ── Main Cycles component ───────────────────────────────────────────
export function Cycles({ farmId, pondId, pondStatus, canManage = false }) {
    const [ciclos, setCiclos] = useState([]);
    const [species, setSpecies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("active");
    const [filterSpecie, setFilterSpecie] = useState("all");
    const [ordering, setOrdering] = useState("desc"); // "asc" | "desc"
    const [showCreate, setShowCreate] = useState(false);

    const pondIsInUse = pondStatus === "in_use";

    const speciesMap = useMemo(() =>
        species.reduce((acc, s) => ({ ...acc, [s.id]: s.name }), {}),
        [species]
    );

    useEffect(() => {
        if (!farmId || !pondId) return;
        const fetchAll = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("access");
                const headers = { Authorization: `Bearer ${token}` };
                const [cyclesRes, speciesRes] = await Promise.all([
                    fetch(`${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/`, { headers }),
                    fetch(`${API_BASE}/species/`, { headers }),
                ]);
                if (cyclesRes.ok) setCiclos(await cyclesRes.json().then(d => Array.isArray(d) ? d : []));
                if (speciesRes.ok) setSpecies(await speciesRes.json().then(d => Array.isArray(d) ? d : []));
            } catch (err) {
                console.error(err);
                toast.error("Error cargando ciclos del estanque.");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [farmId, pondId]);

    const handleDelete = useCallback(async (cycleId) => {
        const token = localStorage.getItem("access");
        toast.promise(
            fetch(`${API_BASE}/farms/${farmId}/ponds/${pondId}/cycles/${cycleId}/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            }).then(async (res) => {
                if (!res.ok) throw new Error();
                setCiclos((prev) => prev.filter((c) => c.id !== cycleId));
            }),
            { loading: "Eliminando...", success: "Ciclo eliminado", error: "Error al eliminar" }
        );
    }, [farmId, pondId]);

    const sorted = useMemo(() => {
        return [...ciclos].sort((a, b) => {
            const da = new Date(a.start_date ?? 0);
            const db = new Date(b.start_date ?? 0);
            return ordering === "asc" ? da - db : db - da;
        });
    }, [ciclos, ordering]);

    const filtered = useMemo(() => {
        if (filterSpecie === "all") return sorted;
        return sorted.filter((c) => c.specie?.toString() === filterSpecie);
    }, [sorted, filterSpecie]);

    const activeCiclos = useMemo(() => filtered.filter((c) => ACTIVE_STATES.includes(c.state)), [filtered]);
    const historyCiclos = useMemo(() => filtered.filter((c) => HISTORY_STATES.includes(c.state)), [filtered]);
    const currentList = activeTab === "active" ? activeCiclos : historyCiclos;

    return (
        <div className="space-y-5">
            <Toaster position="top-center" />

            {/* ── Toolbar ── */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                    {/* Tabs */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab("active")}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "active" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <Zap className="w-3.5 h-3.5" /> Activos
                            {activeCiclos.length > 0 && (
                                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full font-bold">{activeCiclos.length}</span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("history")}
                            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === "history" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            <History className="w-3.5 h-3.5" /> Historial
                            {historyCiclos.length > 0 && (
                                <span className="ml-1 bg-slate-200 text-slate-600 text-xs px-1.5 rounded-full font-bold">{historyCiclos.length}</span>
                            )}
                        </button>
                    </div>

                    {/* Species filter */}
                    <Select value={filterSpecie} onValueChange={setFilterSpecie}>
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200">
                            <SelectValue placeholder="Todas las especies" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las especies</SelectItem>
                            {species.map((s) => (
                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date ordering */}
                    <Select value={ordering} onValueChange={setOrdering}>
                        <SelectTrigger className="w-[160px] h-9 text-sm bg-white border-slate-200">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="desc">Más recientes</SelectItem>
                            <SelectItem value="asc">Más antiguos</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Create cycle */}
                {canManage && (
                    <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
                        <AlertDialogTrigger asChild>
                            <Button
                                disabled={!pondIsInUse}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 h-9"
                                title={!pondIsInUse ? "El estanque debe estar En Uso" : ""}
                            >
                                <Plus className="w-4 h-4" /> Nuevo Ciclo
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>Crear nuevo ciclo</AlertDialogTitle>
                                <AlertDialogDescription>
                                    El ciclo quedará asociado a este estanque.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <CycleRegisterForm op={1} farmProp={farmId} pondProp={pondId} stateProp="in_progress" />
                            <AlertDialogFooter><AlertDialogCancel>Cerrar</AlertDialogCancel></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            {/* Pond not in_use warning */}
            {canManage && !pondIsInUse && !loading && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
                    El estanque debe estar en estado <strong>En Uso</strong> para crear nuevos ciclos.
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-3 justify-center py-12 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Cargando ciclos...</span>
                </div>
            )}

            {/* Empty state */}
            {!loading && currentList.length === 0 && (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                    {activeTab === "active" ? (
                        <>
                            <Zap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">No hay ciclos activos</p>
                            <p className="text-slate-300 text-sm mt-1">Crea un nuevo ciclo para comenzar.</p>
                        </>
                    ) : (
                        <>
                            <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-medium">Sin historial de ciclos</p>
                            <p className="text-slate-300 text-sm mt-1">Los ciclos finalizados aparecerán aquí.</p>
                        </>
                    )}
                </div>
            )}

            {/* Cycle cards grid */}
            {!loading && currentList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {currentList.map((c) => (
                        <CycleCard
                            key={c.id}
                            c={c}
                            farmId={farmId}
                            pondId={pondId}
                            onDelete={handleDelete}
                            speciesMap={speciesMap}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
