import { fetchDocumentsHeadRoute } from "../utils/apiRoutes";
import { buildDocumentCacheKey, getCachedDocumentRequest, setCachedDocumentRequest } from "./documentRequestCache";

const HEAD_CACHE_TTL_MS = 5 * 1000;

export const fetchDocumentsHeadAPI = async ({
  startDate,
  endDate,
  search = "",
  isSeen = null,
  isFlagged = null,
  category = null,
  filters = [],
  limit = 100,
  bypassCache = false,
}) => {
  const cacheKey = buildDocumentCacheKey("documentsHead", {
    startDate,
    endDate,
    search,
    isSeen,
    isFlagged,
    category,
    filters,
    limit,
  });

  if (!bypassCache) {
    const cached = getCachedDocumentRequest(cacheKey, HEAD_CACHE_TTL_MS);
    if (cached) return cached;
  }

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

  // Tiny TTL memory cache keeps page-1/filter transitions snappy without relying on browser HTTP cache freshness.
  setCachedDocumentRequest(cacheKey, data);

  return data;
};
