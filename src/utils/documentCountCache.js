const COUNT_CACHE_TTL = 360 * 1000; // 360 seconds keeps polling responsive while preventing repeated identical count requests.

const countCache = new Map();

export function getCachedDocumentCount(key) {
  const cached = countCache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > COUNT_CACHE_TTL) {
    countCache.delete(key);
    return null;
  }

  return cached.value;
}

export function setCachedDocumentCount(key, value) {
  countCache.set(key, {
    value,
    timestamp: Date.now(),
  });
}

export function clearDocumentCountCache() {
  // Manual refresh clears this map so the next count read always hits backend for fresh totals.
  countCache.clear();
}

export function buildCountCacheKey(filters) {
  // Count cache key is derived from active filters so each filter combination is cached independently.
  return JSON.stringify({
    types: filters.types || [],
    isFlagged: filters.isFlagged,
    startDateTimeUtc: filters.startDateTimeUtc,
    endDateTimeUtc: filters.endDateTimeUtc,
    category: filters.category,
    search: filters.search,
    isSeen: filters.isSeen,
  });
}
