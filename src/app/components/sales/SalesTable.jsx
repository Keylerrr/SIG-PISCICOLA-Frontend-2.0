"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Eye,
  Pencil,
  MessageSquare,
  Loader2,
  Filter,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from "@/lib/salesConstants";
import {
  formatApiError,
  formatCurrency,
  getSaleDisplayTotal,
} from "@/lib/salesUtils";
import { SaleForm } from "./SaleForm";
import { SaleDetailsModal } from "./SaleDetailsModal";
import { EditSaleModal } from "./EditSaleModal";

export function SalesTable({ farmId }) {
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterClientId, setFilterClientId] = useState("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterInvoice, setFilterInvoice] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [detailSaleId, setDetailSaleId] = useState(null);
  const [editSaleId, setEditSaleId] = useState(null);

  const [obsOpen, setObsOpen] = useState(false);
  const [obsSaleId, setObsSaleId] = useState(null);
  const [obsText, setObsText] = useState("");
  const [obsSaving, setObsSaving] = useState(false);

  const loadClients = useCallback(async () => {
    try {
      const clientsData = await salesService.getClients(farmId);
      setClients(clientsData);
    } catch (err) {
      console.error(err);
    }
  }, [farmId]);

  const fetchSales = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (filterClientId !== "all") filters.client_id = filterClientId;
      if (filterPaymentMethod !== "all")
        filters.payment_method = filterPaymentMethod;
      if (filterDateFrom) filters.date_from = filterDateFrom;
      if (filterDateTo) filters.date_to = filterDateTo;
      if (filterInvoice) filters.invoice_number = filterInvoice;

      const data = await salesService.getSales(farmId, filters);
      setSales(data);
    } catch (err) {
      if (err.status === 401) {
        window.location.href = "/login";
        return;
      }
      const msg = formatApiError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [
    farmId,
    filterClientId,
    filterPaymentMethod,
    filterDateFrom,
    filterDateTo,
    filterInvoice,
  ]);

  useEffect(() => {
    if (!farmId) return;
    const timer = setTimeout(() => loadClients(), 0);
    return () => clearTimeout(timer);
  }, [farmId, loadClients]);

  useEffect(() => {
    if (!farmId) return;
    const timer = setTimeout(() => fetchSales(), 0);
    return () => clearTimeout(timer);
  }, [fetchSales]);

  const getClientName = (sale) => {
    if (sale.client_name) return sale.client_name;
    if (typeof sale.client === "object" && sale.client?.name)
      return sale.client.name;
    const id = sale.client?.id ?? sale.client;
    const c = clients.find((cl) => cl.id === id);
    return c?.name || "—";
  };

  const openObservations = (sale) => {
    setObsSaleId(sale.id);
    setObsText(sale.observations || "");
    setObsOpen(true);
  };

  const saveObservations = async () => {
    if (!obsSaleId) return;
    setObsSaving(true);
    try {
      await salesService.updateSaleObservations(farmId, obsSaleId, obsText);
      toast.success("Observaciones actualizadas");
      setObsOpen(false);
      fetchSales();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setObsSaving(false);
    }
  };

  const hasActiveFilters =
    filterClientId !== "all" ||
    filterPaymentMethod !== "all" ||
    Boolean(filterDateFrom) ||
    Boolean(filterDateTo) ||
    Boolean(filterInvoice);

  const clearAllFilters = () => {
    setFilterClientId("all");
    setFilterPaymentMethod("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterInvoice("");
  };

  if (loading && sales.length === 0) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-800">Registro de Ventas</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(96vw,56rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>
            <SaleForm
              farmId={farmId}
              clients={clients}
              onSuccess={() => {
                setCreateOpen(false);
                fetchSales();
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs">Cliente</Label>
          <Select value={filterClientId} onValueChange={setFilterClientId}>
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-[140px]">
          <Label className="text-xs">Método de pago</Label>
          <Select
            value={filterPaymentMethod}
            onValueChange={setFilterPaymentMethod}
          >
            <SelectTrigger className="bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {PAYMENT_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input
            type="date"
            className="bg-white"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input
            type="date"
            className="bg-white"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
          />
        </div>
        <div className="space-y-1 min-w-[160px]">
          <Label className="text-xs">Nº factura</Label>
          <Input
            className="bg-white"
            placeholder="Buscar factura..."
            value={filterInvoice}
            onChange={(e) => setFilterInvoice(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Button type="button" variant="outline" onClick={fetchSales}>
            <Filter className="w-4 h-4 mr-1" />
            Aplicar filtros
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={clearAllFilters}
            disabled={!hasActiveFilters}
          >
            <Eraser className="w-4 h-4 mr-1" />
            Limpiar filtros
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Factura</th>
              <th className="p-4">Cliente</th>
              <th className="p-4">Método pago</th>
              <th className="p-4">Fecha</th>
              <th className="p-4">Total</th>
              <th className="p-4">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center">
                  No hay ventas registradas
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">
                    {s.invoice_number || "—"}
                  </td>
                  <td className="p-4">{getClientName(s)}</td>
                  <td className="p-4">
                    {PAYMENT_METHOD_LABELS[s.payment_method] ||
                      s.payment_method ||
                      "—"}
                  </td>
                  <td className="p-4">
                    {s.date
                      ? new Date(s.date).toLocaleDateString("es-CO")
                      : "—"}
                  </td>
                  <td className="p-4 font-semibold">
                    {formatCurrency(
                      getSaleDisplayTotal(s) ?? s.total ?? s.total_amount
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver"
                        onClick={() => setDetailSaleId(s.id)}
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => setEditSaleId(s.id)}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar observaciones"
                        onClick={() => openObservations(s)}
                      >
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SaleDetailsModal
        farmId={farmId}
        saleId={detailSaleId}
        open={detailSaleId != null}
        onOpenChange={(open) => {
          if (!open) setDetailSaleId(null);
        }}
      />

      <EditSaleModal
        farmId={farmId}
        saleId={editSaleId}
        open={editSaleId != null}
        clients={clients}
        onOpenChange={(open) => {
          if (!open) setEditSaleId(null);
        }}
        onSuccess={fetchSales}
      />

      <Dialog open={obsOpen} onOpenChange={setObsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar observaciones</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Label>Observaciones</Label>
            <Input
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={obsSaving}
              onClick={saveObservations}
            >
              {obsSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
