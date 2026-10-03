"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Fish } from "lucide-react";
import { HarvestCard } from "./HarvestCard";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

export function HarvestHistorySection({ farmId, cycleId, refreshTrigger = 0 }) {
    const [harvests, setHarvests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHarvests = useCallback(async () => {
        if (!farmId || !cycleId) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("access");
            const res = await fetch(
                `${API_BASE}/farms/${farmId}/harvests/?cycle_id=${cycleId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (res.ok) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : [];
                // Sort by date descending — most recent first
                list.sort((a, b) => new Date(b.date) - new Date(a.date));
                setHarvests(list);
            } else {
                setError("No se pudo cargar el historial de cosechas.");
            }
        } catch {
            setError("Error de conexión al cargar el historial de cosechas.");
        } finally {
            setLoading(false);
        }
    }, [farmId, cycleId]);

    useEffect(() => {
        fetchHarvests();
    }, [fetchHarvests, refreshTrigger]);

    return (
        <div className="space-y-4">
            {/* Section header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">
                        Historial de Cosechas
                    </h2>
                    <p className="text-sm text-slate-500">
                        Cosechas registradas en este ciclo
                    </p>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Loading state */}
            {loading && !error && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-8 flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Cargando cosechas...</span>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && harvests.length === 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-5 py-10 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                        <Fish className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-700">
                            Sin cosechas registradas
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Las cosechas del ciclo aparecerán aquí.
                        </p>
                    </div>
                </div>
            )}

            {/* Harvest cards */}
            {!loading && !error && harvests.length > 0 && (
                <div className="space-y-3">
                    {harvests.map((harvest) => (
                        <HarvestCard
                            key={harvest.id}
                            harvest={harvest}
                            farmId={farmId}
                            onRefresh={fetchHarvests}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
