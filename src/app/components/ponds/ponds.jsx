"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Droplet, RulerDimensionLine, Pencil, Trash, Loader2 } from "lucide-react";
import Link from "next/link";
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
import { Switch } from "@/components/ui/switch";
import { Toaster, toast } from "sonner";
import { PondRegisterForm } from "./pond_form";
import { apiFetchJsonSafe, safeFetch } from "@/lib/apiClient";
import { pondService, isPondSwitchOn, isPondInactive } from "@/lib/pondService";
import { useAuthReady } from "@/hooks/useAuthReady";
import { assertPathSegment } from "@/lib/apiConfig";

export function Ponds({ id, search, filter }) {
    const [estanques, setEstanques] = useState([]);
    const [togglingIds, setTogglingIds] = useState(() => new Set());
    const togglingLockRef = useRef(new Set());
    const { authReady, hasToken } = useAuthReady();

    const filteredEstanques = estanques.filter((e) =>
        e.name.toLowerCase().includes((search || "").toLowerCase().trim())
    );

    const statusStyles = {
        active: "bg-green-100 text-green-700",
        inactive: "bg-red-100 text-red-700",
        in_use: "bg-blue-100 text-blue-700",
        cleaning: "bg-yellow-100 text-yellow-700",
    };
    const statusLabels = {
        active: "Activo",
        inactive: "Inactivo",
        in_use: "En Uso",
        cleaning: "En Limpieza",
    };

    const updatePondInList = useCallback((pondId, updates) => {
        setEstanques((prev) =>
            prev.map((p) => (p.id === pondId ? { ...p, ...updates } : p))
        );
    }, []);

    const fetchEstanques = useCallback(async () => {
        if (!authReady || !hasToken || !id) return;

        try {
            assertPathSegment(id, "farmId");
            const result = await apiFetchJsonSafe(`/farms/${id}/ponds/`, {
                source: "Ponds.fetchEstanques",
            });

            if (result.error) {
                console.error("Error al obtener estanques:", result.error.message);
                return;
            }

            const data = Array.isArray(result.data) ? result.data : [];
            if (filter && filter !== "all") {
                setEstanques(data.filter((pond) => pond.status === filter));
            } else {
                setEstanques(data);
            }
        } catch (error) {
            console.error(error);
        }
    }, [authReady, hasToken, id, filter]);

    useEffect(() => {
        fetchEstanques();
    }, [fetchEstanques]);

    const setToggling = useCallback((pondId, isToggling) => {
        setTogglingIds((prev) => {
            const next = new Set(prev);
            if (isToggling) next.add(pondId);
            else next.delete(pondId);
            return next;
        });
        if (isToggling) togglingLockRef.current.add(pondId);
        else togglingLockRef.current.delete(pondId);
    }, []);

    const handleStatusToggle = async (pond, checked) => {
        if (togglingLockRef.current.has(pond.id)) return;

        const previousStatus = pond.status;
        const nextStatus = checked ? "active" : "inactive";

        if (checked && isPondSwitchOn(previousStatus)) return;
        if (!checked && previousStatus === "inactive") return;

        setToggling(pond.id, true);
        updatePondInList(pond.id, { status: nextStatus });

        try {
            const responseData = checked
                ? await pondService.activate(id, pond.id)
                : await pondService.inactivate(id, pond.id);

            const resolvedStatus = responseData?.status ?? nextStatus;
            updatePondInList(pond.id, {
                ...responseData,
                status: resolvedStatus,
            });

            toast.success(
                checked
                    ? `Estanque "${pond.name}" activado correctamente`
                    : `Estanque "${pond.name}" inactivado correctamente`
            );
        } catch (err) {
            updatePondInList(pond.id, { status: previousStatus });
            toast.error(
                err.message ||
                    (checked
                        ? "No se pudo activar el estanque"
                        : "No se pudo inactivar el estanque")
            );
        } finally {
            setToggling(pond.id, false);
        }
    };

    const handleDelete = async (ide) => {
        await toast.promise(
            (async () => {
                const { response, error } = await safeFetch(
                    `/farms/${id}/ponds/${ide}/`,
                    {
                        method: "DELETE",
                        source: "Ponds.handleDelete",
                    }
                );

                if (error) throw error;

                let data = null;
                if (response) {
                    try {
                        const text = await response.text();
                        data = text ? JSON.parse(text) : null;
                    } catch {
                        data = null;
                    }
                }

                if (!response?.ok) {
                    const errorMsg =
                        data?.detail ||
                        data?.message ||
                        data?.non_field_errors?.[0] ||
                        `Error ${response?.status} al eliminar`;
                    throw new Error(errorMsg);
                }

                return data;
            })(),
            {
                loading: "Eliminando estanque...",
                success: (data) => {
                    setEstanques((prev) => prev.filter((e) => e.id !== ide));
                    return data?.message || "Estanque eliminada correctamente";
                },
                error: (err) => err.message || "Error al eliminar estanque",
            }
        );
    };

    return (
        <>
            <Toaster position="top-center" />
            <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-4">
                {filteredEstanques.length === 0 && search.trim() && (
                    <p className="text-center col-span-full text-gray-500 text-lg">
                        No se encontraron estanques 😢
                    </p>
                )}
                {filteredEstanques.map((e) => {
                    const switchOn = isPondSwitchOn(e.status);
                    const isToggling = togglingIds.has(e.id);
                    const isInactive = isPondInactive(e.status);

                    return (
                        <div key={e.id}>
                            <Card
                                className={`group border border-gray-200 hover:border-blue-500 hover:shadow-lg ${
                                    isInactive ? "bg-gray-50 opacity-90" : ""
                                } hover:-translate-y-1 transition-all duration-200`}
                            >
                                <CardHeader>
                                    <CardTitle className="font-bold text-2xl group-hover:text-blue-600">
                                        <Link href={`/home/granja/${id}/estanque/${e.id}/`}>
                                            {e.name}
                                        </Link>
                                    </CardTitle>
                                    <CardDescription className="gap-2 font-bold text-lg flex items-center">
                                        Código: {e.code}
                                    </CardDescription>
                                    <CardAction>
                                        <div className="flex items-center gap-3">
                                            <AlertDialog>
                                                {!isInactive && (
                                                    <AlertDialogTrigger asChild>
                                                        <Pencil className="cursor-pointer text-blue-600" />
                                                    </AlertDialogTrigger>
                                                )}

                                                <AlertDialogContent className="sm:max-w-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            ¿Editar estanque?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cambie los datos a continuación para editar la
                                                            informacio del estanque{" "}
                                                            <span className="font-bold">{e.name}</span>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <PondRegisterForm
                                                        op={0}
                                                        idProp={e.id}
                                                        idFarmProp={id}
                                                        nombreProp={e.name}
                                                        estadoProp={e.status}
                                                        typeProp={e.type}
                                                        capacidadProp={e.capacity}
                                                        areaProp={e.area}
                                                        volumenProp={e.volume}
                                                        profundidadProp={e.depth}
                                                        descripcionProp={e.description}
                                                    />
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Trash className="text-red-600 cursor-pointer" />
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="sm:max-w-2xl">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            ¿Eliminar estanque?
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Se eliminará el
                                                            estanque:{" "}
                                                            <span className="font-bold">{e.name}</span>.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(e.id)}
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
                                <CardContent className="text-lg font-bold">
                                    <p className="flex gap-2">
                                        <Droplet /> Volumen:{" "}
                                        <span className="text-blue-500">{e.volume} m³</span>
                                    </p>
                                    <p className="flex gap-2">
                                        <RulerDimensionLine /> Área:{" "}
                                        <span className="text-blue-500">{e.area} m²</span>
                                    </p>
                                </CardContent>
                                <CardFooter className="flex items-center justify-between gap-4">
                                    <p
                                        className={`whitespace-nowrap capitalize px-3 py-1 rounded-full text-sm font-semibold
                                        ${statusStyles[e.status] || "bg-gray-100 text-gray-700"}`}
                                    >
                                        {statusLabels[e.status] || e.status}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {isToggling && (
                                            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                        )}
                                        <Switch
                                            checked={switchOn}
                                            disabled={isToggling}
                                            onCheckedChange={(checked) =>
                                                handleStatusToggle(e, checked)
                                            }
                                            aria-label={
                                                switchOn
                                                    ? "Inactivar estanque"
                                                    : "Activar estanque"
                                            }
                                        />
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    );
                })}
            </div>
        </>
    );
}
