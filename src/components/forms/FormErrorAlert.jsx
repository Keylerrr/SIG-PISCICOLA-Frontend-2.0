"use client";

import { AlertCircle } from "lucide-react";

/**
 * Muestra los errores generales que devuelve el servidor (non_field_errors, detail…) dentro del formulario (D-11).
 * `messages` es el arreglo `general` de extractApiErrors().
 */
export default function FormErrorAlert({ messages, title = "No se pudo guardar" }) {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
  if (!list.length) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        {list.map((message, i) => (
          <p key={i}>{message}</p>
        ))}
      </div>
    </div>
  );
}