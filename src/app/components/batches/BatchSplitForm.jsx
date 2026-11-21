"use client";

import { useState } from "react";
import { CheckCircle2, GitBranch, Scissors } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { splitUnassignedBatch } from "@/lib/batchSplitService";

export function BatchSplitForm({ farmId, batchId, batchCode, totalQuantity }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const parsedQuantity = Number(quantity);
  const retained = Number.isInteger(parsedQuantity)
    ? Number(totalQuantity) - parsedQuantity
    : Number(totalQuantity);

  const handleSubmit = async () => {
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return toast.error("La cantidad a separar debe ser un entero positivo.");
    }
    if (parsedQuantity >= Number(totalQuantity)) {
      return toast.error("Debes dejar al menos un pez en el lote original.");
    }
    if (!reason.trim()) return toast.error("Indica el motivo de la división.");

    setSubmitting(true);
    try {
      const payload = await splitUnassignedBatch(farmId, batchId, {
        quantity: parsedQuantity,
        reason: reason.trim(),
      });
      setResult(payload);
      toast.success("Lote dividido y genealogía registrada.");
    } catch (error) {
      toast.error(error.message || "No se pudo dividir el lote.");
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Lote dividido correctamente</p>
              <p className="text-sm text-emerald-800">Ambas partes continúan disponibles para asignarlas a estanques.</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><GitBranch className="h-4 w-4 text-purple-600" /> Genealogía creada</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="font-medium text-blue-900">Origen: {result.parent_batch.code}</p>
              <p>{result.retained_quantity} peces</p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3">
              <p className="font-medium text-amber-900">Hijo: {result.child_batch.code}</p>
              <p>{result.split_quantity} peces</p>
            </div>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={() => window.location.reload()}>
          Ver los dos lotes disponibles
        </Button>
      </div>
    );
  }

  return (
    <FieldGroup>
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-medium">{batchCode}</p>
        <p className="text-slate-600">Cantidad actual: {totalQuantity} peces.</p>
      </div>
      <Field>
        <FieldLabel>Cantidad que tendrá el nuevo lote</FieldLabel>
        <Input
          type="number"
          min="1"
          max={Math.max(1, Number(totalQuantity) - 1)}
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          disabled={submitting}
        />
        <p className="text-xs text-slate-500">
          El lote original conservará {retained > 0 ? retained : 0} peces.
        </p>
      </Field>
      <Field>
        <FieldLabel>Motivo</FieldLabel>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej.: separar cantidades para dos estanques"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={submitting}
        />
      </Field>
      <Button type="button" onClick={handleSubmit} disabled={submitting || Number(totalQuantity) < 2}>
        <Scissors className="mr-2 h-4 w-4" />
        {submitting ? "Dividiendo…" : "Dividir lote"}
      </Button>
    </FieldGroup>
  );
}
