"use client";

import { Suspense, use } from "react";
import SalesContent from "./SalesContent";
import { usePermissions } from "@/lib/usePermissions";

export default function SalesPage({ params }) {
  const { id } = use(params);
  const permissions = usePermissions(id);

  if (permissions.loading) {
    return <div className="p-8 text-center">Cargando permisos...</div>;
  }

  const canViewSales =
    permissions.hasFullAccess || permissions.canManageSales;

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      {canViewSales ? (
        <SalesContent farmId={id} />
      ) : (
        <p className="p-8 text-center text-sm text-slate-600">
          No tienes permisos para ver los módulos de ventas.
        </p>
      )}
    </Suspense>
  );
}
