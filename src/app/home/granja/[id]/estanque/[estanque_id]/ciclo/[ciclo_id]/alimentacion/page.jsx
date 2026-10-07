"use client";

import { use } from "react";
import CycleFeedingContent from "./CycleFeedingContent";

export default function CycleFeeding({ params }) {
  const { id, estanque_id, ciclo_id } = use(params);

  return (
    <CycleFeedingContent
      farmId={id}
      pondId={estanque_id}
      cycleId={ciclo_id}
      showBackLink={true}
    />
  );
}
