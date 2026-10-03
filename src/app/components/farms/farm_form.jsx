"use client";

import { useState, useEffect, useMemo } from "react";
import { useFlags } from '@/hooks/useFlags';
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const API_BASE = "https://backend-pongase-trucha.onrender.com/api";
const WATER_SOURCES = [
  { value: "river", label: "Río" },
  { value: "stream", label: "Quebrada" },
  { value: "lake", label: "Lago/Laguna" },
  { value: "spring", label: "Manantial" },
  { value: "reservoir", label: "Embalse" },
  { value: "deep_well", label: "Pozo profundo" },
  { value: "municipal", label: "Acueducto municipal" },
  { value: "irrigation_canal", label: "Canal de riego" },
];

const isValidWaterSource = (val) => val && WATER_SOURCES.some((s) => s.value === val);

async function getBackendError(res) {
  try {
    const data = await res.clone().json();
    const fieldError = Object.entries(data)
      .filter(([k]) => !["detail", "message", "non_field_errors"].includes(k))
      .find(([_, v]) => Array.isArray(v) && v.length > 0)?.[1]?.[0];

    return fieldError || data.detail || data.message || data.non_field_errors?.[0] || `Error ${res.status}`;
  } catch {
    const raw = await res.clone().text().catch(() => "");
    return raw || `Error ${res.status}: ${res.statusText}`;
  }
}

export function FarmRegisterForm({
  op,
  idProp,
  nombreProp,
  departamentoProp,
  ciudadProp,
  direccionProp,
  areaProp,
  waterSourceProp,
}) {
  const [nombre, setNombre] = useState(nombreProp ?? "");
  const [selectedDepartment, setSelectedDepartment] = useState(departamentoProp ?? "");
  const [selectedCity, setSelectedCity] = useState(ciudadProp ?? "");
  const [direccion, setDireccion] = useState(direccionProp ?? "");
  const [totalArea, setArea] = useState(areaProp ?? "");
  const [waterSource, setWaterSource] = useState(() =>
    isValidWaterSource(waterSourceProp) ? waterSourceProp : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [departamentos, setDepartamentos] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [productores, setProductores] = useState([]);
  const [selectedProductor, setSelectedProductor] = useState("");

  const { flags, loading } = useFlags();
  const canAssignManager = flags?.farm?.assignManager;

  const ciudadesMap = useMemo(
    () => new Map(ciudades.map((c) => [String(c.id), c.name])),
    [ciudades]
  );

  useEffect(() => {
    fetch(`${API_BASE}/departments/`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then(setDepartamentos)
      .catch((err) => console.error("Error cargando departamentos:", err));
  }, []);

  useEffect(() => {
    if (!selectedDepartment) {
      setCiudades([]);
      if (selectedCity) setSelectedCity("");
      return;
    }
    fetch(`${API_BASE}/cities/?department_id=${selectedDepartment}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => {
        setCiudades(data);
        if (selectedCity && !data.some((c) => String(c.id) === String(selectedCity))) {
          setSelectedCity("");
        }
      })
      .catch((err) => console.error("Error cargando ciudades:", err));
  }, [selectedDepartment]);

  useEffect(() => {
    if (!canAssignManager) return;
    const token = localStorage.getItem("access");
    fetch(`${API_BASE}/users/productor/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then(setProductores)
      .catch((err) => console.error("Error cargando productores:", err));
  }, [canAssignManager]);

  const handleReset = () => {
    setNombre("");
    setSelectedDepartment("");
    setSelectedCity("");
    setDireccion("");
    setArea("");
    setWaterSource("");
    setSelectedProductor("");
  };

  const validate = () => {
    const errors = [];

    if (!nombre.trim()) errors.push("El nombre de la granja es obligatorio.");
    else if (nombre.trim().length < 3) errors.push("El nombre debe tener al menos 3 caracteres.");
    else if (nombre.trim().length > 100) errors.push("El nombre no puede superar los 100 caracteres.");

    if (!selectedDepartment) errors.push("Debe seleccionar un departamento.");
    if (!selectedCity) errors.push("Debe seleccionar una ciudad/municipio.");
    if (!direccion.trim()) errors.push("La dirección es obligatoria.");
    else if (direccion.trim().length > 200) errors.push("La dirección no puede superar los 200 caracteres.");

    const area = parseFloat(totalArea);
    if (isNaN(area) || area <= 0) errors.push("El área debe ser un número positivo mayor a 0.");
    else if (area > 100000) errors.push("El área no puede superar las 100,000 hectáreas.");

    if (selectedDepartment && selectedCity && ciudades.length > 0) {
      if (!ciudades.some((c) => String(c.id) === String(selectedCity))) {
        errors.push("La ciudad no pertenece al departamento seleccionado.");
      }
    }

    if (canAssignManager && !selectedProductor) {
      errors.push("Debe seleccionar un productor responsable.");
    }

    if (errors.length > 0) {
      errors.forEach((msg) => toast.error(msg));
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    name: nombre.trim(),
    department: Number(selectedDepartment),
    city: Number(selectedCity),
    address: direccion.trim(),
    total_area_ha: parseFloat(totalArea),
    ...(isValidWaterSource(waterSource) && { water_source: waterSource }),
    ...(canAssignManager && selectedProductor && { productor_id: Number(selectedProductor) }),
  });

  const sendToBackend = async (url, method) => {
    const token = localStorage.getItem("access");
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload()),
    });

    if (!res.ok) {
      const errorMsg = await getBackendError(res);
      throw new Error(errorMsg);
    }
    return res.json();
  };

  const handleSubmit = async () => {
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await sendToBackend(`${API_BASE}/farms/`, "POST");
      toast.success("Granja creada correctamente");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error("Error al crear:", error);
      toast.error(error.message || "Error al crear la granja");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await sendToBackend(`${API_BASE}/farms/${idProp}/`, "PATCH");
      toast.success("Granja actualizada correctamente");
      setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error("Error al editar:", error);
      toast.error(error.message || "Error al actualizar la granja");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-center text-slate-500">Cargando formulario...</p>;
  }

  return (
    <FieldGroup className="space-y-4">
      {/* 👇 Nombre */}
      <Field>
        <FieldLabel>Nombre de la Granja *</FieldLabel>
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Finca La Esperanza"
          maxLength={100}
          disabled={isSubmitting}
          required
        />
        <FieldDescription>Mínimo 3, máximo 100 caracteres.</FieldDescription>
      </Field>

      { }
      {canAssignManager && (
        <Field>
          <FieldLabel>Productor Responsable *</FieldLabel>
          <Select
            onValueChange={setSelectedProductor}
            value={selectedProductor}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un productor" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {productores.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.lastname}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      )}

      { }
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Departamento *</FieldLabel>
          <Select
            onValueChange={(val) => {
              setSelectedDepartment(val);
              setSelectedCity("");
            }}
            value={String(selectedDepartment)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {departamentos.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>Ciudad/Municipio *</FieldLabel>
          <Select
            onValueChange={setSelectedCity}
            value={String(selectedCity)}
            disabled={isSubmitting || !selectedDepartment}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                !selectedDepartment ? "Primero seleccione departamento" :
                  ciudades.length === 0 ? "Cargando..." : "Seleccione"
              } />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ciudades.length === 0 && selectedDepartment ? (
                  <SelectItem value="no-cities" disabled>Sin ciudades disponibles</SelectItem>
                ) : (
                  ciudades.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))
                )}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      { }
      <Field>
        <FieldLabel>Dirección *</FieldLabel>
        <Input
          value={direccion}
          onChange={(e) => setDireccion(e.target.value)}
          placeholder="Ej: Km 5 vía principal, vereda El Roble"
          maxLength={200}
          disabled={isSubmitting}
          required
        />
        <FieldDescription>Máximo 200 caracteres.</FieldDescription>
      </Field>

      { }
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Área Total (hectáreas) *</FieldLabel>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max="100000"
            value={totalArea}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Ej: 12.50"
            disabled={isSubmitting}
            required
          />
          <FieldDescription>Use punto para decimales.</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>Fuente de Agua</FieldLabel>
          <Select
            onValueChange={setWaterSource}
            value={waterSource}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una fuente" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {WATER_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription className="text-xs text-slate-500">
            Opcional.
          </FieldDescription>
        </Field>
      </div>

      { }
      <Field orientation="horizontal" className="justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
          Borrar
        </Button>
        <Button
          type="button"
          onClick={op === 1 ? handleSubmit : handleEdit}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {op === 1 ? "Creando..." : "Actualizando..."}
            </span>
          ) : op === 1 ? "Crear Granja" : "Actualizar"}
        </Button>
      </Field>
    </FieldGroup>
  );
}
