const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";

const BASE_URL = (() => {
  const base = String(rawBase).replace(/\/+$/, "");
  if (base.endsWith("/api/admin")) return base;
  if (base.endsWith("/api")) return `${base}/admin`;
  return base;
})();

export async function uploadDriverProfilePic({ phone, file }) {
  if (!file) {
    return null;
  }

  const token = localStorage.getItem("adminToken");
  const formData = new FormData();
  formData.append("phone", phone ?? "");
  formData.append("profilePic", file);

  const response = await fetch(`${BASE_URL}/driver/uploadProfilePic`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
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
      data?.message || data?.error || text || "Failed to upload profile image.";
    throw new Error(message);
  }

  return data?.imageUrl ?? null;
}
