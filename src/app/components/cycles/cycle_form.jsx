'use client';

import { useState, useEffect } from 'react';
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
import { Toaster, toast } from 'sonner';

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";

/**
 * CycleRegisterForm — pond-scoped.
 * op=1 → create, op=2 → edit
 * Requires farmProp and pondProp for all API calls.
 */
export function CycleRegisterForm({
  op,
  idProp,
  farmProp,
  pondProp,
  specieProp,
  productionPlanProp,
  nameProp,
  startDateProp,
  estimatedFinishDateProp,
  stateProp,
  commentsProp,
}) {
  const safe = (v) => v ?? "";

  const [species, setSpecies] = useState([]);
  const [productionPlans, setProductionPlans] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [specie, setSpecie] = useState(specieProp ? specieProp.toString() : "");
  const [productionPlan, setProductionPlan] = useState(productionPlanProp ? productionPlanProp.toString() : "");
  const [name, setName] = useState(safe(nameProp));
  const [startDate, setStartDate] = useState(safe(startDateProp));
  const [estimatedFinishDate, setEstimatedFinishDate] = useState(safe(estimatedFinishDateProp));
  const [state, setState] = useState(safe(stateProp));
  const [comments, setComments] = useState(safe(commentsProp));

  useEffect(() => {
    const fetchSpecies = async () => {
      const token = localStorage.getItem("access");
      try {
        const res = await fetch(`${API_BASE}/species/`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) setSpecies(await res.json());
      } catch (err) {
        console.error("Error fetching species:", err);
      } finally {
        setLoadingSpecies(false);
      }
    };
    fetchSpecies();
  }, []);

  useEffect(() => {
    if (!farmProp) return;
    const fetchProductionPlans = async () => {
      const token = localStorage.getItem("access");
      try {
        const res = await fetch(`${API_BASE}/farms/${farmProp}/production-plans/`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (res.ok) setProductionPlans(await res.json());
      } catch (err) {
        console.error("Error fetching production plans:", err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchProductionPlans();
  }, [farmProp]);

  const filteredProductionPlans = productionPlans.filter(
    (plan) => plan.specie === parseInt(specie)
  );

  const validate = () => {
    if (!name.trim()) { toast.error("El nombre no puede estar vacío."); return false; }
    if (!specie) { toast.error("Debe seleccionar una especie."); return false; }
    if (!productionPlan) { toast.error("Debe seleccionar un plan de producción."); return false; }
    if (!startDate) { toast.error("Debe seleccionar una fecha de inicio."); return false; }
    if (op === 1 && !estimatedFinishDate) {
      toast.error("Debe seleccionar una fecha estimada de finalización.");
      return false;
    }
    if (estimatedFinishDate && estimatedFinishDate <= startDate) {
      toast.error("La fecha estimada de finalización debe ser posterior a la fecha de inicio.");
      return false;
    }
    const validStates = ["in_progress", "paused", "finished", "cancelled"];
    if (!validStates.includes(state)) { toast.error("Debe seleccionar un estado válido."); return false; }
    
    return true;
  };

  const buildPayload = () => ({
    pond: parseInt(pondProp),
    specie: parseInt(specie),
    production_plan: parseInt(productionPlan),
    name: name.trim(),
    start_date: startDate,
    estimated_finish_date: estimatedFinishDate || undefined,
    state,
    comments: comments.trim(),
  });

  const extractError = (errorData) => {
    if (typeof errorData === "string") return errorData;
    return (
      errorData.detail ||
      errorData.name?.[0] ||
      errorData.specie?.[0] ||
      errorData.production_plan?.[0] ||
      errorData.pond?.[0] ||
      errorData.non_field_errors?.[0] ||
      Object.values(errorData).flat().join(" | ")
    );
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/farms/${farmProp}/ponds/${pondProp}/cycles/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        toast.error(extractError(errorData) || `Error ${res.status}: ${res.statusText}`);
        return;
      }
      toast.success("Ciclo creado correctamente.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("Error registro:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  const handleEdit = async () => {
    if (!validate()) return;
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/farms/${farmProp}/ponds/${pondProp}/cycles/${idProp}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        toast.error(extractError(errorData) || `Error ${res.status}: ${res.statusText}`);
        return;
      }
      toast.success("Ciclo actualizado correctamente.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("Error edición:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  const handleFinish = async () => {
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/farms/${farmProp}/ponds/${pondProp}/cycles/${idProp}/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          finish_date: new Date().toISOString().split("T")[0],
          state: "finished",
        }),
      });
      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        toast.error(extractError(errorData) || `Error ${res.status}: ${res.statusText}`);
        return;
      }
      toast.success("Ciclo finalizado correctamente.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("Error finishing cycle:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  const handleDelete = async () => {
    const token = localStorage.getItem("access");
    try {
      const res = await fetch(`${API_BASE}/farms/${farmProp}/ponds/${pondProp}/cycles/${idProp}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        toast.error(extractError(errorData) || `Error ${res.status}: ${res.statusText}`);
        return;
      }
      toast.success("Ciclo eliminado correctamente.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      console.error("Error deleting cycle:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  return (
    <FieldGroup>
      <Toaster position="top-center" />

      <Field>
        <FieldLabel>Especie</FieldLabel>
        <Select onValueChange={setSpecie} value={specie} disabled={loadingSpecies}>
          <SelectTrigger>
            <SelectValue placeholder={loadingSpecies ? "Cargando especies..." : "Seleccione una especie"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {species.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Plan de Producción</FieldLabel>
        <Select onValueChange={setProductionPlan} value={productionPlan} disabled={loadingPlans || !specie}>
          <SelectTrigger>
            <SelectValue placeholder={loadingPlans ? "Cargando planes..." : "Seleccione un plan"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {filteredProductionPlans.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Nombre del Ciclo</FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Ciclo de Engorde 2026"
          required
        />
      </Field>

      <Field>
        <FieldLabel>Fecha de Inicio</FieldLabel>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
      </Field>

      {op === 1 && (
        <Field>
          <FieldLabel>Fecha Estimada de Finalización</FieldLabel>
          <Input
            type="date"
            value={estimatedFinishDate}
            onChange={(e) => setEstimatedFinishDate(e.target.value)}
            min={startDate}
            required
          />
        </Field>
      )}

      <Field>
        <FieldLabel>Estado</FieldLabel>
        <Select onValueChange={setState} value={state}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione un estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="finished">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Comentarios</FieldLabel>
        <Input
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Comentarios adicionales..."
        />
      </Field>

      <Field orientation="horizontal" className="justify-end gap-3 mt-4">
        <Button
          type="button"
          onClick={op === 1 ? handleSubmit : handleEdit}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {op === 1 ? "Crear Ciclo" : "Actualizar"}
        </Button>
        {op === 2 && (
          <>
            <Button
              type="button"
              onClick={handleFinish}
              className="bg-green-600 hover:bg-green-700"
            >
              Finalizar
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </Button>
          </>
        )}
      </Field>
    </FieldGroup>
  );
}
