import { fetchMaintenanceUsersRoute, fetchUsersRoute } from "../utils/apiRoutes";

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeUsersArray(payload) {
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

async function fetchRecipients(url, label) {
  const token = getAdminToken();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await parseJsonSafe(response);

  if (!response.ok) {
    const message =
      data?.message || data?.error || `Failed to fetch ${label} recipients`;
    throw new Error(message);
  }

  return normalizeUsersArray(data);
}

export async function fetchBroadcastDrivers() {
  return fetchRecipients(fetchUsersRoute(1, -1), "driver");
}

export async function fetchBroadcastAdmins() {
  return fetchRecipients(fetchMaintenanceUsersRoute(-1), "admin");
}
