"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useFlags } from "@/hooks/useFlags";

import { RegisterWorker } from "../components/users/registerWorker";
import { RegisterManager } from "../components/users/registerManager";

import { Toaster } from "sonner";

export default function ManageUsersPage() {
  const router = useRouter();
  const { flags, loading } = useFlags();
  const canCreateManager = flags.users?.createManager ?? false;

  if (loading) {
    return (
      <div className="p-4 text-gray-500">
        Cargando permisos...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors position="top-right" />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver a la Página de Inicio
        </button>

        {canCreateManager && <RegisterManager />}

        <RegisterWorker />
      </div>
    </div>
  );
}