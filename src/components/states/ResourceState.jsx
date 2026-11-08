"use client";

import Link from "next/link";
import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estados explícitos para páginas que cargan una entidad por id (D-04).

export function LoadingState({ label = "Cargando..." }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-slate-600">
      <Loader2 className="h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

const MASCULINE = new Set(["estanque", "ciclo", "lote", "plan", "tratamiento", "recurso"]);

export function EntityNotFound({ entity = "recurso", backHref, backLabel = "Volver" }) {
  const masculine = MASCULINE.has(entity);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
      <SearchX className="mx-auto h-10 w-10 text-slate-300" />
      <h2 className="mt-3 text-xl font-semibold text-slate-900">
        No se encontró {masculine ? "el" : "la"} {entity}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        Puede que haya sido {masculine ? "eliminado" : "eliminada"}, que el enlace sea incorrecto o que no tengas
        acceso.
      </p>
      {backHref && (
        <Link
          href={backHref}
          className="mt-5 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {backLabel}
        </Link>
      )}
    </div>
  );
}

export function LoadError({ message = "No se pudo cargar la información.", onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p>{message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
              Reintentar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Uso:
 *   const res = useResource(() => farmService.getById(id), [id]);
 *   <ResourceState res={res} entity="granja" backHref="/home" backLabel="Volver a granjas">
 *     {(farm) => <FarmDetail farm={farm} />}
 *   </ResourceState>
 */
export function ResourceState({ res, entity, backHref, backLabel, children }) {
  if (res.status === "loading") return <LoadingState label={`Cargando ${entity ?? "información"}...`} />;
  if (res.status === "not_found")
    return <EntityNotFound entity={entity} backHref={backHref} backLabel={backLabel} />;
  if (res.status === "error")
    return <LoadError message={res.error?.message} onRetry={res.reload} />;
  if (res.status === "unauthorized") return <LoadingState label="Redirigiendo al inicio de sesión..." />;
  return children(res.data);
}