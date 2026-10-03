"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { salesService } from "@/lib/salesService";
import { PAYMENT_METHOD_LABELS } from "@/lib/salesConstants";
import {
  formatApiError,
  formatCurrency,
  getClassificationLabel,
  getSaleDisplayTotal,
} from "@/lib/salesUtils";

export function SaleDetailsModal({ farmId, saleId, open, onOpenChange }) {
  const [sale, setSale] = useState(null);
  const [details, setDetails] = useState([]);
  const [canEditInfo, setCanEditInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !saleId || !farmId) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [saleData, detailsData, editInfo] = await Promise.all([
          salesService.getSale(farmId, saleId),
          salesService.getSaleDetailsBySale(farmId, saleId),
          salesService.canEditSale(farmId, saleId).catch(() => ({
            can_edit: true,
          })),
        ]);
        if (!mounted) return;
        setSale(saleData);
        setDetails(detailsData);
        setCanEditInfo(editInfo);
      } catch (err) {
        if (!mounted) return;
        setError(formatApiError(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open, saleId, farmId]);

  const clientName =
    sale?.client_name ||
    sale?.client?.name ||
    (typeof sale?.client === "object" ? sale.client?.name : null) ||
    "—";

  const displayTotal = sale ? getSaleDisplayTotal(sale, details) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,56rem)] sm:max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            Detalle de venta
            {canEditInfo?.can_edit === false && (
              <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800">
                Edición cerrada — solo observaciones
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : error ? (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm max-w-2xl mx-auto text-center">
            {error}
          </div>
        ) : sale ? (
          <div className="w-full space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                ["Factura", sale.invoice_number || "—"],
                ["Cliente", clientName],
                [
                  "Fecha",
                  sale.date
                    ? new Date(sale.date).toLocaleDateString("es-CO")
                    : "—",
                ],
                [
                  "Método de pago",
                  PAYMENT_METHOD_LABELS[sale.payment_method] ||
                    sale.payment_method ||
                    "—",
                ],
                [
                  "Total",
                  displayTotal != null ? formatCurrency(displayTotal) : "—",
                ],
                ["Observaciones", sale.observations || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-xl p-4"
                >
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                    {label}
                  </p>
                  <p className="font-bold text-slate-800 break-words">{value}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-600 border-b border-slate-100 pb-2 mb-4">
                Líneas de detalle
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Clasificación</th>
                      <th className="p-4">Peso (g)</th>
                      <th className="p-4">Cantidad peces</th>
                      <th className="p-4">Valor total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {details.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-4 text-center">
                          No hay detalles
                        </td>
                      </tr>
                    ) : (
                      details.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-900">
                            {getClassificationLabel(
                              d.harvest_classification_name ||
                                d.classification_name ||
                                d.harvest_classification
                            )}
                          </td>
                          <td className="p-4">
                            {d.quantity_g ?? "—"}
                          </td>
                          <td className="p-4">
                            {d.fish_count ?? "—"}
                          </td>
                          <td className="p-4 font-semibold">
                            {formatCurrency(d.price)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {details.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200">
                        <td
                          colSpan="3"
                          className="p-4 text-right font-semibold text-slate-700"
                        >
                          Total
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {formatCurrency(
                            getSaleDisplayTotal(sale, details) ?? 0
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
