// Short-lived in-memory cache smooths repeated admin queries without persisting stale data across sessions.
const cacheStore = new Map();

const normalizeArray = (value) => {
  if (!Array.isArray(value)) return [];
  return [...value]
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
};

const stableValue = (value) => {
  if (Array.isArray(value)) {
    return normalizeArray(value);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((a, b) => a.localeCompare(b))
      .reduce((acc, key) => {
        acc[key] = stableValue(value[key]);
        return acc;
      }, {});
  }

  return value ?? null;
};

export const buildDocumentCacheKey = (scope, params = {}) => {
  const normalized = stableValue(params);
  return `${scope}:${JSON.stringify(normalized)}`;
};

export const getCachedDocumentRequest = (key, ttlMs) => {
  if (!key) return null;

  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > ttlMs) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value;
};

export const setCachedDocumentRequest = (key, value) => {
  if (!key) return;
  cacheStore.set(key, { value, timestamp: Date.now() });
};

export const invalidateDocumentRequestCache = (predicate) => {
  if (!(predicate instanceof Function)) {
    cacheStore.clear();
    return;
  }

  [...cacheStore.keys()].forEach((key) => {
    if (predicate(key)) {
      cacheStore.delete(key);
    }
  });
};
