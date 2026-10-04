"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Fish,
  Layers,
  CalendarDays,
  TrendingDown,
  Scale,
  Repeat,
  Check,
} from "lucide-react";
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

/* ---------- Piezas visuales (sin lógica de negocio) ---------- */

function Label({ icon: Icon, children }) {
  return (
    <FieldLabel className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <Icon className="h-4 w-4 text-blue-600" />
      {children}
    </FieldLabel>
  );
}

function Section({ title, children }) {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

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
    <FieldGroup className="gap-4">
      {/* Información general */}
      <Section title="Información general">
        <Field>
          <Label icon={ClipboardList}>Nombre del Plan</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Engorde Tilapia 2026"
            required
            className="bg-white"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label icon={Fish}>Especie</Label>
            <Select onValueChange={setSpecie} value={specie} disabled={loadingSpecies || op === 2}>
              <SelectTrigger className="w-full bg-white">
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
            <Label icon={Layers}>Tipo de Producción</Label>
            <Select onValueChange={setType} value={type}>
              <SelectTrigger className="w-full bg-white">
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
      </Section>

      {/* Parámetros esperados */}
      <Section title="Parámetros esperados">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label icon={CalendarDays}>Duración (Días)</Label>
            <Input
              type="number"
              min="0"
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              placeholder="Ej: 120"
              required
              className="bg-white"
            />
          </Field>

          <Field>
            <Label icon={TrendingDown}>Mortalidad Esperada (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={mortalityRate}
              onChange={(e) => setMortalityRate(e.target.value)}
              placeholder="Ej: 8.5"
              required
              className="bg-white"
            />
          </Field>

          <Field>
            <Label icon={Scale}>Peso Final (g)</Label>
            <Input
              type="number"
              step="0.1"
              min="0.1"
              value={finalWeight}
              onChange={(e) => setFinalWeight(e.target.value)}
              placeholder="Ej: 450"
              required
              className="bg-white"
            />
          </Field>

          <Field>
            <Label icon={Repeat}>Tasa de Reproducción (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={reproductionRate}
              onChange={(e) => setReproductionRate(e.target.value)}
              placeholder="Ej: 5.0 (Opcional)"
              className="bg-white"
            />
          </Field>
        </div>
      </Section>

      <Field
        orientation="horizontal"
        className="mt-2 justify-end gap-3 border-t border-slate-100 pt-4"
      >
        <Button
          type="button"
          onClick={op === 1 ? handleSubmit : handleEdit}
          className="w-full gap-2 bg-blue-600 hover:bg-blue-700 sm:w-auto"
        >
          <Check className="h-4 w-4" />
          {op === 1 ? "Crear Plan" : "Actualizar Plan"}
        </Button>
      </Field>
    </FieldGroup>
  );
}