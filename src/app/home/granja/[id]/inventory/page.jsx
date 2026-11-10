"use client";

import { Suspense, use } from "react";
import InventoryContent from "./InventoryContent";
import { usePermissions } from "@/lib/usePermissions";

export default function InventoryPage({ params }) {
  const { id } = use(params);
  const permissions = usePermissions(id);

  if (permissions.loading) {
    return <div className="p-8 text-center">Cargando permisos...</div>;
  }

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <InventoryContent
        farmId={id}
        canViewProducts={
          permissions.hasFullAccess || permissions.canView("inventory_products")
        }
        canViewPurchases={
          permissions.hasFullAccess || permissions.canView("inventory_purchases")
        }
      />
    </Suspense>
  );
}