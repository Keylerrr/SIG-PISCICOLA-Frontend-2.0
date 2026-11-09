"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  buildLoginUrl,
  clearSession,
  getAccessToken,
  getSafeNext,
  getSessionIssue,
  hasValidSession,
} from "@/lib/auth";
import { installSessionWatch } from "@/lib/sessionWatch";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://backend-pongase-trucha.onrender.com/api";

function FullScreenSpinner({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {label}
    </div>
  );
}

/**
 * Protege pantallas privadas (D-03).
 * No renderiza el contenido hasta confirmar que hay una sesión vigente; si no la hay,
 * limpia lo que quede y manda a /login?next=<ruta actual>.
 * También reacciona al cerrar sesión en otra pestaña y al volver con el botón "atrás".
 */
export function AuthGuard({ children, loginPath = "/login" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      const issue = getSessionIssue(); // "missing" | "expired" | null
      if (!issue) {
        setAllowed(true);
        return;
      }
      clearSession();
      setAllowed(false);
      router.replace(buildLoginUrl(loginPath, pathname, issue));
    };

    check();

    const onStorage = (event) => {
      if (event.key === null || event.key === "access") check();
    };
    const onPageShow = (event) => {
      if (event.persisted) check(); // página restaurada desde caché al navegar atrás
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [pathname, router, loginPath]);

  // Mientras haya sesión: si la API responde 401 (sesión revocada o vencida en el servidor), sale al login
  useEffect(() => {
    if (!allowed) return;
    return installSessionWatch({
      apiBase: API_BASE,
      getToken: getAccessToken,
      getRefreshToken: () => {
        try {
          return localStorage.getItem("refresh");
        } catch {
          return null;
        }
      },
      saveTokens: ({ access, refresh }) => {
        try {
          localStorage.setItem("access", access);
          if (refresh) localStorage.setItem("refresh", refresh);
        } catch {
          /* sin almacenamiento */
        }
      },
      onExpire: () => {
        clearSession();
        setAllowed(false);
        router.replace(buildLoginUrl(loginPath, pathname, "revoked"));
      },
    });
  }, [allowed, pathname, router, loginPath]);

  if (!allowed) return <FullScreenSpinner label="Verificando sesión..." />;
  return children;
}

/**
 * Para /login: si ya hay una sesión válida redirige a /home (o a ?next=) en lugar de
 * mostrar el formulario (CP-002 paso 5).
 * Antes de redirigir confirma el token con GET /users/me/; si el servidor lo rechaza
 * (revocado, usuario eliminado) limpia la sesión y muestra el formulario. Así no hay
 * ciclos /login <-> /home con un token inservible.
 */
export function GuestGuard({ children, redirectTo = "/home" }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!hasValidSession()) {
        clearSession();
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/users/me/`, {
          headers: { Authorization: `Bearer ${getAccessToken()}` },
        });
        if (cancelled) return;
        if (res.ok) {
          const params = new URLSearchParams(window.location.search);
          router.replace(getSafeNext(params.get("next"), redirectTo));
          return;
        }
        if (res.status === 401 || res.status === 403) clearSession();
      } catch {
        /* sin red: se muestra el formulario */
      }
      if (!cancelled) setReady(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  if (!ready) return <FullScreenSpinner label="Cargando..." />;
  return children;
}

export default AuthGuard;