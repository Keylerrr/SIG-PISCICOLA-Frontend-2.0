"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { validateClientDocument } from "@/lib/salesUtils";

const EMPTY_CLIENT = {
  client_type: "",
  name: "",
  document_type: "",
  document_number: "",
  phone: "",
  email: "",
  address: "",
  observations: "",
};

export function getEmptyClientForm() {
  return { ...EMPTY_CLIENT };
}

export function ClientForm({ formData, onChange, onSubmit, mode = "create" }) {
  const handleClientTypeChange = (value) => {
    let next = { ...formData, client_type: value };
    if (value === "juridico") {
      next.document_type = "NIT";
    } else if (value === "natural" && next.document_type === "NIT") {
      next.document_type = "";
    }
    onChange(next);
  };

  const handleDocumentTypeChange = (value) => {
    onChange({ ...formData, document_type: value });
  };

  const docError = validateClientDocument(
    formData.client_type,
    formData.document_type
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const err = validateClientDocument(
          formData.client_type,
          formData.document_type
        );
        if (err) return;
        onSubmit(e);
      }}
      className="space-y-4 mt-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de cliente</Label>
          <Select
            value={formData.client_type}
            onValueChange={handleClientTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="natural">Natural</SelectItem>
              <SelectItem value="juridico">Jurídica</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nombre / Razón social</Label>
          <Input
            required
            value={formData.name}
            onChange={(e) => onChange({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo de documento</Label>
          <Select
            value={formData.document_type}
            onValueChange={handleDocumentTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {formData.client_type !== "juridico" && (
                <>
                  <SelectItem value="CC">CC</SelectItem>
                  <SelectItem value="CE">CE</SelectItem>
                  <SelectItem value="PAS">Pasaporte</SelectItem>
                </>
              )}
              <SelectItem value="NIT">NIT</SelectItem>
            </SelectContent>
          </Select>
          {docError && (
            <p className="text-xs text-red-600">{docError}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Número de documento</Label>
          <Input
            required
            value={formData.document_number}
            onChange={(e) =>
              onChange({ ...formData, document_number: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Teléfono</Label>
          <Input
            value={formData.phone}
            onChange={(e) => onChange({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => onChange({ ...formData, email: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Dirección</Label>
        <Input
          value={formData.address}
          onChange={(e) => onChange({ ...formData, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Input
          value={formData.observations}
          onChange={(e) =>
            onChange({ ...formData, observations: e.target.value })
          }
        />
      </div>
      <DialogFooter>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {mode === "edit" ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </DialogFooter>
    </form>
  );
}
