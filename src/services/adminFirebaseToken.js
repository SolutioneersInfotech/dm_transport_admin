const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";

const BASE_URL = rawBase.replace(/\/+$/, "");

function parseResponseText(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function getAdminFirebaseCustomToken() {
  const adminToken = localStorage.getItem("adminToken");

  if (!adminToken) {
    throw new Error("Missing admin token for Firebase authentication.");
  }

  const response = await fetch(`${BASE_URL}/admin/firebase/token`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  const text = await response.text();
  const data = parseResponseText(text);
  const token =
    data?.token || data?.customToken || data?.data?.token || data?.data;

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      text ||
      "Failed to fetch Firebase custom token.";
    throw new Error(message);
  }

  if (!token || typeof token !== "string") {
    throw new Error("Firebase custom token was missing in response.");
  }

  return token;
}
