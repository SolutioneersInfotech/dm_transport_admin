import { fetchDocumentsHeadRoute } from "../utils/apiRoutes";

export const fetchDocumentsHeadAPI = async ({
  startDate,
  endDate,
  search = "",
  isSeen = null,
  isFlagged = null,
  category = null,
  filters = [],
  limit = 30,
}) => {
  const token = localStorage.getItem("adminToken");
  const url = fetchDocumentsHeadRoute(startDate, endDate, {
    search,
    isSeen,
    isFlagged,
    category,
    filters,
    limit,
  });

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch documents head");
  }

  return data;
};
