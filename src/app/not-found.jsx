import Link from "next/link";

// Página 404 global en español, con enlace de retorno (D-04).
export const metadata = { title: "Página no encontrada | Póngase Trucha" };

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">Error 404</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">Página no encontrada</h1>
      <p className="mt-3 max-w-md text-slate-600">
        La dirección que abriste no existe o fue movida. Revisa el enlace o vuelve al inicio.
      </p>
      <Link
        href="/home"
        className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Volver al inicio
      </Link>
    </main>
  );
}