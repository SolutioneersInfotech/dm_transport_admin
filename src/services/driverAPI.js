import { fetchDriverCountRoute } from "../utils/apiRoutes";

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

  const combinedName = [
    user?.name,
    user?.driver_name,
    user?.driverName,
    [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    [user?.firstname, user?.lastname].filter(Boolean).join(" "),
  ]
    .map((value) => String(value || "").trim())
    .find(Boolean);

  return {
    id: user?.userid || user?.userId || user?.phone || "",
    name: combinedName || "",
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
    searchKeywords: [
      user?.name,
      user?.driver_name,
      user?.driverName,
      user?.firstName,
      user?.lastName,
      user?.firstname,
      user?.lastname,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" "),
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

export async function fetchAllDrivers({ limit = 100 } = {}) {
  const allDrivers = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { users, pagination } = await fetchDrivers({ page, limit, search: "" });
    allDrivers.push(...users);

    const currentPage = Number(pagination?.currentPage ?? page);
    const totalPages = Number(pagination?.totalPages ?? currentPage);
    const apiHasMore = pagination?.hasMore;

    if (typeof apiHasMore === "boolean") {
      hasMore = apiHasMore;
    } else if (Number.isFinite(totalPages)) {
      hasMore = currentPage < totalPages;
    } else {
      hasMore = users.length === limit;
    }

    page += 1;

    if (page > 200) {
      hasMore = false;
    }
  }

  return allDrivers;
}

export async function fetchDriverCount({ search = "", status = "all", category = "all" } = {}) {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(
    fetchDriverCountRoute({ search, status, category }),
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch driver count");
  }

  const data = await response.json();

  return {
    totalDrivers: Number(data?.total_drivers ?? data?.totalDrivers ?? 0),
  };
}
