export const PERMISSIONS = {
  MANAGE_REVIEWS: "MANAGE_REVIEWS",
  MANAGE_INVENTORY: "MANAGE_INVENTORY",
  MANAGE_CYCLE: "MANAGE_CYCLE",
  MANAGE_POND: "MANAGE_POND",
  MANAGE_FARM: "MANAGE_FARM",
};

const hierarchy = {
  MANAGE_FARM: [
    "MANAGE_POND",
    "MANAGE_CYCLE",
    "MANAGE_REVIEWS",
    "MANAGE_INVENTORY",
  ],

  MANAGE_POND: [
    "MANAGE_CYCLE",
    "MANAGE_REVIEWS",
  ],

  MANAGE_CYCLE: [
    "MANAGE_REVIEWS",
  ],
};

export function expandPermissions(permissions = []) {
  const set = new Set(permissions);

  let changed = true;

  while (changed) {
    changed = false;

    for (const perm of Array.from(set)) {
      const inherited = hierarchy[perm] || [];

      for (const p of inherited) {
        if (!set.has(p)) {
          set.add(p);
          changed = true;
        }
      }
    }
  }

  return Array.from(set);
}

export function hasPermission(userPermissions, permission) {
  return expandPermissions(userPermissions).includes(permission);
}