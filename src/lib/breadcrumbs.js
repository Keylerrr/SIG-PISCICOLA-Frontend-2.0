import { apiFetchJsonSafe } from "@/lib/apiClient";

const ROUTES = [
  {
    key: "home",
    path: "/home",
    parentKey: null,
    label: () => "Inicio",
  },
  {
    key: "perfil",
    path: "/home/perfil",
    parentKey: "home",
    label: () => "Perfil",
  },
  {
    key: "farm",
    path: "/home/granja/:id",
    parentKey: "home",
    async loadLabel({ id }) {
      if (!id) return null;
      const { data } = await apiFetchJsonSafe(`/farms/${id}/`);
      return data;
    },
    label: ({ id }, data) => data?.name || data?.code || `Granja #${id}`,
  },
  {
    key: "inventory",
    path: "/home/granja/:id/inventory",
    parentKey: "farm",
    label: () => "Inventario",
  },
  {
    key: "sales",
    path: "/home/granja/:id/sales",
    parentKey: "farm",
    label: () => "Ventas",
  },
  {
    key: "workers",
    path: "/home/granja/:id/granja_trabajadores",
    parentKey: "farm",
    label: () => "Trabajadores",
  },
  {
    key: "feeding",
    path: "/home/granja/:id/alimentacion",
    parentKey: "farm",
    label: () => "Alimentación",
  },
  {
    key: "feedingSchedule",
    path: "/home/granja/:id/alimentacion/:scheduleId",
    parentKey: "feeding",
    async loadLabel({ id, scheduleId }) {
      if (!id || !scheduleId) return null;
      const { data } = await apiFetchJsonSafe(`/farms/${id}/feeding-schedules/${scheduleId}/`);
      return data;
    },
    label: ({ scheduleId }, data) => data?.name || data?.title || `Cronograma #${scheduleId}`,
  },
  {
    key: "pond",
    path: "/home/granja/:id/estanque/:estanque_id",
    parentKey: "farm",
    async loadLabel({ id, estanque_id }) {
      if (!id || !estanque_id) return null;
      const { data } = await apiFetchJsonSafe(`/farms/${id}/ponds/${estanque_id}/`);
      return data;
    },
    label: ({ estanque_id }, data) => data?.name || data?.code || `Estanque #${estanque_id}`,
  },
  {
    key: "cycle",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id",
    parentKey: "pond",
    async loadLabel({ id, estanque_id, ciclo_id }) {
      if (!id || !estanque_id || !ciclo_id) return null;
      const { data } = await apiFetchJsonSafe(`/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/`);
      return data;
    },
    label: ({ ciclo_id }, data) => data?.name || `Ciclo #${ciclo_id}`,
  },
  {
    key: "cycleFeeding",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id/alimentacion",
    parentKey: "cycle",
    label: () => "Alimentación",
  },
  {
    key: "cycleFeedingPlan",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id/alimentacion/:planId",
    parentKey: "cycleFeeding",
    async loadLabel({ id, estanque_id, ciclo_id, planId }) {
      if (!id || !estanque_id || !ciclo_id || !planId) return null;
      const { data } = await apiFetchJsonSafe(
        `/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/feeding-plans/${planId}/`
      );
      return data;
    },
    label: ({ planId }, data) => data?.name || data?.title || `Plan #${planId}`,
  },
  {
    key: "cycleHealth",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id/salud",
    parentKey: "cycle",
    label: () => "Salud y Tratamientos",
  },
  {
    key: "healthStat",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id/salud/:healthStatId",
    parentKey: "cycleHealth",
    async loadLabel({ id, estanque_id, ciclo_id, healthStatId }) {
      if (!id || !estanque_id || !ciclo_id || !healthStatId) return null;
      const { data } = await apiFetchJsonSafe(
        `/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/health-stats/${healthStatId}/`
      );
      return data;
    },
    label: ({ healthStatId }, data) =>
      data?.name || data?.title || data?.type || `Registro de Salud #${healthStatId}`,
  },
  {
    key: "healthPlan",
    path: "/home/granja/:id/estanque/:estanque_id/ciclo/:ciclo_id/salud/:healthStatId/plan/:planId",
    parentKey: "healthStat",
    async loadLabel({ id, estanque_id, ciclo_id, healthStatId, planId }) {
      if (!id || !estanque_id || !ciclo_id || !healthStatId || !planId) return null;
      const { data } = await apiFetchJsonSafe(
        `/farms/${id}/ponds/${estanque_id}/cycles/${ciclo_id}/health-stats/${healthStatId}/treatment-plans/${planId}/`
      );
      return data;
    },
    label: ({ planId }, data) => data?.name || data?.title || `Plan #${planId}`,
  },
];

const routeMap = Object.fromEntries(ROUTES.map((route) => [route.key, route]));

function normalizePath(path) {
  return path.replace(/#.*$/, "").replace(/\?.*$/, "").replace(/\/+$/g, "").replace(/^\/+/g, "/");
}

function splitSegments(path) {
  return normalizePath(path)
    .split("/")
    .filter(Boolean);
}

function matchPathPattern(pathname, pattern) {
  const pathSegments = splitSegments(pathname);
  const patternSegments = splitSegments(pattern);

  if (pathSegments.length !== patternSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    return segment.startsWith(":") || segment === pathSegments[index];
  });
}

export function extractRouteParams(pathname, pattern) {
  const pathSegments = splitSegments(pathname);
  const patternSegments = splitSegments(pattern);
  const params = {};

  patternSegments.forEach((segment, index) => {
    if (segment.startsWith(":")) {
      const key = segment.slice(1);
      params[key] = pathSegments[index];
    }
  });

  return params;
}

export function buildRoutePath(pattern, params = {}) {
  return normalizePath(
    pattern.replace(/:([^/]+)/g, (_, key) => {
      const value = params[key];
      return value != null ? String(value) : "";
    })
  );
}

export function getRouteChain(pathname) {
  const normalized = normalizePath(pathname);
  const matchedRoutes = ROUTES.filter((route) => matchPathPattern(normalized, route.path));
  const currentRoute = matchedRoutes.sort((a, b) => b.path.split("/").length - a.path.split("/").length)[0];

  if (!currentRoute) {
    return [];
  }

  const chain = [];
  let route = currentRoute;

  while (route) {
    chain.unshift(route);
    route = route.parentKey ? routeMap[route.parentKey] : null;
  }

  return chain;
}

export function getBreadcrumbUrl(route, params) {
  return buildRoutePath(route.path, params);
}

export function getRouteLabel(route, params, data = null) {
  if (typeof route.label === "function") {
    return route.label(params, data);
  }
  return route.label || "";
}

export async function loadBreadcrumbLabels(routeChain, params) {
  const labels = {};

  await Promise.all(
    routeChain.map(async (route) => {
      if (typeof route.loadLabel !== "function") {
        labels[route.key] = getRouteLabel(route, params, null);
        return;
      }

      try {
        const data = await route.loadLabel(params);
        labels[route.key] = getRouteLabel(route, params, data);
      } catch (error) {
        labels[route.key] = getRouteLabel(route, params, null);
      }
    })
  );

  return labels;
}

export function isHomePath(pathname) {
  return normalizePath(pathname) === "/home";
}

export function humanizeRouteSegment(segment) {
  const replacements = {
    granja: "Granja",
    estanque: "Estanque",
    ciclo: "Ciclo",
    alimentacion: "Alimentación",
    salud: "Salud",
    inventory: "Inventario",
    sales: "Ventas",
    granja_trabajadores: "Trabajadores",
    perfil: "Perfil",
  };

  if (replacements[segment]) {
    return replacements[segment];
  }

  return segment
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveFallbackBreadcrumbs(pathname) {
  const segments = splitSegments(pathname);
  const crumbs = [];
  let accumulated = "";

  for (const segment of segments) {
    accumulated += `/${segment}`;
    crumbs.push({
      href: accumulated,
      label: humanizeRouteSegment(segment),
    });
  }

  return crumbs;
}
