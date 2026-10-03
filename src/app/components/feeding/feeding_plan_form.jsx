"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { feedingService } from "@/lib/feedingService";
import { toast } from "sonner";

function normalizeFieldErrors(fieldErrors) {
  if (!fieldErrors) {
    return [];
  }

  if (Array.isArray(fieldErrors)) {
    return fieldErrors.map((message) => ({ message: typeof message === "string" ? message : JSON.stringify(message) }));
  }

  return [{ message: fieldErrors.toString() }];
}

export function FeedingPlanForm({ farmId, pondId, cycleId, onSuccess }) {
  const [form, setForm] = useState({
    feeding_schedule: "",
    start_date: "",
    end_date: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [occupiedRanges, setOccupiedRanges] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  useEffect(() => {
    async function loadSchedules() {
      try {
        const data = await feedingService.getFeedingSchedules(farmId, { is_current: true });
        setSchedules(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error cargando cronogramas para el plan:", error);
      } finally {
        setLoadingSchedules(false);
      }
    }

    loadSchedules();
  }, [farmId, cycleId]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const overlapRange = useMemo(() => {
    if (!form.start_date || !form.end_date) return null;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (start >= end) return "La fecha final debe ser posterior a la fecha de inicio.";

    const conflict = occupiedRanges.find((range) => {
      const rangeStart = new Date(range.start_date);
      const rangeEnd = new Date(range.end_date);
      return !(end < rangeStart || start > rangeEnd);
    });

    return conflict ? `Solapa con el rango ${conflict.start_date} - ${conflict.end_date}` : null;
  }, [form.start_date, form.end_date, occupiedRanges]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (!form.feeding_schedule || !form.start_date || !form.end_date) {
      const newErrors = {};
      if (!form.feeding_schedule) newErrors.feeding_schedule = ["Debe seleccionar un cronograma."];
      if (!form.start_date) newErrors.start_date = ["Debe indicar la fecha de inicio."];
      if (!form.end_date) newErrors.end_date = ["Debe indicar la fecha de fin."];
      setErrors(newErrors);
      return;
    }

    if (overlapRange) {
      setErrors({ end_date: [overlapRange] });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        feeding_schedule: Number(form.feeding_schedule),
        start_date: form.start_date,
        end_date: form.end_date,
      };
      await feedingService.createFeedingPlan(farmId, pondId, cycleId, payload);
      toast.success("Plan de alimentación creado.");
      setForm({ feeding_schedule: "", start_date: "", end_date: "" });
      setErrors({});
      onSuccess?.();
    } catch (error) {
      if (error.status === 400 && error.payload && typeof error.payload === "object") {
        setErrors(error.payload);
      } else {
        toast.error("No se pudo crear el plan.");
        console.error(error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 lg:grid-cols-3">
        <Field>
          <FieldLabel>Cronograma</FieldLabel>
          <Select value={form.feeding_schedule || undefined} onValueChange={(value) => setField("feeding_schedule", value === "__NONE__" ? "" : value)}>
            <SelectTrigger>
              <SelectValue placeholder={loadingSchedules ? "Cargando..." : "Selecciona un cronograma"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__NONE__">Selecciona</SelectItem>
              {schedules.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name || `Cronograma #${item.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={normalizeFieldErrors(errors.feeding_schedule)} />
        </Field>

        <Field>
          <FieldLabel>Fecha de inicio</FieldLabel>
          <Input type="date" value={form.start_date} onChange={(event) => setField("start_date", event.target.value)} />
          <FieldError errors={normalizeFieldErrors(errors.start_date)} />
        </Field>

        <Field>
          <FieldLabel>Fecha de fin</FieldLabel>
          <Input type="date" value={form.end_date} onChange={(event) => setField("end_date", event.target.value)} />
          <FieldError errors={normalizeFieldErrors(errors.end_date)} />
        </Field>
      </div>

      {overlapRange && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {overlapRange}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="inline-flex items-center gap-2">
          {saving ? "Guardando…" : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}
