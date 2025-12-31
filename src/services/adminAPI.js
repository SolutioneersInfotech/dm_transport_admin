const BASE_URL =
  import.meta.env.VITE_ADMIN_API_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";

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
