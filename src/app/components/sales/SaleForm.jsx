"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { salesService } from "@/lib/salesService";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/salesConstants";
import {
  calculateSaleTotal,
  formatApiError,
  formatCurrency,
  getClassificationLabel,
  getHarvestLabel,
  getSellableClassifications,
} from "@/lib/salesUtils";

const EMPTY_DETAIL = () => ({
  harvest_classification: "",
  quantity_g: "",
  fish_count: "",
  price: "",
});

const fieldGrid = "grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4";

export function SaleForm({ farmId, clients = [], onSuccess, onCancel }) {
  const [harvests, setHarvests] = useState([]);
  const [harvestsLoading, setHarvestsLoading] = useState(true);
  const [selectedHarvestId, setSelectedHarvestId] = useState("");
  const [classifications, setClassifications] = useState([]);
  const [classificationsLoading, setClassificationsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lineErrors, setLineErrors] = useState({});

  const [formData, setFormData] = useState({
    client: "",
    invoice_number: "",
    payment_method: "",
    date: new Date().toISOString().split("T")[0],
    observations: "",
    details: [EMPTY_DETAIL()],
  });

  useEffect(() => {
    if (!farmId) return;
    let mounted = true;
    (async () => {
      setHarvestsLoading(true);
      try {
        const data = await salesService.getHarvestsWithSellableStock(farmId);
        if (mounted) setHarvests(data);
      } catch (err) {
        toast.error(formatApiError(err));
      } finally {
        if (mounted) setHarvestsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [farmId]);

  useEffect(() => {
    if (!farmId || !selectedHarvestId) {
      setClassifications([]);
      return;
    }
    let mounted = true;
    (async () => {
      setClassificationsLoading(true);
      try {
        const data = await salesService.getHarvestClassifications(
          farmId,
          selectedHarvestId
        );
        if (mounted) setClassifications(getSellableClassifications(data));
      } catch (err) {
        toast.error(formatApiError(err));
        if (mounted) setClassifications([]);
      } finally {
        if (mounted) setClassificationsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [farmId, selectedHarvestId]);

  const total = useMemo(
    () => calculateSaleTotal(formData.details),
    [formData.details]
  );

  const getClassification = (id) =>
    classifications.find((c) => c.id === parseInt(id, 10));

  const validateDetails = () => {
    const errors = {};
    const used = new Set();

    if (!selectedHarvestId) {
      toast.error("Seleccione una cosecha antes de agregar detalles.");
      return false;
    }

    if (!formData.client) {
      toast.error("Seleccione un cliente.");
      return false;
    }

    if (!formData.payment_method) {
      toast.error("Seleccione un método de pago.");
      return false;
    }

    if (formData.details.length === 0) {
      toast.error("Debe agregar al menos un detalle a la venta.");
      return false;
    }

    for (let i = 0; i < formData.details.length; i++) {
      const det = formData.details[i];
      const clsId = det.harvest_classification;
      if (!clsId) {
        errors[i] = "Seleccione una clasificación.";
        continue;
      }
      if (used.has(clsId)) {
        errors[i] = "Esta clasificación ya está en la venta.";
        continue;
      }
      used.add(clsId);

      const cls = getClassification(clsId);
      if (!cls) {
        errors[i] = "Clasificación no válida.";
        continue;
      }

      const qty = Number(det.quantity_g);
      const fish = Number(det.fish_count);
      const availW = Number(cls.available_weight_g ?? 0);
      const availF = Number(cls.available_fish_count ?? 0);

      if (qty > availW) {
        errors[i] = `Peso máximo disponible: ${availW} g`;
      } else if (fish > availF) {
        errors[i] = `Cantidad máxima de peces: ${availF}`;
      } else if (!qty || qty <= 0) {
        errors[i] = "Ingrese un peso válido.";
      } else if (!fish || fish <= 0) {
        errors[i] = "Ingrese cantidad de peces válida.";
      } else if (!det.price || Number(det.price) <= 0) {
        errors[i] = "Ingrese el valor total de la línea.";
      }
    }

    setLineErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleHarvestChange = (value) => {
    setSelectedHarvestId(value);
    setFormData((prev) => ({ ...prev, details: [EMPTY_DETAIL()] }));
    setLineErrors({});
  };

  const addDetail = () => {
    if (!selectedHarvestId) {
      toast.error("Seleccione una cosecha primero.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      details: [...prev.details, EMPTY_DETAIL()],
    }));
  };

  const removeDetail = (index) => {
    const newDetails = [...formData.details];
    newDetails.splice(index, 1);
    setFormData({ ...formData, details: newDetails });
    setLineErrors({});
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index] = { ...newDetails[index], [field]: value };
    setFormData({ ...formData, details: newDetails });
    setLineErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateDetails()) {
      toast.error("Revise los errores en el formulario.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        client: parseInt(formData.client, 10),
        invoice_number: formData.invoice_number,
        payment_method: formData.payment_method,
        observations: formData.observations,
        date: formData.date,
        details: formData.details.map((d) => ({
          harvest_classification: parseInt(d.harvest_classification, 10),
          quantity_g: Number(d.quantity_g),
          fish_count: parseInt(d.fish_count, 10),
          price: Number(d.price),
        })),
      };

      await salesService.createSale(farmId, payload);
      toast.success("Venta registrada");
      onSuccess?.();
    } catch (err) {
      if (err.status === 401) {
        window.location.href = "/login";
        return;
      }
      toast.error(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const availableClassificationsForRow = (rowIndex) => {
    const usedIds = formData.details
      .map((d, i) => (i !== rowIndex ? d.harvest_classification : null))
      .filter(Boolean);
    return classifications.filter(
      (c) => !usedIds.includes(c.id.toString())
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5 mt-1">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 border-b border-slate-100 pb-2">
          Datos de la venta
        </h3>
        <div className={fieldGrid}>
        <div className="space-y-2 md:col-span-2">
          <Label>Cliente *</Label>
          <Select
            value={formData.client}
            onValueChange={(v) => setFormData({ ...formData, client: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccione cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 w-full">
          <Label>Fecha *</Label>
          <Input
            type="date"
            required
            className="w-full"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
          />
        </div>
        <div className="space-y-2 w-full">
          <Label>Número de factura</Label>
          <Input
            className="w-full"
            value={formData.invoice_number}
            onChange={(e) =>
              setFormData({ ...formData, invoice_number: e.target.value })
            }
          />
        </div>
        <div className="space-y-2 w-full">
          <Label>Método de pago *</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(v) =>
              setFormData({ ...formData, payment_method: v })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccione..." />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observaciones</Label>
          <Input
            className="w-full"
            value={formData.observations}
            onChange={(e) =>
              setFormData({ ...formData, observations: e.target.value })
            }
          />
        </div>
        </div>
      </section>

      <section className="border-t border-slate-200 pt-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-600 border-b border-slate-100 pb-2">
          Cosecha y detalles
        </h3>
        <div className="space-y-2">
          <Label>Cosecha *</Label>
          {harvestsLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          ) : (
            <Select
              value={selectedHarvestId}
              onValueChange={handleHarvestChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione cosecha para cargar clasificaciones" />
              </SelectTrigger>
              <SelectContent>
                {harvests.map((h) => (
                  <SelectItem key={h.id} value={h.id.toString()}>
                    {getHarvestLabel(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!harvestsLoading && harvests.length === 0 && (
            <p className="text-sm text-amber-700">
              No hay cosechas con peso disponible para vender.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-1">
          <p className="text-sm font-medium text-slate-700">Líneas de detalle</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDetail}
            disabled={!selectedHarvestId || classificationsLoading}
          >
            <Plus className="w-4 h-4 mr-1" /> Agregar detalle
          </Button>
        </div>

        {classificationsLoading && selectedHarvestId && (
          <div className="py-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        )}

        {selectedHarvestId &&
          !classificationsLoading &&
          classifications.length === 0 && (
            <p className="text-sm text-slate-500 py-4 px-4 bg-slate-50 rounded-lg border border-slate-100">
              Esta cosecha no tiene clasificaciones con peso disponible para vender.
            </p>
          )}

        {formData.details.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 px-4 bg-slate-50 rounded-lg border border-slate-100">
            Agrega líneas de detalle a la venta.
          </p>
        ) : (
          <div className="space-y-3">
            {formData.details.map((det, idx) => {
              const cls = getClassification(det.harvest_classification);
              return (
                <div
                  key={idx}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-lg relative"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-600"
                    onClick={() => removeDetail(idx)}
                  >
                    <X className="w-4 h-4" />
                  </Button>

                  <div className="space-y-4 pr-8">
                    <div className="space-y-2">
                      <Label>Clasificación *</Label>
                      <Select
                        value={det.harvest_classification?.toString() || ""}
                        onValueChange={(v) =>
                          updateDetail(idx, "harvest_classification", v)
                        }
                        disabled={!selectedHarvestId}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableClassificationsForRow(idx).map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              {getClassificationLabel(c)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {cls && (
                        <p className="text-xs text-slate-600">
                          Disponible:{" "}
                          <span className="font-semibold">
                            {cls.available_weight_g ?? 0} g
                          </span>
                          {" · "}
                          <span className="font-semibold">
                            {cls.available_fish_count ?? 0} peces
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Peso (g) *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="w-full"
                          value={det.quantity_g}
                          onChange={(e) =>
                            updateDetail(idx, "quantity_g", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cantidad peces *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="w-full"
                          value={det.fish_count}
                          onChange={(e) =>
                            updateDetail(idx, "fish_count", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor total ($) *</Label>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          className="w-full"
                          value={det.price}
                          onChange={(e) =>
                            updateDetail(idx, "price", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  {lineErrors[idx] && (
                    <p className="text-xs text-red-600 mt-2">
                      {lineErrors[idx]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <p className="text-lg font-bold text-slate-800">
            Total de la venta: {formatCurrency(total)}
          </p>
        </div>
      </section>

      <DialogFooter className="gap-2 pt-2 sm:justify-end border-t border-slate-100">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            "Registrar venta"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
