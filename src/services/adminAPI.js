const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api";

const BASE_URL = `${rawBase}/admin`;

function getToken() {
  return localStorage.getItem("adminToken");
}

async function readErrorMessage(res, fallback) {
  const raw = await res.text().catch(() => "");
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return parsed?.message || raw || fallback;
  } catch {
    return raw || fallback;
  }
}

async function api(url, method = "GET", body = null) {
  const res = await fetch(`${BASE_URL}/${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    const message = await readErrorMessage(res, "Failed to fetch admin data.");
    throw new Error(message);
  }

  return res.json();
}

export async function fetchAdmins() {
  return api("fetchadmin", "GET");
}

export async function updateAdmin(payload) {
  return api("updateadmin", "POST", payload);
}

export async function createAdmin(payload) {
  return api("createadmin", "POST", payload);
}

export async function deleteAdmin(userid) {
  return api("deleteadmin", "POST", { userid });
}

/**
 * Save document filter preferences for the current admin
 * @param {object} filters - Filter state object containing selectedFilters, statusFilter, categoryFilter, flagFilter, and dateRange
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function saveDocumentFilters(filters) {
  try {
    const timestamp = new Date().toISOString();
    return await api("savedocumentfilters", "POST", {
      name: "Auto-saved document filters",
      description: `Updated at ${timestamp}`,
      filters,
    });
  } catch (error) {
    // If backend endpoint doesn't exist yet, fail gracefully
    console.warn("Failed to save document filters to backend:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Retrieve saved document filter preferences for the current admin
 * @returns {Promise<{filters?: object, success?: boolean}>}
 */
export async function fetchDocumentFilters() {
  try {
    const response = await api("getdocumentfilters", "GET");
    const latestFilter = Array.isArray(response?.filters) ? response.filters[0] : null;

    if (!latestFilter?.id) {
      return { filters: null, success: false };
    }

    const detailResponse = await api(
      `getdocumentfilters?filterId=${encodeURIComponent(latestFilter.id)}`,
      "GET"
    );

    return {
      filters: detailResponse?.filter?.filters || null,
      success: Boolean(detailResponse?.filter?.filters),
    };
  } catch (error) {
    // If backend endpoint doesn't exist yet, return empty
    console.warn("Failed to fetch document filters from backend:", error.message);
    return { filters: null, success: false };
  }
}
