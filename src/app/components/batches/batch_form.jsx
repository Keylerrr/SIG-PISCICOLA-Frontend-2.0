'use client';

import { useState, useEffect } from 'react';
import {
  Fish,
  Sprout,
  Activity,
  Hash,
  Scale,
  MessageSquare,
  Eraser,
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

export function BatchRegisterForm({
  op,
  idProp,
  idFarmProp,
  specieProp,
  biologicalStateProp,
  statusProp,
  initialQuantityProp,
  minWeightGProp,
  avgWeightGProp,
  maxWeightGProp,
  commentsProp
}) {

  const safe = (v) => v ?? "";

  const [species, setSpecies] = useState([]);
  const [loadingSpecies, setLoadingSpecies] = useState(true);
  const [specie, setSpecie] = useState(safe(specieProp))
  const [biologicalState, setBiologicalState] = useState(safe(biologicalStateProp))
  const [status, setStatus] = useState(safe(statusProp))
  const [initialQuantity, setInitialQuantity] = useState(safe(initialQuantityProp))
  const [minWeightG, setMinWeightG] = useState(safe(minWeightGProp))
  const [avgWeightG, setAvgWeightG] = useState(safe(avgWeightGProp))
  const [maxWeightG, setMaxWeightG] = useState(safe(maxWeightGProp))
  const [comments, setComments] = useState(safe(commentsProp))

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

  const handleReset = () => {
    setSpecie("");
    setBiologicalState("");
    setStatus("");
    setInitialQuantity("");
    setMinWeightG("");
    setAvgWeightG("");
    setMaxWeightG("");
    setComments("");
  };

  const validate = () => {
    const spec = parseInt(specie);
    if (isNaN(spec) || spec <= 0) {
      alert("La especie debe ser un ID válido mayor a 0.");
      return false;
    }

    const validBiologicalStates = ["alevin", "rising", "fatting", "breeding"];
    if (!validBiologicalStates.includes(biologicalState)) {
      alert("Debe seleccionar un estado biológico válido.");
      return false;
    }

    const validStatuses = ["active", "consumed", "finished", "dead"];
    if (!validStatuses.includes(status)) {
      alert("Debe seleccionar un estado válido.");
      return false;
    }
    const qty = parseInt(initialQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert("La cantidad inicial debe ser un número entero positivo mayor a 0.");
      return false;
    }
    const minW = parseFloat(minWeightG);
    if (isNaN(minW) || minW < 0) {
      alert("El peso mínimo debe ser un número válido mayor o igual a 0.");
      return false;
    }
    const avgW = parseFloat(avgWeightG);
    if (isNaN(avgW) || avgW < 0) {
      alert("El peso promedio debe ser un número válido mayor o igual a 0.");
      return false;
    }
    const maxW = parseFloat(maxWeightG);
    if (isNaN(maxW) || maxW < 0) {
      alert("El peso máximo debe ser un número válido mayor o igual a 0.");
      return false;
    }
    if (minW > avgW || avgW > maxW) {
      alert("Los pesos deben estar en orden: mínimo <= promedio <= máximo.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const token = localStorage.getItem("access");

    const payload = {
      specie: parseInt(specie),
      farm: parseInt(idFarmProp),
      origin_type: "initial",
      biological_state: biologicalState,
      status: status,
      comments: comments.trim(),
      initial_quantity: parseInt(initialQuantity),
      min_weight_g: parseFloat(minWeightG),
      avg_weight_g: parseFloat(avgWeightG),
      max_weight_g: parseFloat(maxWeightG),
    };

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${idFarmProp}/batches/`, {
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
          errorData.specie?.[0] || 
          errorData.biological_state?.[0] ||
          errorData.status?.[0] ||
          errorData.non_field_errors?.[0] || 
          `Error ${res.status}: ${res.statusText}`;
        alert(errorMsg);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error("Error registro:", err);
      alert("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  const handleEdit = async () => {
    if (!validate()) return;

    const token = localStorage.getItem("access");

    const payload = {
      specie: parseInt(specie),
      biological_state: biologicalState,
      status: status,
      comments: comments.trim(),
      initial_quantity: parseInt(initialQuantity),
      min_weight_g: parseFloat(minWeightG),
      avg_weight_g: parseFloat(avgWeightG),
      max_weight_g: parseFloat(maxWeightG),
    };

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${idFarmProp}/batches/${idProp}/`, {
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
          errorData.specie?.[0] || 
          errorData.biological_state?.[0] ||
          errorData.status?.[0] ||
          errorData.non_field_errors?.[0] || 
          `Error ${res.status}: ${res.statusText}`;
        alert(errorMsg);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error("Error edición:", err);
      alert("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  return (
    <FieldGroup className="gap-4">
      {/* Identificación del lote */}
      <Section title="Información del lote">
        <Field>
          <Label icon={Fish}>Especie</Label>
          <Select onValueChange={setSpecie} value={specie} disabled={loadingSpecies}>
            <SelectTrigger className="w-full bg-white">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label icon={Sprout}>Estado Biológico</Label>
            <Select onValueChange={setBiologicalState} value={biologicalState}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Escoja un estado biológico" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="alevin">Alevín</SelectItem>
                  <SelectItem value="rising">Levante</SelectItem>
                  <SelectItem value="fatting">Engorde</SelectItem>
                  <SelectItem value="breeding">Reproducción</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <Label icon={Activity}>Estado</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Escoja un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="consumed">Consumido</SelectItem>
                  <SelectItem value="finished">Completado</SelectItem>
                  <SelectItem value="dead">Muerto</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Cantidad y pesos */}
      <Section title="Cantidad y pesos">
        <Field>
          <Label icon={Hash}>Cantidad Inicial</Label>
          <Input 
            type="number" 
            min="1"
            value={initialQuantity} 
            onChange={(e) => setInitialQuantity(e.target.value)} 
            placeholder="Ej: 5000"
            required
            className="bg-white"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <Label icon={Scale}>Peso Mínimo (g)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={minWeightG} 
              onChange={(e) => setMinWeightG(e.target.value)} 
              placeholder="Ej: 0.5"
              required
              className="bg-white"
            />
          </Field>

          <Field>
            <Label icon={Scale}>Peso Promedio (g)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={avgWeightG} 
              onChange={(e) => setAvgWeightG(e.target.value)} 
              placeholder="Ej: 1.0"
              required
              className="bg-white"
            />
          </Field>

          <Field>
            <Label icon={Scale}>Peso Máximo (g)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={maxWeightG} 
              onChange={(e) => setMaxWeightG(e.target.value)} 
              placeholder="Ej: 1.5"
              required
              className="bg-white"
            />
          </Field>
        </div>

        <p className="text-xs text-slate-500">
          Los pesos deben cumplir: mínimo ≤ promedio ≤ máximo.
        </p>
      </Section>

      {/* Comentarios */}
      <Field>
        <Label icon={MessageSquare}>Comentarios</Label>
        <Input 
          value={comments} 
          onChange={(e) => setComments(e.target.value)} 
          placeholder="Comentarios adicionales..."
        />
      </Field>

      <Field
        orientation="horizontal"
        className="mt-2 justify-end gap-3 border-t border-slate-100 pt-4"
      >
        <Button type="button" variant="outline" onClick={handleReset} className="gap-2">
          <Eraser className="h-4 w-4" />
          Borrar
        </Button>
        <Button 
          type="button" 
          onClick={op === 1 ? handleSubmit : handleEdit}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Check className="h-4 w-4" />
          {op === 1 ? "Crear" : "Actualizar"}
        </Button>
      </Field>
    </FieldGroup>
  );
}