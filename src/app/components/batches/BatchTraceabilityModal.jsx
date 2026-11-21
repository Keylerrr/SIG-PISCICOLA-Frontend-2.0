"use client";

import { useEffect, useState } from "react";
import { GitBranch, Loader2, MapPin, Scale, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBatchTraceability } from "@/lib/batchService";

function Empty({ children }) {
  return <p className="text-xs text-slate-400 italic">{children}</p>;
}

export function BatchTraceabilityModal({ open, onClose, farmId, batchId, batchLabel }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !farmId || !batchId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBatchTraceability(farmId, batchId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, farmId, batchId]);

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className="gap-5 overflow-y-auto p-5 sm:p-6"
        style={{
          width: "calc(100vw - 2rem)",
          height: "calc(100vh - 2rem)",
          maxWidth: "none",
          maxHeight: "none",
        }}
      >
        <DialogHeader className="border-b pb-4 pr-10">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-purple-600" />
            Trazabilidad — {batchLabel}
          </DialogTitle>
          <DialogDescription>
            Origen, divisiones, estanques, ciclos y crecimiento registrado para la familia del lote.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando trazabilidad…
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!loading && data && (
          <div className="grid gap-4 lg:grid-cols-12">
            <section className="space-y-3 rounded-xl border border-slate-200 p-4 lg:col-span-3">
              <h3 className="flex items-center gap-2 border-b pb-3 font-semibold"><ShoppingCart className="h-4 w-4 text-slate-500" /> Origen</h3>
              {data.origins?.length ? data.origins.map((origin, index) => (
                <div key={`${origin.batch_id}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className="font-medium">{origin.batch_code}</p>
                  <p className="mt-1 text-slate-600">{origin.type === "purchase" ? `Compra #${origin.purchase_id}` : "Registro inicial"} · {origin.date}</p>
                  {origin.supplier && <p className="mt-1">Proveedor: {origin.supplier} ({origin.supplier_document})</p>}
                  {origin.invoice_number && <p className="mt-1">Factura: {origin.invoice_number}</p>}
                </div>
              )) : <Empty>Sin origen externo registrado.</Empty>}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 p-4 lg:col-span-4">
              <h3 className="flex items-center gap-2 border-b pb-3 font-semibold"><GitBranch className="h-4 w-4 text-purple-600" /> Genealogía</h3>
              <p className="text-xs text-slate-500">
                Lote consultado: {data.batch?.code || batchLabel}. Las flechas muestran el lote origen y cada remanente derivado.
              </p>
              {data.genealogy?.length ? data.genealogy.map((link) => (
                <div key={`${link.parent_id}-${link.child_id}`} className="text-sm rounded-lg border border-purple-100 bg-purple-50/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800">Origen: {link.parent_code}</span>
                    <span aria-hidden="true">→</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 font-medium text-amber-800">Remanente: {link.child_code}</span>
                  </div>
                  <p className="mt-2 text-slate-600">Cantidad separada: {link.quantity} peces</p>
                </div>
              )) : <Empty>Este lote no ha sido dividido ni derivado.</Empty>}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 p-4 lg:col-span-5">
              <h3 className="flex items-center gap-2 border-b pb-3 font-semibold"><MapPin className="h-4 w-4 text-blue-600" /> Recorrido productivo</h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {data.pond_assignments?.map((assignment) => (
                  <div key={assignment.id} className="rounded-lg border-l-4 border-blue-400 bg-blue-50/50 p-3 text-sm">
                    <p className="font-medium">{assignment.batch_code} · {assignment.pond}</p>
                    <p className="mt-1">{assignment.start_date} → {assignment.end_date || "actual"}</p>
                    <p className="mt-1">{assignment.initial_quantity} iniciales · {assignment.current_quantity} actuales</p>
                  </div>
                ))}
                {data.transfers?.map((transfer) => (
                  <div key={transfer.id} className="rounded-lg border-l-4 border-amber-400 bg-amber-50/50 p-3 text-sm">
                    <p className="font-medium">Traslado · {transfer.date}</p>
                    <p className="mt-1">{transfer.from_pond} → {transfer.to_pond} · {transfer.quantity} peces</p>
                    <p className="mt-1 text-slate-500">{transfer.reason}</p>
                  </div>
                ))}
                {!data.pond_assignments?.length && !data.transfers?.length && (
                  <Empty>Sin movimientos productivos registrados.</Empty>
                )}
              </div>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 p-4 lg:col-span-12">
              <h3 className="flex items-center gap-2 border-b pb-3 font-semibold"><Scale className="h-4 w-4 text-emerald-600" /> Crecimiento</h3>
              {data.growth?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead><tr className="border-b text-left text-slate-500"><th className="py-2 pr-3 font-medium">Fecha</th><th className="pr-3 font-medium">Ciclo</th><th className="pr-3 font-medium">Mín.</th><th className="pr-3 font-medium">Prom.</th><th className="pr-3 font-medium">Máx.</th><th className="font-medium">Mortalidad</th></tr></thead>
                    <tbody>{data.growth.map((point, index) => (
                      <tr key={`${point.cycle_id}-${point.date}-${index}`} className="border-b last:border-0">
                        <td className="py-2.5 pr-3">{point.date}</td><td className="pr-3">{point.cycle}</td><td className="pr-3">{point.min_weight_g} g</td><td className="pr-3">{point.avg_weight_g} g</td><td className="pr-3">{point.max_weight_g} g</td><td>{point.mortality_quantity}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              ) : <Empty>El lote todavía no tiene evaluaciones biométricas.</Empty>}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
