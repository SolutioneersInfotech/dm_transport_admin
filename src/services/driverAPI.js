const DRIVERS_API_URL =
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin/fetchUsers";

function mapDriver(user) {
  const lastSeenSeconds = user?.lastSeen?._seconds;
  const lastSeen = lastSeenSeconds
    ? new Date(lastSeenSeconds * 1000)
    : null;

  return {
    id: user?.userid || user?.phone || "",
    name: user?.name || "Unknown driver",
    phone: user?.phone || "",
    country: user?.country || "",
    category: user?.category || "",
    status: user?.status || "inactive",
    lastSeen,
    email: user?.email || "",
    location: user?.location || "",
    route: user?.route || "",
    loadsCompleted: user?.loadsCompleted ?? null,
    rating: user?.rating ?? null,
    complianceScore: user?.complianceScore ?? null,
    maintenanceChat: Boolean(user?.maintenanceChat),
    image: user?.image || "",
  };
}

export async function fetchDrivers() {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(DRIVERS_API_URL, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch drivers");
  }

  const data = await response.json();
  return (data?.users ?? []).map(mapDriver);
}
