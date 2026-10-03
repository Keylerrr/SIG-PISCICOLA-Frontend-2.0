"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AlertsTab({ alerts = [], onAlertRead, onMarkAllAsRead, compact }) {
  const handleResolve = async (alert) => {
    try {
      if (onAlertRead) {
        await onAlertRead(alert.id, alert.farmId);
        toast.success("Alerta marcada como resuelta");
      }
    } catch (error) {
      toast.error("Error al resolver la alerta");
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col max-h-[400px]">
        <div className="sticky top-0 bg-white z-10 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Alertas</h3>
          {alerts.length > 0 && (
            <button 
              onClick={onMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>
        
        <div className="overflow-y-auto p-2 space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No hay alertas activas</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="p-3 bg-red-50/50 border border-red-100 rounded-lg">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-700">{alert.title || "Alerta de Sistema"}</h4>
                    <p className="text-xs text-slate-600 mt-1">{alert.message || alert.description || "Se requiere atención en el inventario o granja."}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-slate-400">
                        {new Date(alert.created_at || alert.date).toLocaleString()}
                      </span>
                      <button 
                        onClick={() => handleResolve(alert)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Resolver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Original non-compact view, just in case
  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Alertas de Inventario</h2>
          <p className="text-sm text-slate-500">Revisa las notificaciones sobre stock bajo o problemas en la granja.</p>
        </div>
        {alerts.length > 0 && (
          <Button onClick={onMarkAllAsRead} variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-700">Todo en orden</h3>
          <p className="text-slate-500">No hay alertas activas en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-700 flex items-start gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                  {alert.title || "Alerta de Sistema"}
                </CardTitle>
                <CardDescription className="text-red-600/80">
                  {new Date(alert.created_at || alert.date).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <div className="px-6 py-2 text-slate-700 text-sm">
                {alert.message || alert.description || "Se requiere atención en el inventario o granja."}
              </div>
              <CardFooter className="pt-4">
                <Button 
                  onClick={() => handleResolve(alert)}
                  variant="outline" 
                  className="w-full border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como resuelta
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
