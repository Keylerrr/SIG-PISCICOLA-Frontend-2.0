import { useEffect, useState } from "react";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";

function normalizeRole(role) {
  if (!role) return "";
  if (typeof role === "string") return role.toLowerCase();
  return (role.name || role).toString().toLowerCase();
}

export function usePermissions(farmId) {
  const [permissions, setPermissions] = useState({
    isFarmMember: false,
    canManageCycle: false,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadPermissions() {
      const token = typeof window !== "undefined" ? localStorage.getItem("access") : null;
      const user = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null;
      const normalizedRole = normalizeRole(user?.role);
      const isAdmin = normalizedRole === "admin";
      const isProductor = normalizedRole === "productor";

      if (!token || !farmId) {
        if (mounted) {
          setPermissions({ isFarmMember: false, canManageCycle: isAdmin, isAdmin, loading: false });
        }
        return;
      }

      try {
        const response = await fetch(`https://backend-pongase-trucha.onrender.com/api/farms/${farmId}/members/`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }

        const members = await response.json();
        const me = Array.isArray(members)
          ? members.find((member) => member?.user?.id === user?.id)
          : null;

        const isFarmMember = Boolean(me);
        const canManageCycle =
          isAdmin ||
          me?.is_owner ||
          (isProductor && isFarmMember) ||
          hasPermission(me?.permissions || [], PERMISSIONS.MANAGE_CYCLE);

        if (mounted) {
          setPermissions({ isFarmMember, canManageCycle, isAdmin, loading: false });
        }
      } catch (error) {
        if (mounted) {
          setPermissions({ isFarmMember: false, canManageCycle: isAdmin, isAdmin, loading: false });
        }
      }
    }

    loadPermissions();

    return () => {
      mounted = false;
    };
  }, [farmId]);

  return permissions;
}
