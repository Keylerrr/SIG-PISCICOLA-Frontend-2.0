'use client';

import { useState } from 'react';
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
import { toast, Toaster } from "sonner";
import {
  Gauge,
  FileText,
  AlignLeft,
  Save,
  Fish,
  Box,
  LandPlot,
  Cuboid,
  Trash,
  WavesArrowDown,
  Loader2,
} from "lucide-react";

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

function Dot({ className }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${className}`} />;
}

export function PondRegisterForm({
  op,
  idProp,
  idFarmProp,
  nombreProp,
  estadoProp,
  capacidadProp,
  areaProp,
  volumenProp,
  profundidadProp,
  descripcionProp,
  typeProp  
}) {

  const safe = (v) => v ?? "";

  const [nombre, setNombre] = useState(safe(nombreProp))
  const [estado, setEstado] = useState(safe(estadoProp))
  const [capacidad, setCapacidad] = useState(safe(capacidadProp))
  const [area, setArea] = useState(safe(areaProp))
  const [volumen, setVolumen] = useState(safe(volumenProp))
  const [profundidad, setProfundidad] = useState(safe(profundidadProp))
  const [descripcion, setDescripcion] = useState(safe(descripcionProp));
  const [type, setType] = useState(safe(typeProp));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleReset = () => {
    setNombre("");
    setEstado("");
    setCapacidad("");
    setArea("");
    setVolumen("");
    setProfundidad("");
    setDescripcion("");
    setType("");
  };

  const validate = () => {
    if (!nombre.trim()) {
      toast.error("El nombre no puede estar vacío");
      return false;
    }
    if (!["active", "inactive", "in_use", "cleaning"].includes(estado)) {
      toast.error("Debe seleccionar un estado válido");
      return false;
    }

    const validTypes = ["dirt", "concrete", "geomembrane", "floating_cage", "raceway", "round_tank"];
    if (!validTypes.includes(type)) {
      toast.error("Debe seleccionar un tipo de estanque válido");
      return false;
    }
    const cap = parseFloat(capacidad);
    if (isNaN(cap) || cap <= 0) {
      toast.error("La capacidad debe ser un número positivo mayor a 0");
      return false;
    }
    const ar = parseFloat(area);
    if (isNaN(ar) || ar <= 0) {
      toast.error("El área debe ser un número positivo válido");
      return false;
    }
    const vol = parseFloat(volumen);
    if (isNaN(vol) || vol <= 0) {
      toast.error("El volumen debe ser un número positivo válido");
      return false;
    }
    const dep = parseFloat(profundidad);
    if (isNaN(dep) || dep <= 0) {
      toast.error("La profundidad debe ser un número positivo válido");
      return false;
    }

    if (descripcion && descripcion.trim().length > 500) {
      toast.error("La descripción no puede superar los 500 caracteres");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const token = localStorage.getItem("access");

    const payload = {
      name: nombre.trim(),
      status: estado,
      type: type,  
      capacity: parseFloat(capacidad),
      area: parseFloat(area),
      volume: parseFloat(volumen),
      depth: parseFloat(profundidad),
      description: descripcion.trim(),  
    };

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${idFarmProp}/ponds/`, {
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
          errorData.type?.[0] ||
          errorData.non_field_errors?.[0] || 
          `Error ${res.status}: ${res.statusText}`;
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      toast.success("Estanque creado correctamente");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Error registro:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente");
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    const token = localStorage.getItem("access");

    const payload = {
      name: nombre.trim(),
      status: estado,
      type: type,  
      capacity: parseFloat(capacidad),
      area: parseFloat(area),
      volume: parseFloat(volumen),
      depth: parseFloat(profundidad),
      description: descripcion.trim(),
    };

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${idFarmProp}/ponds/${idProp}/`, {
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
          errorData.type?.[0] ||
          errorData.non_field_errors?.[0] || 
          `Error ${res.status}: ${res.statusText}`;
        toast.error(errorMsg);
        setIsSubmitting(false);
        return;
      }

      toast.success("Estanque actualizado correctamente");
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error("Error edición:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente");
      setIsSubmitting(false);
    }
  };

  return (
    <FieldGroup className="gap-4">
      {/* Información */}
      <Section title="Información del estanque">
        <Field>
          <Label icon={FileText}>Nombre *</Label>
          <Input 
            value={nombre} 
            onChange={(e) => setNombre(e.target.value)} 
            placeholder="Ej: Estanque Principal"
            className="bg-white"
            disabled={isSubmitting}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label icon={Gauge}>Estado *</Label>
            <Select onValueChange={setEstado} value={estado} disabled={isSubmitting}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2"><Dot className="bg-green-500" />Activo</span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2"><Dot className="bg-red-500" />Inactivo</span>
                  </SelectItem>
                  <SelectItem value="in_use">
                    <span className="flex items-center gap-2"><Dot className="bg-blue-500" />En uso</span>
                  </SelectItem>
                  <SelectItem value="cleaning">
                    <span className="flex items-center gap-2"><Dot className="bg-amber-500" />En limpieza</span>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <Label icon={Box}>Tipo *</Label>
            <Select onValueChange={setType} value={type} disabled={isSubmitting}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Seleccione un tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="geomembrane">Geomembrana</SelectItem>
                  <SelectItem value="concrete">Concreto</SelectItem>
                  <SelectItem value="dirt">Tierra</SelectItem>
                  <SelectItem value="floating_cage">Jaula flotante</SelectItem>
                  <SelectItem value="raceway">Canal de flujo</SelectItem>
                  <SelectItem value="round_tank">Tanque circular</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      {/* Dimensiones */}
      <Section title="Dimensiones y capacidad">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label icon={Fish}>Capacidad (n° peces)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={capacidad} 
              onChange={(e) => setCapacidad(e.target.value)} 
              placeholder="0"
              className="bg-white"
              disabled={isSubmitting}
              required
            />
          </Field>

          <Field>
            <Label icon={LandPlot}>Área (m²)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={area} 
              onChange={(e) => setArea(e.target.value)} 
              placeholder="0"
              className="bg-white"
              disabled={isSubmitting}
              required
            />
          </Field>

          <Field>
            <Label icon={Cuboid}>Volumen (m³)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={volumen} 
              onChange={(e) => setVolumen(e.target.value)} 
              placeholder="0"
              className="bg-white"
              disabled={isSubmitting}
              required
            />
          </Field>

          <Field>
            <Label icon={WavesArrowDown}>Profundidad (m)</Label>
            <Input 
              type="number" 
              step="0.01"
              min="0"
              value={profundidad} 
              onChange={(e) => setProfundidad(e.target.value)} 
              placeholder="0"
              className="bg-white"
              disabled={isSubmitting}
              required
            />
          </Field>
        </div>
      </Section>

      {/* Descripción */}
      <Field>
        <Label icon={AlignLeft}>
          Descripción <span className="font-normal text-slate-500">(opcional)</span>
        </Label>
        <Input 
          value={descripcion} 
          onChange={(e) => setDescripcion(e.target.value)} 
          placeholder="Detalles adicionales..."
          disabled={isSubmitting}
        />
      </Field>

      {/* Acciones */}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleReset} 
          disabled={isSubmitting}
          className="gap-2"
        >
          <Trash className="h-4 w-4" />
          Borrar
        </Button>
        
        <Button 
          type="button" 
          onClick={op === 1 ? handleSubmit : handleEdit}
          disabled={isSubmitting}
          className="min-w-[120px] gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {op === 1 ? "Creando..." : "Actualizando..."}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {op === 1 ? "Crear" : "Actualizar"}
            </>
          )}
        </Button>
      </div>
    </FieldGroup>
  );
}