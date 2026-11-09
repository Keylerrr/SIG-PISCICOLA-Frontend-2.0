// Vigila la sesión mientras el usuario está en pantallas privadas (D-03).
//
// Si la API responde 401 a una petición autenticada:
//   1) intenta renovar el token con POST /auth/token/refresh/ (una sola renovación a la vez);
//   2) si se renueva, guarda los tokens y repite la petición original;
//   3) si el servidor rechaza el refresh (revocado, vencido) -> onExpire() (salir al login);
//   4) si no hay red para renovar, NO cierra la sesión.
// Además verifica la sesión con GET /users/me/ al volver a la pestaña y cada minuto.
//
// Solo reacciona al 401. Un 403 (sin permisos) NO cierra la sesión.

const AUTH_CALLS = /\/auth\/(login|logout|reset-password|change-password|token\/refresh|refresh)\/?/;

function urlOf(input) {
  if (typeof input === "string") return input;
  return input?.url ?? input?.href ?? String(input);
}

function hasAuthHeader(init) {
  try {
    return new Headers(init?.headers || {}).has("Authorization");
  } catch {
    return false;
  }
}

function withAuth(init, access) {
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${access}`);
  return { ...init, headers };
}

export function installSessionWatch({
  apiBase,
  onExpire,
  getToken,
  getRefreshToken,
  saveTokens,
  win = window,
  intervalMs = 60_000,
}) {
  const rawFetch = win.fetch;
  const originalFetch = rawFetch.bind(win);
  let expired = false;
  let refreshing = null;

  const expire = () => {
    if (expired) return;
    expired = true;
    onExpire();
  };

  /** -> { status: "ok", access } | { status: "rejected" } | { status: "error" } */
  const recover = () => {
    if (refreshing) return refreshing;
    const refresh = getRefreshToken?.();
    if (!refresh) return Promise.resolve({ status: "rejected" });

    refreshing = originalFetch(`${apiBase}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return { status: "rejected" };
        const data = await res.json().catch(() => null);
        if (!data?.access) return { status: "rejected" };
        saveTokens?.({ access: data.access, refresh: data.refresh });
        return { status: "ok", access: data.access };
      })
      .catch(() => ({ status: "error" }))
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  };

  win.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    if (res.status !== 401) return res;

    const url = urlOf(input);
    const isString = typeof input === "string" || typeof input?.href === "string";
    if (!url.startsWith(apiBase) || AUTH_CALLS.test(url) || !getToken()) return res;
    if (!isString || !hasAuthHeader(init)) return res;

    const outcome = await recover();
    if (outcome.status === "rejected") {
      expire();
      return res;
    }
    if (outcome.status === "error") return res;

    const retried = await originalFetch(input, withAuth(init, outcome.access));
    if (retried.status === 401) expire();
    return retried;
  };

  const verify = () => {
    if (win.document?.visibilityState === "hidden") return;
    const token = getToken();
    if (!token) return;
    originalFetch(`${apiBase}/users/me/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (res.status !== 401) return;
        const outcome = await recover();
        if (outcome.status === "rejected") expire();
      })
      .catch(() => {
        /* sin red: no se cierra la sesión */
      });
  };

  win.addEventListener("focus", verify);
  win.document?.addEventListener("visibilitychange", verify);
  const timer = win.setInterval(verify, intervalMs);

  return () => {
    win.fetch = rawFetch;
    win.removeEventListener("focus", verify);
    win.document?.removeEventListener("visibilitychange", verify);
    win.clearInterval(timer);
  };
}