"use client";

import { useState, useEffect } from "react";
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
import { Toaster, toast } from "sonner";

export function ProductionPlanForm({
  op,
  idProp,
  farmProp,
  specieProp,
  nameProp,
  typeProp,
  totalDaysProp,
  expectedMortalityRateProp,
  expectedFinalWeightProp,
  expectedReproductionRateProp,
}) {
  const safe = (v) => v ?? "";

  const [species, setSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);

  const [specie, setSpecie] = useState(specieProp ? specieProp.toString() : "");
  const [name, setName] = useState(safe(nameProp));
  const [type, setType] = useState(safe(typeProp));
  const [totalDays, setTotalDays] = useState(safe(totalDaysProp));
  const [mortalityRate, setMortalityRate] = useState(safe(expectedMortalityRateProp));
  const [finalWeight, setFinalWeight] = useState(safe(expectedFinalWeightProp));
  const [reproductionRate, setReproductionRate] = useState(safe(expectedReproductionRateProp));

  useEffect(() => {
    const fetchSpecies = async () => {
      const token = localStorage.getItem("access");
      try {
        const res = await fetch("https://backend-pongase-trucha.onrender.com/api/species/", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setSpecies(data);
        } else {
          console.error("Error fetching species:", res.statusText);
        }
      } catch (err) {
        console.error("Error fetching species:", err);
      } finally {
        setLoadingSpecies(false);
      }
    };
    fetchSpecies();
  }, []);

  const validate = () => {
    if (!name.trim()) {
      toast.error("El nombre no puede estar vacío.");
      return false;
    }
    if (!specie) {
      toast.error("Debe seleccionar una especie.");
      return false;
    }
    if (!type) {
      toast.error("Debe seleccionar un tipo de producción.");
      return false;
    }

    const days = parseInt(totalDays);
    if (isNaN(days) || days < 0) {
      toast.error("El total de días debe ser un número entero mayor o igual a 0.");
      return false;
    }

    const mort = parseFloat(mortalityRate);
    if (isNaN(mort) || mort < 0 || mort > 100) {
      toast.error("La tasa de mortalidad debe ser un porcentaje entre 0 y 100.");
      return false;
    }

    const weight = parseFloat(finalWeight);
    if (isNaN(weight) || weight <= 0) {
      toast.error("El peso final esperado debe ser mayor a 0.");
      return false;
    }

    if (reproductionRate !== "" && reproductionRate !== null) {
      const repro = parseFloat(reproductionRate);
      if (isNaN(repro) || repro < 0 || repro > 100) {
        toast.error("La tasa de reproducción debe ser un número válido entre 0 y 100.");
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const payload = {
      name: name.trim(),
      type: type,
      total_days: parseInt(totalDays),
      expected_mortality_rate: parseFloat(mortalityRate),
      expected_final_weight: parseFloat(finalWeight),
    };

    // Specie solo se envía en la creación (POST), no en edición (PATCH)
    if (op === 1) {
      payload.specie = parseInt(specie);
    }

    if (reproductionRate !== "" && reproductionRate !== null) {
      payload.expected_reproduction_rate = parseFloat(reproductionRate);
    } else {
      payload.expected_reproduction_rate = null;
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const token = localStorage.getItem("access");
    const payload = buildPayload();

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${farmProp}/production-plans/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        const errorMsg =
          errorData.detail ||
          errorData.name?.[0] ||
          errorData.specie?.[0] ||
          errorData.non_field_errors?.[0] ||
          `Error ${res.status}: ${res.statusText}`;
        toast.error(errorMsg);
        return;
      }

      toast.success("Plan de producción creado correctamente.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Error registro:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  const handleEdit = async () => {
    if (!validate()) return;

    const token = localStorage.getItem("access");
    const payload = buildPayload();

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${farmProp}/production-plans/${idProp}/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        const errorMsg =
          errorData.detail ||
          errorData.name?.[0] ||
          errorData.specie?.[0] ||
          errorData.non_field_errors?.[0] ||
          `Error ${res.status}: ${res.statusText}`;
        toast.error(errorMsg);
        return;
      }

      toast.success("Nueva versión del plan de producción creada correctamente.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Error edición:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  return (
    <FieldGroup>

      <Field>
        <FieldLabel>Nombre del Plan</FieldLabel>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Engorde Tilapia 2026"
          required
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Especie</FieldLabel>
          <Select onValueChange={setSpecie} value={specie} disabled={loadingSpecies || op === 2}>
            <SelectTrigger>
              <SelectValue placeholder={loadingSpecies ? "Cargando..." : "Seleccione especie"} />
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
          <FieldLabel>Tipo de Producción</FieldLabel>
          <Select onValueChange={setType} value={type}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="nursery">Cría (Nursery)</SelectItem>
                <SelectItem value="growout">Engorde (Growout)</SelectItem>
                <SelectItem value="breeding">Reproducción (Breeding)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Duración (Días)</FieldLabel>
          <Input
            type="number"
            min="0"
            value={totalDays}
            onChange={(e) => setTotalDays(e.target.value)}
            placeholder="Ej: 120"
            required
          />
        </Field>

        <Field>
          <FieldLabel>Mortalidad Esperada (%)</FieldLabel>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={mortalityRate}
            onChange={(e) => setMortalityRate(e.target.value)}
            placeholder="Ej: 8.5"
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Peso Final (g)</FieldLabel>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            value={finalWeight}
            onChange={(e) => setFinalWeight(e.target.value)}
            placeholder="Ej: 450"
            required
          />
        </Field>

        <Field>
          <FieldLabel>Tasa de Reproducción (%)</FieldLabel>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={reproductionRate}
            onChange={(e) => setReproductionRate(e.target.value)}
            placeholder="Ej: 5.0 (Opcional)"
          />
        </Field>
      </div>

      <Field orientation="horizontal" className="justify-end gap-3 mt-4">
        <Button
          type="button"
          onClick={op === 1 ? handleSubmit : handleEdit}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          {op === 1 ? "Crear Plan" : "Actualizar Plan"}
        </Button>
      </Field>
    </FieldGroup>
  );
}
