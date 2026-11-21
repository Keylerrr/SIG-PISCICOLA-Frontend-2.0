"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetchJsonSafe } from "@/lib/apiClient";
import { createBatchTransfer } from "@/lib/batchTransferService";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function BatchTransferForm({
  farmId,
  sourcePondId,
  sourcePondBatchId,
  currentQuantity,
  batchCode,
  sourceSpecieId,
  sourceBiologicalState,
}) {
  const [ponds, setPonds] = useState([]);
  const [destinationPond, setDestinationPond] = useState("");
  const [quantity, setQuantity] = useState(String(currentQuantity || ""));
  const [date, setDate] = useState(localToday());
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiFetchJsonSafe(`/farms/${farmId}/ponds/`, {
      source: "BatchTransferForm.ponds",
    })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw error;
        setPonds(
          (Array.isArray(data) ? data : []).filter(
            (pond) =>
              String(pond.id) !== String(sourcePondId) &&
              ["active", "in_use"].includes(pond.status) &&
              !pond.has_active_cycle &&
              (!pond.resident_profile ||
                (String(pond.resident_profile.specie_id) === String(sourceSpecieId) &&
                  pond.resident_profile.biological_state === sourceBiologicalState))
          )
        );
      })
      .catch((error) => toast.error(error.message || "No se pudieron cargar los estanques."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [farmId, sourcePondId, sourceSpecieId, sourceBiologicalState]);

  const selectedPond = useMemo(
    () => ponds.find((pond) => String(pond.id) === destinationPond),
    [ponds, destinationPond]
  );

  const handleSubmit = async () => {
    const parsedQuantity = Number(quantity);
    if (!destinationPond) return toast.error("Selecciona el estanque destino.");
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return toast.error("La cantidad debe ser un entero positivo.");
    }
    if (parsedQuantity > Number(currentQuantity)) {
      return toast.error(`Solo hay ${currentQuantity} peces disponibles.`);
    }
    if (!reason.trim()) return toast.error("Describe el motivo de la transferencia.");

    setSubmitting(true);
    try {
      const transfer = await createBatchTransfer(farmId, {
        source_pond_batch: Number(sourcePondBatchId),
        destination_pond: Number(destinationPond),
        quantity: parsedQuantity,
        date,
        reason: reason.trim(),
      });
      setResult(transfer);
      toast.success("Transferencia registrada con trazabilidad.");
    } catch (error) {
      toast.error(error.message || "No se pudo realizar la transferencia.");
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
              <p className="font-semibold text-emerald-900">Transferencia completada</p>
              <p className="text-sm text-emerald-800">
                {result.quantity} peces se trasladaron de {result.source_pond_name} a {result.destination_pond_name}.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border p-4 text-sm">
          <p className="font-medium">
            {result.is_partial ? "Transferencia parcial con lote derivado" : "Transferencia total del lote"}
          </p>
          <p className="mt-1 text-slate-600">
            {result.source_batch_code} → {result.destination_batch_code}
          </p>
          {result.is_partial && (
            <p className="mt-1 text-slate-500">
              La genealogía padre → hijo quedó registrada automáticamente.
            </p>
          )}
        </div>
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            window.location.href = `/home/granja/${farmId}/estanque/${result.destination_pond_id}`;
          }}
        >
          <MapPin className="mr-2 h-4 w-4" /> Ver lote en estanque destino
        </Button>
      </div>
    );
  }

  return (
    <FieldGroup>
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <p className="font-medium">{batchCode}</p>
        <p className="text-slate-600">Disponibles para transferir: {currentQuantity} peces.</p>
      </div>
      <Field>
        <FieldLabel>Estanque destino</FieldLabel>
        <Select value={destinationPond} onValueChange={setDestinationPond} disabled={loading || submitting}>
          <SelectTrigger><SelectValue placeholder={loading ? "Cargando estanques…" : "Selecciona el destino"} /></SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {ponds.map((pond) => (
                <SelectItem key={pond.id} value={String(pond.id)}>
                  {pond.name} · {pond.resident_profile
                    ? `${pond.resident_profile.specie_name}, ${pond.resident_profile.biological_state}, ${pond.resident_profile.current_quantity} peces`
                    : `vacío, capacidad ${pond.capacity}`}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {!loading && ponds.length === 0 && (
          <p className="text-xs text-amber-700">
            No hay otro estanque disponible sin ciclo activo que esté vacío o contenga la misma especie y etapa biológica.
          </p>
        )}
        {selectedPond && (
          <p className="text-xs text-slate-500">
            Destino: {selectedPond.name}. Solo convivirá con peces de la misma especie y etapa.
          </p>
        )}
      </Field>
      <Field>
        <FieldLabel>Cantidad</FieldLabel>
        <Input type="number" min="1" max={currentQuantity} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} disabled={submitting} />
        <p className="text-xs text-slate-500">
          Una cantidad menor crea un lote hijo; la cantidad completa mueve el mismo lote.
        </p>
      </Field>
      <Field>
        <FieldLabel>Fecha</FieldLabel>
        <Input type="date" max={localToday()} value={date} onChange={(event) => setDate(event.target.value)} disabled={submitting} />
      </Field>
      <Field>
        <FieldLabel>Motivo</FieldLabel>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Ej.: redistribución por densidad del estanque"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={submitting}
        />
      </Field>
      <Button type="button" onClick={handleSubmit} disabled={submitting || loading || ponds.length === 0}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        {submitting ? "Transfiriendo…" : "Confirmar transferencia"}
      </Button>
    </FieldGroup>
  );
}
