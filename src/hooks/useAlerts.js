import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetchJsonSafe } from "@/lib/apiClient";
import { useAuthReady } from "@/hooks/useAuthReady";

const ALERTS_CONCURRENCY = 3;

async function runPool(items, limit, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let index = 0;

  async function runWorker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      try {
        results[current] = await worker(items[current], current);
      } catch (err) {
        results[current] = { error: err };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => runWorker()
  );
  await Promise.all(workers);
  return results;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { authReady, hasToken } = useAuthReady();
  const fetchingRef = useRef(false);

  const fetchAlerts = useCallback(async () => {
    if (!authReady || !hasToken) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const farmsResult = await apiFetchJsonSafe("/farms/", {
        source: "useAlerts.fetchFarms",
      });

      if (farmsResult.skipped || farmsResult.error) {
        if (farmsResult.error) {
          console.error("[useAlerts] farms:", farmsResult.error.message);
        }
        return;
      }

      const farms = farmsResult.data;
      if (!Array.isArray(farms) || farms.length === 0) {
        setAlerts([]);
        setUnreadCount(0);
        return;
      }

      const farmResults = await runPool(farms, ALERTS_CONCURRENCY, async (farm) => {
        if (!farm?.id) return [];

        const alertResult = await apiFetchJsonSafe(
          `/farms/core/${farm.id}/alerts/?is_resolved=false`,
          { source: `useAlerts.farm.${farm.id}` }
        );

        if (alertResult.error || !Array.isArray(alertResult.data)) {
          if (alertResult.error) {
            console.error(
              `[useAlerts] farm ${farm.id}:`,
              alertResult.error.message
            );
          }
          return [];
        }

        return alertResult.data.map((a) => ({ ...a, farmId: farm.id }));
      });

      const allAlerts = farmResults
        .filter((chunk) => Array.isArray(chunk))
        .flat();

      allAlerts.sort(
        (a, b) =>
          new Date(b.created_at || b.date) - new Date(a.created_at || a.date)
      );

      setAlerts(allAlerts);
      setUnreadCount(allAlerts.length);
    } catch (err) {
      console.error("[useAlerts] Error inesperado:", err);
    } finally {
      fetchingRef.current = false;
    }
  }, [authReady, hasToken]);

  const markAllAsRead = async () => {
    if (!hasToken) return;

    try {
      const resolveResults = await runPool(alerts, ALERTS_CONCURRENCY, async (alert) => {
        if (!alert.farmId) return;
        const result = await apiFetchJsonSafe(
          `/farms/core/${alert.farmId}/alerts/${alert.id}/resolve/`,
          {
            method: "PATCH",
            body: {},
            source: "useAlerts.markAllAsRead",
          }
        );
        if (result.error) {
          console.error("[useAlerts] resolve:", result.error.message);
        }
      });
      void resolveResults;
      await fetchAlerts();
    } catch (error) {
      console.error("[useAlerts] markAllAsRead:", error);
    }
  };

  const markAsRead = async (alertId, farmId) => {
    if (!hasToken || !farmId) return;

    try {
      const result = await apiFetchJsonSafe(
        `/farms/core/${farmId}/alerts/${alertId}/resolve/`,
        {
          method: "PATCH",
          body: {},
          source: "useAlerts.markAsRead",
        }
      );
      if (result.error) {
        console.error("[useAlerts] markAsRead:", result.error.message);
        return;
      }
      await fetchAlerts();
    } catch (error) {
      console.error("[useAlerts] markAsRead:", error);
    }
  };

  useEffect(() => {
    if (!authReady || !hasToken) return;

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [authReady, hasToken, fetchAlerts]);

  return { alerts, unreadCount, fetchAlerts, markAllAsRead, markAsRead };
}
