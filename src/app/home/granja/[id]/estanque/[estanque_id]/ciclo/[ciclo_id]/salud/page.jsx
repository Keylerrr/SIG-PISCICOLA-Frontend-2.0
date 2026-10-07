"use client";

import { use } from "react";
import CycleHealthContent from "./CycleHealthContent";

export default function CycleHealth({ params }) {
  const { id, estanque_id, ciclo_id } = use(params);

  return (
    <CycleHealthContent
      farmId={id}
      pondId={estanque_id}
      cycleId={ciclo_id}
      showBackLink={true}
    />
  );
}
