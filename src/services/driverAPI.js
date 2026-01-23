const rawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/";



const DRIVERS_API_URL = `${rawBase}/admin/fetchusers`;


function mapDriver(user) {
  const lastSeenSeconds = user?.lastSeen?._seconds ?? user?.lastSeen?.seconds;
  const lastSeen =
    typeof lastSeenSeconds === "number"
      ? new Date(lastSeenSeconds * 1000)
      : user?.lastSeen
        ? new Date(user.lastSeen)
        : null;

  return {
    id: user?.userid || user?.userId || user?.phone || "",
    name: user?.name || "",
    phone: user?.phone || "",
    country: user?.country || "",
    category: user?.category || "",
    status: user?.status || "inactive",
    lastSeen,
    email: user?.email || "",
    location: user?.location || "",
    route: user?.route || user?.currentRoute || "",
    loadsCompleted: user?.loadsCompleted ?? null,
    rating: user?.rating ?? null,
    complianceScore: user?.complianceScore ?? null,
    maintenanceChat: Boolean(user?.maintenanceChat),
    image:
      user?.profilePic ||
      user?.profilepic ||
      user?.avatar ||
      user?.image ||
      "",
  };
}

function normalizeDriverResponse(data) {
  if (Array.isArray(data)) {
    return { users: data, pagination: {} };
  }

  if (!data || typeof data !== "object") {
    return { users: [], pagination: {} };
  }

  const users =
    data.users || data.data || data.results || data.payload?.users || [];
  const pagination =
    data.pagination || data.pageInfo || data.meta?.pagination || {};

  return { users: Array.isArray(users) ? users : [], pagination };
}

export async function fetchDrivers({ page = 1, limit = 20, search = "" } = {}) {
  const token = localStorage.getItem("adminToken");
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search,
  });
  const response = await fetch(`${DRIVERS_API_URL}?${params.toString()}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch drivers");
  }

  const data = await response.json();
  const { users, pagination } = normalizeDriverResponse(data);

  return {
    users: users.map(mapDriver),
    pagination: pagination || {},
  };
}
