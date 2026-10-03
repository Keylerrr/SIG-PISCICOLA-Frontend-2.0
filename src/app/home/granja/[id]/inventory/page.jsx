import { Suspense } from "react";
import InventoryContent from "./InventoryContent";

export default async function InventoryPage({
  params,
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <InventoryContent farmId={id} />
    </Suspense>
  );
}