'use client';

import { useState, useEffect } from 'react';
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

export function AssignPondForm({
  farmId,
  batchId,
  defaultQuantity
}) {
  const [ponds, setPonds] = useState([]);
  const [loadingPonds, setLoadingPonds] = useState(true);
  
  const [pond, setPond] = useState("");
  const [initialQuantity, setInitialQuantity] = useState(defaultQuantity || "");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const fetchPonds = async () => {
      const token = localStorage.getItem("access");
      try {
        const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${farmId}/ponds/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data = await res.json();
          setPonds(data);
        } else {
          console.error("Error fetching ponds:", res.statusText);
        }
      } catch (err) {
        console.error("Error fetching ponds:", err);
      } finally {
        setLoadingPonds(false);
      }
    };
    fetchPonds();
  }, [farmId]);

  const handleSubmit = async () => {
    if (!pond) {
      toast.error("Debe seleccionar un estanque.");
      return;
    }
    
    const qty = parseInt(initialQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("La cantidad debe ser un número entero positivo.");
      return;
    }

    if (!startDate) {
      toast.error("Debe seleccionar una fecha de inicio.");
      return;
    }

    const token = localStorage.getItem("access");

    const payload = {
      pond: parseInt(pond),
      batch: parseInt(batchId),
      initial_quantity: qty,
      start_date: startDate,
      end_date: endDate ? endDate : null
    };

    try {
      const res = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${farmId}/pond-batches/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.clone().json().catch(() => ({}));
        
        // Función para extraer todos los mensajes de error del backend sin importar la estructura
        const extractErrors = (obj) => {
          if (typeof obj === 'string') return obj;
          if (Array.isArray(obj)) return obj.join(', ');
          if (typeof obj === 'object' && obj !== null) {
            return Object.values(obj)
              .map(val => extractErrors(val))
              .join(' | ');
          }
          return '';
        };

        const parsedError = extractErrors(errorData);
        const errorMsg = parsedError ? parsedError : `Error ${res.status}: Ocurrió un error inesperado`;
        
        toast.error(errorMsg);
        return;
      }

      toast.success("Lote asignado correctamente al estanque.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Error asignando estanque:", err);
      toast.error("Error de conexión. Verifica tu internet e intenta nuevamente.");
    }
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel>Estanque</FieldLabel>
        <Select onValueChange={setPond} value={pond} disabled={loadingPonds}>
          <SelectTrigger>
            <SelectValue placeholder={loadingPonds ? "Cargando estanques..." : "Seleccione un estanque"} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {ponds.map((item) => (
                <SelectItem key={item.id} value={item.id.toString()}>
                  {item.name} (Capacidad: {item.capacity})
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel>Cantidad Inicial</FieldLabel>
        <Input 
          type="number" 
          min="1"
          value={initialQuantity} 
          onChange={(e) => setInitialQuantity(e.target.value)} 
          placeholder="Ej: 5000"
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

      <Field>
        <FieldLabel>Fecha de Fin (Opcional)</FieldLabel>
        <Input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)} 
        />
        <p className="text-xs text-slate-500 mt-1">Déjalo vacío si el lote sigue activo en el estanque.</p>
      </Field>

      <Field orientation="horizontal" className="justify-end gap-3 mt-4">
        <Button 
          type="button" 
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Asignar
        </Button>
      </Field>
    </FieldGroup>
  );
}
