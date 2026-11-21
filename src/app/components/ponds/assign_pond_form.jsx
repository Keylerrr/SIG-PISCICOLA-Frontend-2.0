'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GitBranch, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { API_BASE } from "@/lib/apiConfig";

function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function AssignPondForm({
  farmId,
  batchId,
  defaultQuantity,
  sourceSpecieId,
  sourceBiologicalState,
}) {
  const [ponds, setPonds] = useState([]);
  const [loadingPonds, setLoadingPonds] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [pond, setPond] = useState("");
  const [initialQuantity, setInitialQuantity] = useState(defaultQuantity || "");
  const [startDate, setStartDate] = useState(localToday());

  useEffect(() => {
    const fetchPonds = async () => {
      const token = localStorage.getItem("access");
      try {
        const res = await fetch(`${API_BASE}/farms/${farmId}/ponds/`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          setPonds(
            (Array.isArray(data) ? data : []).filter(
              (item) =>
                ["active", "in_use"].includes(item.status) &&
                !item.has_active_cycle &&
                (!item.resident_profile ||
                  (String(item.resident_profile.specie_id) === String(sourceSpecieId) &&
                    item.resident_profile.biological_state === sourceBiologicalState))
            )
          );
        } else {
          toast.error("No se pudieron cargar los estanques disponibles.");
        }
      } catch (err) {
        console.error("Error fetching ponds:", err);
        toast.error("Error de conexión al cargar los estanques.");
      } finally {
        setLoadingPonds(false);
      }
    };
    fetchPonds();
  }, [farmId, sourceSpecieId, sourceBiologicalState]);

  const selectedPond = useMemo(
    () => ponds.find((item) => String(item.id) === String(pond)),
    [ponds, pond]
  );

  const handleSubmit = async () => {
    if (!pond) return toast.error("Debe seleccionar un estanque.");
    const qty = Number(initialQuantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      return toast.error("La cantidad debe ser un número entero positivo.");
    }
    if (qty > Number(defaultQuantity)) {
      return toast.error(`Solo hay ${defaultQuantity} peces disponibles.`);
    }
    if (!startDate) return toast.error("Debe seleccionar una fecha de inicio.");

    setSubmitting(true);
    const token = localStorage.getItem("access");
    const payload = {
      pond: Number(pond),
      batch: Number(batchId),
      initial_quantity: qty,
      start_date: startDate,
      end_date: null,
    };

    try {
      const res = await fetch(`${API_BASE}/farms/${farmId}/pond-batches/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        const extractErrors = (obj) => {
          if (typeof obj === 'string') return obj;
          if (Array.isArray(obj)) return obj.join(', ');
          if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj).map((value) => extractErrors(value)).join(' | ');
          }
          return '';
        };
        toast.error(extractErrors(errorData) || `Error ${res.status}: Ocurrió un error inesperado`);
        return;
      }

      const result = await res.json();
      setAssignmentResult({
        pondId: Number(pond),
        pondName: selectedPond?.name || `Estanque #${pond}`,
        quantity: qty,
        split: result.split_result,
      });
      toast.success(
        result.split_result
          ? "Lote dividido: la parte restante continúa disponible."
          : "Lote asignado correctamente al estanque."
      );
    } catch (err) {
      console.error("Error asignando estanque:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (assignmentResult) {
    const split = assignmentResult.split;
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">
                {split ? "Asignación parcial y división completadas" : "Lote asignado correctamente"}
              </p>
              <p className="text-sm text-emerald-800">
                {assignmentResult.quantity} peces quedaron en {assignmentResult.pondName}.
              </p>
            </div>
          </div>
        </div>

        {split && (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="flex items-center gap-2 font-semibold">
              <GitBranch className="h-4 w-4 text-purple-600" /> Genealogía del remanente
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-blue-50 p-3 text-sm">
                <p className="font-semibold text-blue-900">{split.assigned_batch.code}</p>
                <p>{split.assigned_quantity} peces asignados al estanque.</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3 text-sm">
                <p className="font-semibold text-amber-900">{split.remainder_batch.code}</p>
                <p>{split.remainder_quantity} peces siguen disponibles sin estanque.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              El remanente es un lote hijo trazable y aparecerá en la pestaña Lotes para otra asignación.
            </p>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => {
              window.location.href = `/home/granja/${farmId}/estanque/${assignmentResult.pondId}`;
            }}
          >
            <MapPin className="mr-2 h-4 w-4" /> Ver lote asignado
          </Button>
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            {split ? "Ver remanente disponible" : "Actualizar lotes"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Estanque</FieldLabel>
        <Select onValueChange={setPond} value={pond} disabled={loadingPonds || submitting}>
          <SelectTrigger>
            <SelectValue placeholder={loadingPonds ? "Cargando estanques..." : "Seleccione un estanque"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {ponds.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name} · {item.resident_profile
                    ? `${item.resident_profile.specie_name}, ${item.resident_profile.biological_state}`
                    : `vacío, capacidad ${item.capacity}`}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {!loadingPonds && ponds.length === 0 && (
          <p className="mt-1 text-xs text-amber-700">
            No hay estanques sin ciclo activo que estén vacíos o contengan la misma especie y etapa.
          </p>
        )}
      </Field>

      <Field>
        <FieldLabel>Cantidad que se asignará</FieldLabel>
        <Input
          type="number"
          min="1"
          max={defaultQuantity}
          step="1"
          value={initialQuantity}
          onChange={(event) => setInitialQuantity(event.target.value)}
          disabled={submitting}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Disponibles: {defaultQuantity}. Si asignas menos, el resto se convertirá en un lote hijo disponible y trazable.
        </p>
      </Field>

      <Field>
        <FieldLabel>Fecha de asignación</FieldLabel>
        <Input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          disabled={submitting}
          required
        />
      </Field>

      <Field orientation="horizontal" className="justify-end gap-3 mt-4">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || loadingPonds || ponds.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? "Asignando..." : "Asignar"}
        </Button>
      </Field>
    </FieldGroup>
  );
}
