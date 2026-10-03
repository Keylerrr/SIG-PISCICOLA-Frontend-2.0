import { Suspense } from "react";
import SalesContent from "./SalesContent";

export default async function SalesPage({ params }) {
  const { id } = await params;

  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SalesContent farmId={id} />
    </Suspense>
  );
}
