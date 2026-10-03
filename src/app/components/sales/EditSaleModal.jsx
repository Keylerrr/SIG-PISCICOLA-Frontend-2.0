"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { salesService } from "@/lib/salesService";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/salesConstants";
import {
  formatApiError,
  formatCurrency,
  getClassificationLabel,
  getSaleDisplayTotal,
  normalizePaymentMethod,
} from "@/lib/salesUtils";

export function EditSaleModal({
  farmId,
  saleId,
  open,
  onOpenChange,
  clients = [],
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [savingHeader, setSavingHeader] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [editWindow, setEditWindow] = useState(null);
  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailDrafts, setDetailDrafts] = useState({});
  const [savingDetailId, setSavingDetailId] = useState(null);

  const [formData, setFormData] = useState({
    client: "",
    invoice_number: "",
    payment_method: "",
    date: "",
    observations: "",
  });

  const loadData = async () => {
    if (!farmId || !saleId) return;
    setLoading(true);
    try {
      const [saleData, detailsData, editInfo] = await Promise.all([
        salesService.getSale(farmId, saleId),
        salesService.getSaleDetailsBySale(farmId, saleId),
        salesService.canEditSale(farmId, saleId),
      ]);

      setSale(saleData);
      setDetails(detailsData);
      setCanEdit(editInfo.can_edit !== false);
      setEditWindow(editInfo);

      const clientId =
        saleData.client?.id ?? saleData.client ?? saleData.client_id;

      setFormData({
        client: clientId?.toString() || "",
        invoice_number: saleData.invoice_number || "",
        payment_method: normalizePaymentMethod(saleData.payment_method),
        date: saleData.date
          ? saleData.date.split("T")[0]
          : new Date().toISOString().split("T")[0],
        observations: saleData.observations || "",
      });

      const drafts = {};
      detailsData.forEach((d) => {
        drafts[d.id] = {
          quantity_g: d.quantity_g?.toString() ?? "",
          fish_count: d.fish_count?.toString() ?? "",
          price: d.price?.toString() ?? "",
        };
      });
      setDetailDrafts(drafts);
    } catch (err) {
      toast.error(formatApiError(err));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && saleId) loadData();
  }, [open, saleId, farmId]);

  const handleSaveHeader = async () => {
    if (!canEdit) return;
    setSavingHeader(true);
    try {
      await salesService.editSale(farmId, saleId, {
        client: parseInt(formData.client, 10),
        invoice_number: formData.invoice_number,
        payment_method: formData.payment_method,
        date: formData.date,
        observations: formData.observations,
      });
      toast.success("Venta actualizada");
      onSuccess?.();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSaveObservations = async () => {
    setSavingHeader(true);
    try {
      await salesService.updateSaleObservations(
        farmId,
        saleId,
        formData.observations
      );
      toast.success("Observaciones actualizadas");
      onSuccess?.();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingHeader(false);
    }
  };

  const handleSaveDetail = async (detailId) => {
    if (!canEdit) return;

    try {
      const editCheck = await salesService.canEditSaleDetail(farmId, detailId);
      if (editCheck.can_edit === false) {
        toast.error(
          editCheck.reason ||
            "No se puede editar este detalle fuera de la ventana de edición."
        );
        return;
      }
    } catch (err) {
      toast.error(formatApiError(err));
      return;
    }

    const draft = detailDrafts[detailId];
    if (!draft) return;

    setSavingDetailId(detailId);
    try {
      await salesService.updateSaleDetail(farmId, detailId, {
        quantity_g: Number(draft.quantity_g),
        fish_count: parseInt(draft.fish_count, 10),
        price: Number(draft.price),
      });
      toast.success("Detalle actualizado");
      onSuccess?.();
      loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingDetailId(null);
    }
  };

  const updateDetailDraft = (detailId, field, value) => {
    setDetailDrafts((prev) => ({
      ...prev,
      [detailId]: { ...prev[detailId], [field]: value },
    }));
  };

  const deadlineStr =
    editWindow?.deadline &&
    new Date(editWindow.deadline).toLocaleString("es-CO");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,56rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Editar venta</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : (
          <div className="w-full space-y-5">
            {!canEdit && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                <p className="font-semibold">
                  Ventana de edición cerrada ({editWindow?.window_minutes ?? 15}{" "}
                  minutos)
                </p>
                {deadlineStr && (
                  <p className="mt-1">
                    Límite de edición: {deadlineStr}
                  </p>
                )}
                <p className="mt-2 text-amber-800">
                  Solo puede modificar las observaciones de la venta.
                </p>
              </div>
            )}

            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-600 border-b border-slate-100 pb-2">
                Datos de la venta
              </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={formData.client}
                  onValueChange={(v) =>
                    setFormData({ ...formData, client: v })
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cliente" />
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
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  className="w-full"
                  value={formData.date}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Factura</Label>
                <Input
                  className="w-full"
                  value={formData.invoice_number}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invoice_number: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) =>
                    setFormData({ ...formData, payment_method: v })
                  }
                  disabled={!canEdit}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
                    setFormData({
                      ...formData,
                      observations: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
            {canEdit ? (
              <Button
                type="button"
                onClick={handleSaveHeader}
                disabled={savingHeader}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingHeader ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar cabecera
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveObservations}
                disabled={savingHeader}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Guardar observaciones
              </Button>
            )}
            </div>
            </section>

            <section className="border-t border-slate-200 pt-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-600">
                  Líneas de detalle
                </h3>
                {sale && (
                  <span className="text-sm font-semibold text-slate-800">
                    Total: {formatCurrency(getSaleDisplayTotal(sale, details) ?? 0)}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {details.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No hay detalles
                  </p>
                ) : (
                  details.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <p className="font-medium text-slate-800 mb-3">
                        {getClassificationLabel(
                          d.harvest_classification_name ||
                            d.classification_name ||
                            d.harvest_classification
                        )}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Peso (g)</Label>
                          <Input
                            type="number"
                            disabled={!canEdit}
                            value={detailDrafts[d.id]?.quantity_g ?? ""}
                            onChange={(e) =>
                              updateDetailDraft(
                                d.id,
                                "quantity_g",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Peces</Label>
                          <Input
                            type="number"
                            disabled={!canEdit}
                            value={detailDrafts[d.id]?.fish_count ?? ""}
                            onChange={(e) =>
                              updateDetailDraft(
                                d.id,
                                "fish_count",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Valor total ($)</Label>
                          <Input
                            type="number"
                            disabled={!canEdit}
                            value={detailDrafts[d.id]?.price ?? ""}
                            onChange={(e) =>
                              updateDetailDraft(d.id, "price", e.target.value)
                            }
                          />
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          disabled={savingDetailId === d.id}
                          onClick={() => handleSaveDetail(d.id)}
                        >
                          {savingDetailId === d.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Guardar línea"
                          )}
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        <DialogFooter className="sm:justify-end border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
