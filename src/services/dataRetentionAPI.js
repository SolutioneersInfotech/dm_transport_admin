import { baseBackendUrl } from "../utils/apiRoutes";

const RETENTION_SETTINGS_ROUTE = `${baseBackendUrl}/data-retention/settings`;
const RETENTION_CLEANUP_ROUTE = `${baseBackendUrl}/data-retention/cleanup`;
const DELETION_AUDIT_LOGS_ROUTE = `${baseBackendUrl}/data-retention/audit-logs`;

function getToken() {
  return localStorage.getItem("adminToken");
}

async function readJsonOrThrow(response, fallbackMessage) {
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data?.message || data?.error || fallbackMessage);
  }

  return data;
}

async function retentionRequest(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return readJsonOrThrow(response, "Retention request failed.");
}

export async function fetchRetentionSettings() {
  return retentionRequest(RETENTION_SETTINGS_ROUTE);
}

export async function updateRetentionSettings(settings) {
  return retentionRequest(RETENTION_SETTINGS_ROUTE, {
    method: "PUT",
    body: settings,
  });
}

export async function runRetentionCleanupNow(scope = "all") {
  return retentionRequest(RETENTION_CLEANUP_ROUTE, {
    method: "POST",
    body: { scope },
  });
}

export async function fetchDeletionAuditLogs(options = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append("limit", options.limit);
  if (options.cursor) params.append("cursor", options.cursor);

  const url = params.toString()
    ? `${DELETION_AUDIT_LOGS_ROUTE}?${params.toString()}`
    : DELETION_AUDIT_LOGS_ROUTE;

  return retentionRequest(url);
}
