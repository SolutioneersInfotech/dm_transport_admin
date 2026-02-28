const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api";

export async function createDriver(payload) {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(`${BASE_URL}/admin/createuser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.message || data?.error || text || "Failed to create driver.";
    throw new Error(message);
  }

  return data;
}

export async function updateDriver(payload) {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(`${BASE_URL}/admin/updateuser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.message || data?.error || text || "Failed to update driver.";
    throw new Error(message);
  }

  return data;
}

export async function deactivateDriver({ userId, isDeactivated }) {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(`${BASE_URL}/admin/deactivateuser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, isDeactivated }),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      text ||
      "Failed to update driver activation status.";
    throw new Error(message);
  }

  return data;
}
