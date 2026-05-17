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
  viewDataRetentionDashboard: "view_data_retention_dashboard",
  manageDataRetentionSettings: "manage_data_retention_settings",
  deleteChatPermanently: "delete_chat_permanently",
  bulkDeleteChatPermanently: "bulk_delete_chat_permanently",
  deleteDocumentPermanently: "delete_document_permanently",
  bulkDeleteDocumentPermanently: "bulk_delete_document_permanently",
  viewDeletionAuditLogs: "view_deletion_audit_logs",
  runRetentionCleanupNow: "run_retention_cleanup_now",
};

export const hasAdminPermission = (permissions, permissionKey) => {
  if (!permissionKey) return true;

  if (permissions && !Array.isArray(permissions) && typeof permissions === "object") {
    const normalizedKey = normalizePermissionValue(permissionKey);
    if (normalizedKey in permissions) {
      return Boolean(permissions[normalizedKey]);
    }
    return false;
  }

  if (!Array.isArray(permissions)) {
    return true;
  }

  const activePermissions = new Set(permissions.map(normalizePermissionValue));
  return activePermissions.has(normalizePermissionValue(permissionKey));
};
