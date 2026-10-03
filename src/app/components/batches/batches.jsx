"use client";

import { useEffect, useState, useMemo } from "react";
import { Scale, Pencil, Trash, MoveRight, Fish, Link, FileDown } from "lucide-react";
import { BatchReportModal } from "./BatchReportModal";
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
import { Toaster, toast } from "sonner";
import { BatchRegisterForm } from "./batch_form";
import { AssignPondForm } from "../ponds/assign_pond_form";
import { AssignCycleForm } from "../cycles/assign_cycle_form";
import { Button } from "@/components/ui/button";
import { apiFetchJsonSafe, safeFetch } from "@/lib/apiClient";
import { assertPathSegment } from "@/lib/apiConfig";
import { useAuthReady } from "@/hooks/useAuthReady";

const BIO_STATE_LABELS = {
  alevin: "Alevín",
  rising: "Levante",
  fatting: "Engorde",
  breeding: "Reproducción",
};

const STATUS_LABELS = {
  active: "Activo",
  consumed: "Consumido",
  finished: "Completado",
  dead: "Muerto",
};

const STATUS_COLORS = {
  active: "bg-blue-100 text-blue-700",
  consumed: "bg-yellow-100 text-yellow-700",
  finished: "bg-green-100 text-green-700",
  dead: "bg-red-100 text-red-700",
};

export function Batches({ id, pondId, cycleId, search = "", statusFilter = null }) {
  // pondId is required for pond-scoped cycle assignment
  const [batches, setBatches] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  // { batchId, batchLabel } | null
  const [reportBatch, setReportBatch] = useState(null);
  const { authReady, hasToken } = useAuthReady();

  useEffect(() => {
    if (!authReady || !hasToken) return;

    const fetchSpecies = async () => {
      try {
        const result = await apiFetchJsonSafe("/species/", {
          source: "Batches.fetchSpecies",
        });
        if (result.data && Array.isArray(result.data)) {
          setSpecies(result.data);
        } else if (result.error) {
          console.error("Error fetching species:", result.error.message);
        }
      } catch (err) {
        console.error("Error fetching species:", err);
      }
    };
    fetchSpecies();
  }, [authReady, hasToken]);

  const specieMap = useMemo(() => {
    return species.reduce((acc, curr) => ({ ...acc, [curr.id]: curr.name }), {});
  }, [species]);

  const filteredBatches = useMemo(() => {
    let result = batches;

    // Filter by statusFilter ("active" | "history") when provided
    if (statusFilter) {
      result = result.filter((item) => {
        let b = item;
        if (item.pond_batch_detail?.batch) {
          b = item.pond_batch_detail.batch;
        } else if (typeof item.batch === 'object' && item.batch !== null) {
          b = item.batch;
        }
        if (statusFilter === "active") return b.status === "active";
        return b.status !== "active"; // history: everything else
      });
    }

    // Si no hay búsqueda, retornamos lo ya filtrado
    if (!search?.trim()) return result;

    const term = search.toLowerCase().trim();

    return result.filter((item) => {
      let b = item;
      if (item.pond_batch_detail?.batch) {
        b = item.pond_batch_detail.batch;
      } else if (typeof item.batch === 'object' && item.batch !== null) {
        b = item.batch;
      }

      const specieName = b.specie?.name || specieMap[b.specie?.id || b.specie] || String(b.specie || "");

      return (
        BIO_STATE_LABELS[b.biological_state]?.toLowerCase().includes(term) ||
        STATUS_LABELS[b.status]?.toLowerCase().includes(term) ||
        b.id?.toString().includes(term) ||
        specieName.toLowerCase().includes(term) ||
        (b.comments || "").toLowerCase().includes(term)
      );
    });
  }, [batches, search, specieMap, statusFilter]);

  useEffect(() => {
    if (!authReady || !hasToken || !id) return;

    const fetchBatches = async () => {
      setLoading(true);
      try {
        assertPathSegment(id, "farmId");
        if (pondId) assertPathSegment(pondId, "pondId");
        if (cycleId) assertPathSegment(cycleId, "cycleId");

        if (!cycleId && pondId) {
          const [pbResult, bResult] = await Promise.all([
            apiFetchJsonSafe(`/farms/${id}/pond-batches/?pond=${pondId}`, {
              source: "Batches.pondBatches",
            }),
            apiFetchJsonSafe(`/farms/${id}/batches/?pond=${pondId}`, {
              source: "Batches.batchesByPond",
            }),
          ]);

          if (pbResult.error || bResult.error) {
            throw new Error(
              pbResult.error?.message ||
              bResult.error?.message ||
              "Error fetching batches for pond"
            );
          }

          const pondBatches = pbResult.data;
          const batches = bResult.data;

          const cResult = await apiFetchJsonSafe(
            `/farms/${id}/ponds/${pondId}/cycles/`,
            { source: "Batches.cycles" }
          );
          const activeCycles = Array.isArray(cResult.data) ? cResult.data : [];

          const cycleBatchesPromises = activeCycles
            .filter((c) => c.state === "in_progress" || c.state === "paused")
            .map(async (c) => {
              try {
                const cbResult = await apiFetchJsonSafe(
                  `/farms/${id}/ponds/${pondId}/cycles/${c.id}/cycle-batches/`,
                  { source: `Batches.cycleBatches.${c.id}` }
                );
                return {
                  cycle: c,
                  cycleBatches: Array.isArray(cbResult.data) ? cbResult.data : [],
                };
              } catch (err) {
                console.error(`Error cycle-batches ${c.id}:`, err);
                return { cycle: c, cycleBatches: [] };
              }
            });
          const cyclesWithBatches = await Promise.all(cycleBatchesPromises);

          const pondBatchToCycle = {};
          cyclesWithBatches.forEach(({ cycle, cycleBatches }) => {
            if (Array.isArray(cycleBatches)) {
              cycleBatches.forEach(cb => {
                const pbId = cb.pond_batch_detail?.id || cb.pond_batch || cb.pond_batch_id;
                if (pbId) {
                  pondBatchToCycle[pbId] = cycle;
                }
              });
            }
          });

          const merged = (Array.isArray(pondBatches) ? pondBatches : []).map(pb => {
            const nestedBatch = (Array.isArray(batches) ? batches : []).find(b => b.id === pb.batch);
            return {
              ...pb,
              batch: nestedBatch || pb.batch,
              assigned_cycle: pondBatchToCycle[pb.id] || null
            };
          });

          setBatches(merged);
          setLoading(false);
          return;
        }

        let path = `/farms/${id}/batches/?sin_estanque=true`;
        if (cycleId && pondId) {
          path = `/farms/${id}/ponds/${pondId}/cycles/${cycleId}/cycle-batches/`;
        } else if (cycleId) {
          path = `/farms/${id}/cycles/${cycleId}/cycle-batches/`;
        }

        const result = await apiFetchJsonSafe(path, {
          source: "Batches.fetchBatches",
        });

        if (result.error) {
          throw result.error;
        }

        setBatches(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        console.error("Error cargando lotes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [authReady, hasToken, id, cycleId, pondId]);

  const handleDelete = async (cycleBatchId) => {
    try {
      const path =
        pondId && cycleId
          ? `/farms/${id}/ponds/${pondId}/cycles/${cycleId}/cycle-batches/${cycleBatchId}/`
          : `/farms/${id}/cycle-batches/${cycleBatchId}/`;

      const { response, error } = await safeFetch(path, {
        method: "DELETE",
        source: "Batches.handleDelete",
      });

      if (error) throw error;
      if (!response?.ok) {
        throw new Error("Error al desvincular el lote");
      }
      toast.success("Lote desvinculado del ciclo correctamente");
      setBatches((prev) => prev.filter((b) => b.id !== cycleBatchId));
    } catch (error) {
      console.error(error);
      toast.error("Error al desvincular el lote");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-50">
        <p className="text-slate-500">Cargando lotes...</p>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      <div className="max-w-6xl mx-auto grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-4">
        {filteredBatches.length === 0 && !search && (
          <div className="col-span-full bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
            {statusFilter === "history" ? (
              <>
                <span className="text-4xl mb-3 block">🗂️</span>
                <p className="text-slate-400 font-medium">Sin historial de lotes</p>
                <p className="text-slate-300 text-sm mt-1">Los lotes finalizados, consumidos o muertos aparecerán aquí.</p>
              </>
            ) : (
              <>
                <span className="text-4xl mb-3 block">🐟</span>
                <p className="text-slate-400 font-medium">No hay lotes activos</p>
                <p className="text-slate-300 text-sm mt-1">Asigna un lote a este estanque para comenzar.</p>
              </>
            )}
          </div>
        )}
        {filteredBatches.length === 0 && search && (
          <p className="text-center col-span-full text-gray-500 text-lg">
            No se encontraron lotes 😢
          </p>
        )}

        {filteredBatches.map((item) => {
          const isCycleBatch = !!item.pond_batch_detail;
          const isPondBatch = typeof item.batch === 'object' && item.batch !== null && !isCycleBatch;

          const b = isCycleBatch ? item.pond_batch_detail.batch : (isPondBatch ? item.batch : item);
          const displayId = b.id || item.id;

          const displayQuantity = isCycleBatch ? item.quantity : (isPondBatch ? (item.current_quantity ?? item.initial_quantity) : b.initial_quantity);
          const displayMinWeight = isCycleBatch ? item.min_weight_g : b.min_weight_g;
          const displayAvgWeight = isCycleBatch ? item.avg_weight_g : b.avg_weight_g;
          const displayMaxWeight = isCycleBatch ? item.max_weight_g : b.max_weight_g;
          const specieName = b.specie?.name || specieMap[b.specie?.id || b.specie] || String(b.specie || "");

          return (
            <Card
              key={item.id}
              className="group border hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <CardHeader>
                <CardTitle className="text-2xl font-bold group-hover:text-blue-600">
                  Lote #{displayId} {isCycleBatch && item.pond_batch_detail?.pond && <span className="text-sm font-normal text-slate-500 ml-2">({item.pond_batch_detail.pond.name})</span>}
                </CardTitle>

                <CardDescription className="flex items-center gap-2 font-bold text-lg mt-1">
                  <Fish className="w-5 h-5" />
                  {specieName} - {BIO_STATE_LABELS[b.biological_state] || b.biological_state}
                </CardDescription>

                <CardAction>
                  <div className="flex gap-3 items-center">
                    {/* ── Generar Reporte Histórico ── */}
                    <button
                      title="Generar Reporte Histórico"
                      onClick={() => {
                        setReportBatch({ batchId: b.id, batchLabel: `Lote #${b.id}` })
                      }}
                      className="text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                    >
                      <FileDown className="text-slate-400 hover:text-purple-600 transition-colors cursor-pointer" />
                    </button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Pencil className="text-blue-600 cursor-pointer hover:text-blue-700 transition-colors" />
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[95vw] max-w-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Editar lote #{b.id}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Edita la información del lote
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <BatchRegisterForm
                          op={0}
                          idProp={b.id}
                          idFarmProp={id}
                          specieProp={b.specie?.id?.toString() || b.specie?.toString() || ""}
                          biologicalStateProp={b.biological_state}
                          statusProp={b.status}
                          initialQuantityProp={b.initial_quantity}
                          minWeightGProp={b.min_weight_g}
                          avgWeightGProp={b.avg_weight_g}
                          maxWeightGProp={b.max_weight_g}
                          commentsProp={b.comments ?? ""}
                        />
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cerrar</AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {!!cycleId && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Trash className="text-red-600 cursor-pointer hover:text-red-700 transition-colors" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[95vw] max-w-md">
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Desvincular lote?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se desvinculará el lote #{displayId} del ciclo actual.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Desvincular
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardAction>
              </CardHeader>

              <CardContent className="text-md space-y-2">
                <p><strong>Cant. {isCycleBatch ? 'en Ciclo' : (isPondBatch ? 'Actual' : 'Inicial')}:</strong> {displayQuantity}</p>
                <div className="flex gap-2 items-center text-sm text-slate-600">
                  <Scale className="w-4 h-4" />
                  <span>Min: {displayMinWeight}g</span> |
                  <span>Prom: {displayAvgWeight}g</span> |
                  <span>Max: {displayMaxWeight}g</span>
                </div>
                {b.comments ? (
                  <p className="text-sm text-slate-500">
                    <strong>Comentarios:</strong> {b.comments}
                  </p>
                ) : null}
              </CardContent>

              <CardFooter className="flex flex-col gap-4 items-start">
                <div className="w-full flex justify-between items-center">
                  <p
                    className={`capitalize px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {STATUS_LABELS[b.status] || b.status}
                  </p>
                </div>

                {!pondId && !cycleId && !b.pond && !item.pond && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full flex gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                        <MoveRight className="w-4 h-4" />
                        Asignar a Estanque
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Asignar Lote #{b.id} a Estanque</DialogTitle>
                        <DialogDescription>
                          Seleccione el estanque de destino para este lote.
                        </DialogDescription>
                      </DialogHeader>
                      <AssignPondForm
                        farmId={id}
                        batchId={b.id}
                        defaultQuantity={b.initial_quantity}
                      />
                    </DialogContent>
                  </Dialog>
                )}
                {!!pondId && !cycleId && !item.assigned_cycle && !b.active_cycle && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full flex gap-2 border-green-200 text-green-700 hover:bg-green-50">
                        <Link className="w-4 h-4" />
                        Vincular a Ciclo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Vincular Lote #{displayId} a Ciclo</DialogTitle>
                        <DialogDescription>
                          Seleccione el ciclo al que desea añadir este lote. Solo se muestran los ciclos en progreso.
                        </DialogDescription>
                      </DialogHeader>
                      <AssignCycleForm
                        farmId={id}
                        pondId={pondId}
                        pondBatchId={item.id}
                        defaultQuantity={displayQuantity}
                      />
                    </DialogContent>
                  </Dialog>
                )}
                {!!pondId && !cycleId && (item.assigned_cycle || b.active_cycle) && (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm font-medium">
                    <Link className="w-4 h-4" />
                    Ciclo: {item.assigned_cycle?.name || "Asignado"}
                  </div>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* ── Batch Report Modal (single instance, controlled by reportBatch state) ── */}
      <BatchReportModal
        open={!!reportBatch}
        onClose={() => setReportBatch(null)}
        farmId={id}
        batchId={reportBatch?.batchId}
        batchLabel={reportBatch?.batchLabel ?? ""}
      />
    </>
  );
}
