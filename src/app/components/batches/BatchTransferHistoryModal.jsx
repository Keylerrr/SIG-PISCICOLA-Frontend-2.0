"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listBatchTransfers } from "@/lib/batchTransferService";

export function BatchTransferHistoryModal({ open, onClose, farmId, pondId }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !farmId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listBatchTransfers(farmId)
      .then((data) => !cancelled && setTransfers(Array.isArray(data) ? data : []))
      .catch((requestError) => !cancelled && setError(requestError.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, farmId]);

  const visibleTransfers = useMemo(
    () =>
      transfers.filter(
        (transfer) =>
          !pondId ||
          String(transfer.source_pond_id) === String(pondId) ||
          String(transfer.destination_pond_id) === String(pondId)
      ),
    [transfers, pondId]
  );

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Historial de transferencias</DialogTitle>
          <DialogDescription>Movimientos automáticos y manuales relacionados con este estanque.</DialogDescription>
        </DialogHeader>
        {loading && <div className="flex justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Cargando…</div>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!loading && !error && visibleTransfers.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">Este estanque todavía no tiene transferencias.</p>
        )}
        <div className="space-y-3">
          {visibleTransfers.map((transfer) => (
            <article key={transfer.id} className="rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{transfer.source_pond_name} → {transfer.destination_pond_name}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{transfer.date}</span>
              </div>
              <p className="mt-2">{transfer.quantity} peces · {transfer.source_batch_code} → {transfer.destination_batch_code}</p>
              <p className="text-xs text-slate-500">{transfer.is_partial ? "Parcial: creó lote derivado" : "Total: conservó el mismo lote"}</p>
              <p className="mt-2 text-slate-600">{transfer.reason}</p>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
