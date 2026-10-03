"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Zap, History } from "lucide-react";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import { Batches } from "@/app/components/batches/batches";
import { Cycles } from "@/app/components/cycles/cycles";
import { usePermissions } from "@/lib/usePermissions";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const STATUS_BG = {
    active: "bg-green-100",
    inactive: "bg-red-100",
    in_use: "bg-blue-100",
    cleaning: "bg-yellow-100",
};
const STATUS_FONT = {
    active: "text-green-700",
    inactive: "text-red-700",
    in_use: "text-blue-700",
    cleaning: "text-yellow-700",
};
const STATUS_LABELS = {
    active: "Activo",
    inactive: "Inactivo",
    in_use: "En Uso",
    cleaning: "En Limpieza",
};
const TYPE_LABELS = {
    dirt: "Tierra",
    concrete: "Concreto",
    geomembrane: "Geomembrana",
    floating_cage: "Jaula flotante",
    raceway: "Canal",
    round_tank: "Tanque circular",
};

export default function Estanque() {
    const { estanque_id, id } = useParams();
    const [estanque, setEstanque] = useState(null);
    const [batchTab, setBatchTab] = useState("active");
    const permissions = usePermissions(id);

    const canManage = permissions.isAdmin || permissions.canManageCycle;

    useEffect(() => {
        if (!id || !estanque_id) return;
        const fetchEstanque = async () => {
            try {
                const token = localStorage.getItem("access");
                const res = await fetch(`${API_BASE}/farms/${id}/ponds/${estanque_id}/`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (!res.ok) throw new Error(`Error ${res.status}`);
                setEstanque(await res.json());
            } catch (err) {
                console.error("Error cargando estanque:", err);
            }
        };
        fetchEstanque();
    }, [id, estanque_id]);

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ── Loading overlay ── */}
            {!estanque && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                        <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                        <p className="mt-3 font-medium text-slate-600">Cargando estanque...</p>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

                {/* ── Back ── */}
                <Link
                    href={`/home/granja/${id}/`}
                    className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Volver a la Granja
                </Link>

                {/* ══════════════════════════════════════
                    1. INFORMACIÓN DEL ESTANQUE
                ══════════════════════════════════════ */}
                {estanque && (
                    <section>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
                            {/* Title + status badge */}
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">{estanque.name}</h1>
                                    {estanque.description && (
                                        <p className="text-slate-500 mt-1 text-sm">{estanque.description}</p>
                                    )}
                                </div>
                                <span
                                    className={`text-sm font-semibold px-3 py-1.5 rounded-full ${STATUS_BG[estanque.status] ?? "bg-gray-100"} ${STATUS_FONT[estanque.status] ?? "text-gray-700"}`}
                                >
                                    {STATUS_LABELS[estanque.status] ?? estanque.status}
                                </span>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-sm">
                                {[
                                    { label: "Código", value: estanque.code || "—" },
                                    { label: "Área", value: estanque.area ? `${estanque.area} m²` : "—" },
                                    { label: "Capacidad", value: estanque.capacity ? `${estanque.capacity} peces` : "—" },
                                    { label: "Profundidad", value: estanque.depth ? `${estanque.depth} m` : "—" },
                                    { label: "Tipo", value: TYPE_LABELS[estanque.type] ?? estanque.type ?? "—" },
                                ].map(({ label, value }) => (
                                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                                        <p className="font-bold text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                {/* ══════════════════════════════════════
                    2. LOTES DEL ESTANQUE
                ══════════════════════════════════════ */}
                {estanque && (
                    <section>
                        <div className="mb-4">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-1 h-5 bg-blue-500 rounded-full inline-block" />
                                Lotes en este Estanque
                            </h2>
                            <p className="text-slate-400 text-sm mt-0.5 ml-3">
                                {batchTab === "active"
                                    ? "Lotes con estado activo asignados a este estanque."
                                    : "Historial de lotes con otros estados en este estanque."}
                            </p>
                        </div>

                        {/* ── Batch tab switch ── */}
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-4">
                            <button
                                onClick={() => setBatchTab("active")}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                    batchTab === "active"
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Zap className="w-3.5 h-3.5" /> Activos
                            </button>
                            <button
                                onClick={() => setBatchTab("history")}
                                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                                    batchTab === "history"
                                        ? "bg-white text-slate-800 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <History className="w-3.5 h-3.5" /> Historial
                            </button>
                        </div>

                        <Batches id={id} pondId={estanque_id} statusFilter={batchTab} />
                    </section>
                )}

                {/* ══════════════════════════════════════
                    3. CICLOS DEL ESTANQUE
                ══════════════════════════════════════ */}
                {estanque && (
                    <section>
                        <div className="mb-5">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                <span className="w-1 h-5 bg-green-500 rounded-full inline-block" />
                                Ciclos del Estanque
                            </h2>
                            <p className="text-slate-400 text-sm mt-0.5 ml-3">
                                Gestiona los ciclos productivos de <span className="font-medium text-slate-600">{estanque.name}</span>.
                                Los lotes de cada ciclo se muestran al expandir la card.
                            </p>
                        </div>

                        <Cycles
                            farmId={id}
                            pondId={estanque_id}
                            pondStatus={estanque.status}
                            canManage={canManage}
                        />
                    </section>
                )}

            </div>
        </div>
    );
}