import { useState, useEffect } from "react";
import { getToken } from "@/lib/apiClient";

/**
 * Espera hidratación del cliente y expone si hay JWT antes de disparar fetches.
 */
export function useAuthReady() {
  const [authReady, setAuthReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const sync = () => {
      setHasToken(Boolean(getToken()));
      setAuthReady(true);
    };

    sync();

    const onStorage = (e) => {
      if (e.key === "access" || e.key === null) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { authReady, hasToken };
}
