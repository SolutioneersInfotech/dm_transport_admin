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

async function personalizationRequest(path, method = "GET", body = null) {
  const response = await fetch(`${BASE_URL}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "Failed to process personalization request."
    );
    throw new Error(message);
  }

  return response.json();
}

export async function fetchPersonalization() {
  return personalizationRequest("personalization", "GET");
}

export async function savePersonalization(personalization) {
  return personalizationRequest("personalization", "POST", { personalization });
}
