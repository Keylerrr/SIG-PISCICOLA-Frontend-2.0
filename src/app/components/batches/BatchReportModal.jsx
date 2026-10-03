"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Loader2, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBatchCycles, generateProductionReport } from "@/lib/batchService";

// ── Módulos disponibles ────────────────────────────────────────────────────
const MODULES = [
  { key: "feeding",  label: "Alimentación", defaultOn: true  },
  { key: "biometry", label: "Biometría",    defaultOn: true  },
  { key: "health",   label: "Sanidad",      defaultOn: true  },
  { key: "harvest",  label: "Cosecha",      defaultOn: true  },
  { key: "sales",    label: "Ventas",       defaultOn: false },
];

const DEFAULT_SELECTED = MODULES.filter((m) => m.defaultOn).map((m) => m.key);

// ── Mensajes de error según código HTTP ────────────────────────────────────
function parseApiError(err) {
  if (!err) return "Ocurrió un error al generar el reporte.";

  const status = err.status;
  const payload = err.payload;

  if (status === 401) return "Tu sesión ha expirado. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para generar este reporte.";
  if (status === 404) return "No se encontró el lote solicitado.";

  if (status === 400 && payload) {
    // Backend sends field-level errors as arrays or a detail string
    if (payload.cycle_id) {
      const msg = Array.isArray(payload.cycle_id)
        ? payload.cycle_id[0]
        : payload.cycle_id;
      return msg;
    }
    if (payload.modules) {
      const msg = Array.isArray(payload.modules)
        ? payload.modules[0]
        : payload.modules;
      return msg;
    }
    if (payload.detail) return payload.detail;
    if (payload.message) return payload.message;
    // Generic 400 with unknown shape
    const firstKey = Object.keys(payload)[0];
    if (firstKey) {
      const val = payload[firstKey];
      return Array.isArray(val) ? val[0] : String(val);
    }
  }

  return err.message || "Ocurrió un error al generar el reporte.";
}

// ── Componente principal ───────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {boolean}       props.open        - controlled open state
 * @param {Function}      props.onClose     - called when modal should close
 * @param {string|number} props.farmId      - farm PK
 * @param {string|number} props.batchId     - batch PK
 * @param {string}        props.batchLabel  - display label for the modal title (e.g. "Lote #12")
 */
export function BatchReportModal({ open, onClose, farmId, batchId, batchLabel }) {
  const [selectedModules, setSelectedModules] = useState(DEFAULT_SELECTED);
  const [format, setFormat]                   = useState("pdf");
  const [cycleId, setCycleId]                 = useState("all");
  const [cycles, setCycles]                   = useState([]);
  const [loadingCycles, setLoadingCycles]     = useState(false);
  const [generating, setGenerating]           = useState(false);
  const [errorMsg, setErrorMsg]               = useState(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedModules(DEFAULT_SELECTED);
      setFormat("pdf");
      setCycleId("all");
      setErrorMsg(null);
      setGenerating(false);
    }
  }, [open]);

  // Fetch cycles for the batch when modal opens
  useEffect(() => {
    if (!open || !farmId || !batchId) return;
    let cancelled = false;

    const load = async () => {
      setLoadingCycles(true);
      try {
        const data = await getBatchCycles(farmId, batchId);
        if (!cancelled) setCycles(data);
      } catch {
        if (!cancelled) setCycles([]);
      } finally {
        if (!cancelled) setLoadingCycles(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, farmId, batchId]);

  // Toggle a module checkbox
  const toggleModule = useCallback((key) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // Trigger download of the blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    // Validate: at least one module
    if (selectedModules.length === 0) {
      setErrorMsg("Debes seleccionar al menos un módulo.");
      return;
    }
    setErrorMsg(null);
    setGenerating(true);

    try {
      const payload = {
        modules: selectedModules,
        format,
        cycle_id: cycleId !== "all" ? Number(cycleId) : undefined,
      };

      const { blob, filename } = await generateProductionReport(farmId, batchId, payload);
      downloadBlob(blob, filename);
      toast.success("Reporte generado correctamente.");
      onClose();
    } catch (err) {
      const msg = parseApiError(err);
      setErrorMsg(msg);
    } finally {
      setGenerating(false);
    }
  };

  const hasCycles = cycles.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !generating) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-md" showCloseButton={!generating}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4 text-blue-600" />
            Reporte Histórico — {batchLabel}
          </DialogTitle>
          <DialogDescription>
            Selecciona los módulos, formato y (opcionalmente) un ciclo para generar el reporte.
          </DialogDescription>
        </DialogHeader>

        {/* ── Error banner ── */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Módulos ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Módulos a incluir
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODULES.map(({ key, label }) => {
              const checked = selectedModules.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors select-none text-sm font-medium ${
                    checked
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  } ${generating ? "opacity-60 pointer-events-none" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="accent-blue-600 w-3.5 h-3.5 shrink-0"
                    checked={checked}
                    onChange={() => toggleModule(key)}
                    disabled={generating}
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">
            Selecciona al menos un módulo.
          </p>
        </div>

        {/* ── Formato ── */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Formato de exportación
          </p>
          <Select value={format} onValueChange={setFormat} disabled={generating}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">📄 PDF</SelectItem>
              <SelectItem value="xlsx">📊 Excel (.xlsx)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Ciclo (opcional) ── */}
        {(hasCycles || loadingCycles) && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Ciclo <span className="normal-case font-normal text-slate-400">(opcional)</span>
            </p>
            <Select
              value={cycleId}
              onValueChange={setCycleId}
              disabled={generating || loadingCycles}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={loadingCycles ? "Cargando ciclos..." : "Todos los ciclos"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los ciclos</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name || `Ciclo #${c.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">
              Filtra el reporte a un ciclo específico, o deja en "Todos los ciclos".
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={generating}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedModules.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando reporte...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
