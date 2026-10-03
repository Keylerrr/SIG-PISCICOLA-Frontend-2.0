"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash, FileText, Activity, Scale, Clock } from "lucide-react";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { ProductionPlanForm } from "./production_plan_form";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

const TYPE_LABELS = {
    nursery: "Cría (Nursery)",
    growout: "Engorde (Growout)",
    breeding: "Reproducción (Breeding)",
};

const TYPE_COLORS = {
    nursery: "bg-blue-100 text-blue-700",
    growout: "bg-green-100 text-green-700",
    breeding: "bg-purple-100 text-purple-700",
};

export function ProductionPlans({ id, search = "" }) {
    const [plans, setPlans] = useState([]);
    const [speciesMap, setSpeciesMap] = useState({});
    const [loading, setLoading] = useState(true);

    const filteredPlans = useMemo(() => {
        let currentPlans = plans.filter(p => p.is_current); // Mostrar solo la versión actual
        if (!search?.trim()) return currentPlans;
        const term = search.toLowerCase().trim();
        return currentPlans.filter((p) => p.name?.toLowerCase().includes(term));
    }, [plans, search]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("access");
                
                // Fetch species
                const speciesRes = await fetch(`${API_BASE}/species/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (speciesRes.ok) {
                    const sData = await speciesRes.json();
                    const sArray = Array.isArray(sData) ? sData : [];
                    const sMap = sArray.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.name }), {});
                    setSpeciesMap(sMap);
                }

                // Fetch production plans
                const res = await fetch(`${API_BASE}/farms/${id}/production-plans/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    throw new Error(`Error ${res.status} al obtener planes de producción`);
                }

                const data = await res.json();
                setPlans(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error cargando planes de producción:", error);
                toast.error("Error al cargar los planes de producción");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleDelete = async (planId) => {
        const token = localStorage.getItem("access");

        toast.promise(
            fetch(`${API_BASE}/farms/${id}/production-plans/${planId}/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            }).then(async (res) => {
                if (!res.ok) {
                    throw new Error(`Error ${res.status} al eliminar el plan`);
                }
                setPlans((prev) => prev.filter((p) => p.id !== planId));
            }),
            {
                loading: "Eliminando plan de producción...",
                success: "Plan eliminado correctamente",
                error: "Error al eliminar el plan",
            }
        );
    };

    return (
        <>
            <Toaster position="top-center" />

            {loading && (
                <div className="flex items-center justify-center min-h-50">
                    <p className="text-slate-500">Cargando planes de producción...</p>
                </div>
            )}

            <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 p-4">
                {filteredPlans.length === 0 && search && !loading && (
                    <p className="text-center col-span-full text-gray-500 text-lg">
                        No se encontraron planes de producción 😢
                    </p>
                )}

                {filteredPlans.map((p) => (
                    <Card
                        key={p.id}
                        className="group border hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col"
                    >
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-slate-800">
                                {p.name}
                            </CardTitle>

                            <CardDescription className="flex items-center gap-2 font-bold mt-1 text-slate-700">
                                Especie: {speciesMap[p.specie] || `Especie #${p.specie}`}
                            </CardDescription>

                            <CardAction>
                                <div className="flex gap-3">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Pencil className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors w-5 h-5" />
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>¿Editar Plan?</DialogTitle>
                                                <DialogDescription>
                                                    Creará una nueva versión para <span className="font-bold">{p.name}</span>
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ProductionPlanForm 
                                                op={2} 
                                                idProp={p.id} 
                                                farmProp={id}
                                                specieProp={p.specie}
                                                nameProp={p.name}
                                                typeProp={p.type}
                                                totalDaysProp={p.total_days}
                                                expectedMortalityRateProp={p.expected_mortality_rate}
                                                expectedFinalWeightProp={p.expected_final_weight}
                                                expectedReproductionRateProp={p.expected_reproduction_rate}
                                            />
                                        </DialogContent>
                                    </Dialog>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Trash className="text-red-600 cursor-pointer hover:text-red-700 transition-colors w-5 h-5" />
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="w-[95vw] max-w-md">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Se eliminará lógicamente <span className="font-bold">{p.name}</span>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDelete(p.id)}
                                                    className="bg-red-600 hover:bg-red-700"
                                                >
                                                    Eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </CardAction>
                        </CardHeader>

                        <CardContent className="flex-grow space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span>{p.total_days} días</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Scale className="w-4 h-4 text-green-500" />
                                    <span>{p.expected_final_weight}g final</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-red-500" />
                                    <span>{p.expected_mortality_rate}% mort.</span>
                                </div>
                                {p.expected_reproduction_rate != null && (
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-purple-500" />
                                        <span>{p.expected_reproduction_rate}% repro.</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="pt-2 border-t mt-auto">
                            <div className="w-full flex justify-between items-center">
                                <p
                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[p.type] || "bg-gray-100 text-gray-700"
                                        }`}
                                >
                                    {TYPE_LABELS[p.type] || p.type}
                                </p>
                                <span className="text-xs text-slate-400">v{p.version}</span>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </>
    );
}
