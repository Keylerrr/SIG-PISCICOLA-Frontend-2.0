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
  Ruler, 
  Gauge,  
  FileText,  
  Save,
  Fish,
  Box,
  BookOpenText,
  LandPlot,
  Cuboid,
  Trash,
  WavesArrowDown
} from "lucide-react";

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
    <>      
      <FieldGroup className="space-y-0">
        
        {}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          
          {}
          <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <h3 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
              <BookOpenText className="w-3.5 h-3.5 text-blue-600" />
              Información
            </h3>
            
            <div className="space-y-0">
              <Field>
                <FieldLabel className="flex items-center gap-1 text-xs text-blue-900">
                  <FileText className="w-3 h-3 text-blue-600" />
                  Nombre *
                </FieldLabel>
                <Input 
                  value={nombre} 
                  onChange={(e) => setNombre(e.target.value)} 
                  placeholder="Ej: Estanque Principal"
                  className="h-8 text-xs bg-white border-blue-200 focus:border-blue-500"
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-1 text-xs text-blue-900">
                  <Gauge className="w-3 h-3 text-blue-600" />
                  Estado *
                </FieldLabel>
                <Select onValueChange={setEstado} value={estado} disabled={isSubmitting}>
                  <SelectTrigger className="h-8 bg-white border-blue-200 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="active">🟢 Activo</SelectItem>
                      <SelectItem value="inactive">🔴 Inactivo</SelectItem>
                      <SelectItem value="in_use">🔵 En uso</SelectItem>
                      <SelectItem value="cleaning">🟡 En limpieza</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-1 text-xs text-blue-900">
                  <Box className="w-3 h-3 text-blue-600" />
                  Tipo *
                </FieldLabel>
                <Select onValueChange={setType} value={type} disabled={isSubmitting}>
                  <SelectTrigger className="h-8 bg-white border-blue-200 text-xs">
                    <SelectValue placeholder="Tipo" />
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
          </div>

          {}
          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
            <h3 className="text-xs font-semibold text-emerald-900 mb-2 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-emerald-600" />
              Dimensiones
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              <Field>
                <FieldLabel className="flex items-center gap-1 text-[11px] text-emerald-900">
                  <Fish className="w-2.5 h-2.5 text-emerald-600" />
                  Capacidad (n° peces)
                </FieldLabel>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={capacidad} 
                  onChange={(e) => setCapacidad(e.target.value)} 
                  placeholder="0"
                  className="h-7 text-[11px] bg-white border-emerald-200 focus:border-emerald-500 placeholder:text-gray-400"
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-1 text-[11px] text-emerald-900">
                  <LandPlot className="w-2.5 h-2.5 text-emerald-600" />
                  Área (m²)
                </FieldLabel>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={area} 
                  onChange={(e) => setArea(e.target.value)} 
                  placeholder="0"
                  className="h-7 text-[11px] bg-white border-emerald-200 focus:border-emerald-500 placeholder:text-gray-400"
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-1 text-[11px] text-emerald-900">
                  <Cuboid className="w-2.5 h-2.5 text-emerald-600" />
                  Volumen (m³)
                </FieldLabel>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={volumen} 
                  onChange={(e) => setVolumen(e.target.value)} 
                  placeholder="0"
                  className="h-7 text-[11px] bg-white border-emerald-200 focus:border-emerald-500 placeholder:text-gray-400"
                  disabled={isSubmitting}
                  required
                />
              </Field>

              <Field>
                <FieldLabel className="flex items-center gap-1 text-[11px] text-emerald-900">
                  <WavesArrowDown className="w-2.5 h-2.5 text-emerald-600" />
                  Profundidad (m)
                </FieldLabel>
                <Input 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={profundidad} 
                  onChange={(e) => setProfundidad(e.target.value)} 
                  placeholder="0"
                  className="h-7 text-[11px] bg-white border-emerald-200 focus:border-emerald-500 placeholder:text-gray-400"
                  disabled={isSubmitting}
                  required
                />
              </Field>
            </div>
          </div>
        </div>

        {}
        <Field>
          <FieldLabel className="text-xs text-slate-900">
            Descripción <span className="text-slate-500 font-normal">(opcional)</span>
          </FieldLabel>
          <Input 
            value={descripcion} 
            onChange={(e) => setDescripcion(e.target.value)} 
            placeholder="Detalles adicionales..."
            className="h-8 text-xs bg-white border-slate-200 focus:border-slate-500"
            disabled={isSubmitting}
          />
        </Field>

        {}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleReset} 
            disabled={isSubmitting}
            className="h-8 text-xs min-w-[90px] hover:bg-slate-100"
          >
            <Trash className="w-3 h-3 mr-1" />
            Borrar
          </Button>
          
          <Button 
            type="button" 
            onClick={op === 1 ? handleSubmit : handleEdit}
            disabled={isSubmitting}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 min-w-[110px]"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-1">⟳</span>
                {op === 1 ? "Creando..." : "Actualizando..."}
              </>
            ) : (
              <>
                <Save className="w-3 h-3 mr-1" />
                {op === 1 ? "Crear" : "Actualizar"}
              </>
            )}
          </Button>
        </div>
      </FieldGroup>
    </>
  );
}