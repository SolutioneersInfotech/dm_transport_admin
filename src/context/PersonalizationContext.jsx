import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchPersonalization,
  savePersonalization,
} from "../services/personalizationAPI";

const SESSION_STORAGE_PREFIX = "dm_admin_personalization";
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

const PersonalizationContext = createContext(null);

function getSessionStorageKey(userId) {
  return `${SESSION_STORAGE_PREFIX}:${userId}`;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePersonalization(value) {
  return isPlainObject(value) ? value : {};
}

function deepMerge(base, patch) {
  if (!isPlainObject(base)) {
    return normalizePersonalization(patch);
  }

  if (!isPlainObject(patch)) {
    return { ...base };
  }

  const merged = { ...base };

  Object.entries(patch).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = deepMerge(base[key], value);
      return;
    }

    merged[key] = value;
  });

  return merged;
}

function readSessionPersonalization(userId) {
  if (!userId || typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(getSessionStorageKey(userId));
    if (!raw) return {};
    return normalizePersonalization(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to read personalization from session storage:", error);
    return {};
  }
}

function writeSessionPersonalization(userId, personalization) {
  if (!userId || typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getSessionStorageKey(userId),
      JSON.stringify(normalizePersonalization(personalization))
    );
  } catch (error) {
    console.error("Failed to write personalization to session storage:", error);
  }
}

export function PersonalizationProvider({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const userId = user?.userid || user?.userId || user?.id || null;
  const [personalization, setPersonalization] = useState({});
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const dirtyRef = useRef(false);
  const personalizationRef = useRef({});

  const applyPersonalization = useCallback(
    (nextValue, { markDirty = false } = {}) => {
      const normalized = normalizePersonalization(nextValue);
      personalizationRef.current = normalized;
      dirtyRef.current = markDirty;
      setPersonalization(normalized);

      if (userId) {
        writeSessionPersonalization(userId, normalized);
      }
    },
    [userId]
  );

  const syncNow = useCallback(async () => {
    if (!userId || !dirtyRef.current) {
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await savePersonalization(personalizationRef.current);
      dirtyRef.current = false;
    } catch (syncError) {
      console.error("Failed to sync personalization:", syncError);
      setError(syncError instanceof Error ? syncError : new Error(String(syncError)));
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isLoading) {
      return undefined;
    }

    if (!isAuthenticated || !userId) {
      setPersonalization({});
      personalizationRef.current = {};
      dirtyRef.current = false;
      setError(null);
      setIsReady(false);
      return undefined;
    }

    let isCancelled = false;

    const loadPersonalization = async () => {
      setIsReady(false);
      setError(null);

      const sessionFallback = readSessionPersonalization(userId);

      try {
        const response = await fetchPersonalization();
        if (isCancelled) return;

        const nextValue = normalizePersonalization(response?.personalization);
        applyPersonalization(nextValue, { markDirty: false });
        setIsReady(true);
      } catch (loadError) {
        if (isCancelled) return;

        console.error("Failed to fetch personalization:", loadError);
        setError(loadError instanceof Error ? loadError : new Error(String(loadError)));
        applyPersonalization(sessionFallback, { markDirty: false });
        setIsReady(true);
      }
    };

    loadPersonalization();

    return () => {
      isCancelled = true;
    };
  }, [applyPersonalization, isAuthenticated, isLoading, userId]);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      syncNow();
    }, SYNC_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, syncNow, userId]);

  const updatePersonalization = useCallback(
    (nextValueOrUpdater) => {
      const currentValue = personalizationRef.current;
      const computedValue =
        typeof nextValueOrUpdater === "function"
          ? nextValueOrUpdater(currentValue)
          : deepMerge(currentValue, nextValueOrUpdater);

      applyPersonalization(computedValue, { markDirty: true });
    },
    [applyPersonalization]
  );

  const replacePersonalization = useCallback(
    (nextValue) => {
      applyPersonalization(nextValue, { markDirty: true });
    },
    [applyPersonalization]
  );

  const value = useMemo(
    () => ({
      personalization,
      isReady,
      isSyncing,
      error,
      updatePersonalization,
      replacePersonalization,
      syncNow,
    }),
    [
      error,
      isReady,
      isSyncing,
      personalization,
      replacePersonalization,
      syncNow,
      updatePersonalization,
    ]
  );

  return (
    <PersonalizationContext.Provider value={value}>
      {children}
    </PersonalizationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePersonalization() {
  const context = useContext(PersonalizationContext);

  if (!context) {
    throw new Error(
      "usePersonalization must be used within a PersonalizationProvider"
    );
  }

  return context;
}
