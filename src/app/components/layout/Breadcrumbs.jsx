"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  getRouteChain,
  getBreadcrumbUrl,
  loadBreadcrumbLabels,
  getRouteLabel,
  resolveFallbackBreadcrumbs,
} from "@/lib/breadcrumbs";

export function Breadcrumbs() {
  const pathname = usePathname();
  const params = useParams();
  const routeChain = useMemo(() => getRouteChain(pathname || "/"), [pathname]);
  const [labels, setLabels] = useState({});

  useEffect(() => {
    let active = true;

    async function loadLabels() {
      if (!pathname) {
        setLabels({});
        return;
      }

      if (routeChain.length === 0) {
        setLabels({});
        return;
      }

      const computed = await loadBreadcrumbLabels(routeChain, params);
      if (active) {
        setLabels(computed);
      }
    }

    loadLabels();
    return () => {
      active = false;
    };
  }, [pathname, routeChain, JSON.stringify(params)]);

  const breadcrumbs = useMemo(() => {
    if (routeChain.length > 0) {
      return routeChain.map((route) => ({
        key: route.key,
        href: getBreadcrumbUrl(route, params),
        label: labels[route.key] || getRouteLabel(route, params, null),
      }));
    }

    if (pathname) {
      return resolveFallbackBreadcrumbs(pathname).map((crumb, index, list) => ({
        key: `${crumb.href}-${index}`,
        href: crumb.href,
        label: crumb.label,
      }));
    }

    return [];
  }, [routeChain, labels, params, pathname]);

  if (!pathname || breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-sm text-slate-600">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={crumb.key} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400" />}
                {isLast ? (
                  <span aria-current="page" className="font-semibold text-slate-800">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
