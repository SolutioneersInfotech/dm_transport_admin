const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api";

const BASE_URL = `${rawBase}/admin`;

function getToken() {
  return localStorage.getItem("adminToken");
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
    const message = await res.text();
    throw new Error(message || "Failed to fetch admin data.");
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
