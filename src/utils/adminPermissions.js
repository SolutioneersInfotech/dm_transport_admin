const normalizePermissionValue = (value) => String(value ?? "").trim();

export const ADMIN_PERMISSION_KEYS = {
  manageDrivers: "manage_drivers",
  viewDrivers: "view_drivers",
  maintenanceChat: "maintenance_chat",
  viewAdmin: "view_admin",
  manageAdmin: "manage_admin",
  chat: "chat",
  deleteMultipleUsersChart: "delete_multiple_users_chart",
  broadcast: "broadcast",
};

export const hasAdminPermission = (permissions, permissionKey) => {
  if (!permissionKey) return true;

  if (permissions && !Array.isArray(permissions) && typeof permissions === "object") {
    const normalizedKey = normalizePermissionValue(permissionKey);
    if (normalizedKey in permissions) {
      return Boolean(permissions[normalizedKey]);
    }
    return true;
  }

  if (!Array.isArray(permissions)) {
    return true;
  }

  const activePermissions = new Set(permissions.map(normalizePermissionValue));
  return activePermissions.has(normalizePermissionValue(permissionKey));
};
