"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { FarmWorkers } from "@/app/components/workers/farm_workers_tab";

export default function GranjaUsuarios({ params }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <FarmWorkers
          id={id}
          showBackButton={true}
          onBack={() => router.back()}
        />
      </div>
    </div>
  );
}