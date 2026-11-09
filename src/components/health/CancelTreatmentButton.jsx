"use client";

import { useState } from "react";
import { Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FormErrorAlert from "@/components/forms/FormErrorAlert";
import { extractApiErrors, getApiErrorMessage } from "@/lib/apiErrors";

// Estados en los que un tratamiento ya no se puede cancelar.
const CLOSED_STATES = new Set(["cancelled", "canceled", "cancelado", "completed", "finished", "completado", "finalizado"]);

export function canCancelTreatment(treatment) {
  if (!treatment) return false;
  const state = String(treatment.status ?? treatment.state ?? "").toLowerCase();
  return !CLOSED_STATES.has(state);
}

/**
 * Botón "Cancelar tratamiento" con confirmación (D-46).
 *
 * Props:
 *   treatment    objeto del tratamiento (usa status/state para decidir si se muestra)
 *   canManage    permiso del usuario (p. ej. permissions.canManageCycle)
 *   onConfirm    async (reason) => resultado de la API; debe lanzar el error si falla
 *   onCancelled  (resultado) => void, para refrescar estado y eventos en la pantalla
 *   askReason    mostrar el campo de motivo; false por defecto
 */
export default function CancelTreatmentButton({
  treatment,
  canManage,
  onConfirm,
  onCancelled,
  askReason = false, // mostrar el campo "Motivo" (solo si el backend lo recibe)
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  if (!canManage || !canCancelTreatment(treatment)) return null;

  const close = () => {
    if (saving) return;
    setOpen(false);
    setReason("");
    setFormErrors([]);
  };

  const handleConfirm = async () => {
    setSaving(true);
    setFormErrors([]);
    try {
      const result = await onConfirm(reason.trim() || undefined);
      toast.success("Tratamiento cancelado correctamente.");
      setOpen(false);
      setReason("");
      onCancelled?.(result);
    } catch (error) {
      // El motivo del rechazo se muestra dentro de la ventana, que sigue abierta
      const { general } = extractApiErrors(error);
      setFormErrors(general.length ? general : [getApiErrorMessage(error, "No se pudo cancelar el tratamiento.")]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
      >
        <Ban className="mr-2 h-4 w-4" /> Cancelar tratamiento
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-treatment-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="cancel-treatment-title" className="text-lg font-bold text-slate-900">
              ¿Cancelar este tratamiento?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Se cancelará este plan de tratamiento y ya no se programarán nuevas aplicaciones. Esta acción no se puede deshacer.
            </p>

            {askReason && (
              <>
                <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="cancel-reason">
                  Motivo <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={saving}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  placeholder="Ej: el pez se recuperó antes de terminar el esquema"
                />
              </>
            )}

            {formErrors.length > 0 && (
              <div className="mt-3">
                <FormErrorAlert messages={formErrors} title="No se pudo cancelar" />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={close} disabled={saving}>
                Volver
              </Button>
              <Button onClick={handleConfirm} disabled={saving} className="bg-rose-600 text-white hover:bg-rose-700">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelando...
                  </>
                ) : (
                  "Sí, cancelar tratamiento"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}