import React from "react";
import { Scale, TrendingUp, Activity, Skull } from "lucide-react";

export function MonitoringStatsCards({
    currentState,
    latestBiomassGainKg,
    isLoading,
    error,
}) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 animate-pulse flex flex-col gap-3"
                    >
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                        <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm">
                {error}
            </div>
        );
    }

    const formatValue = (val, suffix = "") => {
        if (val === null || val === undefined) return "—";
        return `${Number(val).toLocaleString("es-CO", { maximumFractionDigits: 2 })}${suffix}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-blue-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Scale className="w-16 h-16 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-500" /> Biomasa
                </span>
                <span className="text-2xl font-bold text-slate-900">
                    {formatValue(currentState?.biomass_kg, " kg")}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-emerald-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp className="w-16 h-16 text-emerald-600" />
                </div>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Ganancia de Biomasa
                </span>
                <span className="text-2xl font-bold text-slate-900">
                    {formatValue(latestBiomassGainKg, " kg")}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity className="w-16 h-16 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-500" /> FCA
                </span>
                <span className="text-2xl font-bold text-slate-900">
                    {formatValue(currentState?.fca)}
                </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-red-200 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Skull className="w-16 h-16 text-red-600" />
                </div>
                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <Skull className="w-4 h-4 text-red-500" /> Mortalidad
                </span>
                <span className="text-2xl font-bold text-slate-900">
                    {formatValue(currentState?.mortality_percentage, "%")}
                </span>
            </div>
        </div>
    );
}
