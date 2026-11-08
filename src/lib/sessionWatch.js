// Vigila la sesión mientras el usuario está en pantallas privadas (D-03).
//
// 1) Intercepta fetch: si la API responde 401 a una petición autenticada (no a login/logout/etc.),
//    la sesión ya no es válida en el servidor -> onExpire().
// 2) Verifica la sesión con GET /users/me/ al volver a la pestaña y cada minuto, de modo que una
//    sesión revocada se detecte aunque el usuario no esté pulsando nada.
//
// Solo reacciona al 401. Un 403 (sin permisos) NO cierra la sesión.

const AUTH_CALLS = /\/auth\/(login|logout|reset-password|change-password|refresh)\/?/;

function urlOf(input) {
  if (typeof input === "string") return input;
  return input?.url ?? input?.href ?? String(input);
}

export function installSessionWatch({ apiBase, onExpire, getToken, win = window, intervalMs = 60_000 }) {
  const rawFetch = win.fetch;
  const originalFetch = rawFetch.bind(win);
  let expired = false;

  const expire = () => {
    if (expired) return;
    expired = true;
    onExpire();
  };

  win.fetch = async (input, init) => {
    const res = await originalFetch(input, init);
    if (res.status === 401) {
      const url = urlOf(input);
      if (url.startsWith(apiBase) && !AUTH_CALLS.test(url) && getToken()) expire();
    }
    return res;
  };

  const verify = () => {
    if (win.document?.visibilityState === "hidden") return;
    const token = getToken();
    if (!token) return;
    originalFetch(`${apiBase}/users/me/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) expire();
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