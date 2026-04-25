import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUsersRoute } from "../../utils/apiRoutes";

const USERS_CACHE_KEY = "chat_users_cache_v2";
const FETCH_USERS_DEDUPE_WINDOW_MS = 3000;
const FETCH_MORE_USERS_DEDUPE_WINDOW_MS = 1500;
const inFlightRequestKeys = new Set();
const lastRequestAtByKey = new Map();

const defaultState = {
  users: [],
  loading: false,
  loadingMore: false,
  error: null,
  lastFetched: null,
  hasMore: false,
  page: 1,
  limit: 10,
  totalDocuments: 0,
  totalPages: 0,
  lastSearch: undefined,
  hasLoaded: false,
};

const readUsersCache = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.users)) return null;

    return {
      users: parsed.users,
      hasMore: Boolean(parsed.hasMore),
      page: Number.isFinite(parsed.page) ? parsed.page : 1,
      limit: Number.isFinite(parsed.limit) ? parsed.limit : 10,
      totalDocuments: Number.isFinite(parsed.totalDocuments) ? parsed.totalDocuments : 0,
      totalPages: Number.isFinite(parsed.totalPages) ? parsed.totalPages : 0,
      lastSearch: parsed.lastSearch,
      lastFetched: Number.isFinite(parsed.lastFetched) ? parsed.lastFetched : null,
      hasLoaded: false, // Always refetch on load so we get fresh list and correct message order
    };
  } catch (error) {
    console.error("Failed to read chat users cache:", error);
    return null;
  }
};

const writeUsersCache = (state) => {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      users: state.users,
      hasMore: state.hasMore,
      page: state.page,
      limit: state.limit,
      totalDocuments: state.totalDocuments,
      totalPages: state.totalPages,
      lastSearch: state.lastSearch,
      lastFetched: state.lastFetched,
    };
    window.localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("Failed to write chat users cache:", error);
  }
};

const cachedState = readUsersCache();

const normalizeComparableId = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(/[+\s-]/g, "");
  return normalized || null;
};

const getUserIdentityKey = (user) => {
  const candidate =
    user?.userid ??
    user?.userId ??
    user?.contactId ??
    user?.contactid ??
    user?.uid ??
    user?.id ??
    user?.phone ??
    null;

  return normalizeComparableId(candidate);
};

const matchUserId = (user, targetUserId) => {
  const expected = normalizeComparableId(targetUserId);
  if (!expected) return false;

  return [user.userid, user.userId, user.contactId, user.contactid, user.uid, user.id, user.phone]
    .map(normalizeComparableId)
    .some((candidate) => candidate === expected);
};

const dedupeUsers = (users = []) => {
  const uniqueUsers = [];
  const seen = new Set();

  users.forEach((user) => {
    const key = getUserIdentityKey(user);
    if (!key) return;
    if (seen.has(key)) return;
    seen.add(key);
    uniqueUsers.push(user);
  });

  return uniqueUsers;
};

const mergeChatMetadata = (incomingUser, existingUser) => {
  if (!existingUser) {
    return {
      ...incomingUser,
      last_message: incomingUser.last_message,
      last_chat_time: incomingUser.last_chat_time,
    };
  }

  const incomingLastChatTime = incomingUser.last_chat_time;
  const existingLastChatTime = existingUser.last_chat_time;

  return {
    ...incomingUser,
    last_message:
      incomingUser.last_message ??
      existingUser.last_message ??
      "",
    last_chat_time:
      incomingLastChatTime ??
      existingLastChatTime ??
      null,
  };
};

// Async thunk for fetching initial users
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ page = 1, limit = 25, search = undefined } = {}, { rejectWithValue }) => {
    const requestKey = `users:${page}:${limit}:${search ?? ""}`;
    inFlightRequestKeys.add(requestKey);
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchUsersRoute(page, limit, search);
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch users");
      }

      // Handle API response format with pagination object
      const pagination = data.pagination || {};

      return {
        users: data.users || [],
        hasMore: pagination.hasMore !== undefined ? pagination.hasMore : false,
        page: pagination.page || page,
        limit: pagination.limit || limit,
        totalDocuments: pagination.totalDocuments || 0,
        totalPages: pagination.totalPages || 0,
        search: search,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch users");
    } finally {
      inFlightRequestKeys.delete(requestKey);
      lastRequestAtByKey.set(requestKey, Date.now());
    }
  },
  {
    condition: ({ page = 1, limit = 25, search = undefined } = {}, { getState }) => {
      const requestKey = `users:${page}:${limit}:${search ?? ""}`;
      if (inFlightRequestKeys.has(requestKey)) {
        return false;
      }

      const now = Date.now();
      const lastRequestAt = lastRequestAtByKey.get(requestKey) ?? 0;
      if (now - lastRequestAt < FETCH_USERS_DEDUPE_WINDOW_MS) {
        return false;
      }

      const state = getState()?.users;
      if (state?.loading) {
        return false;
      }

      return true;
    },
  }
);

// Async thunk for loading more users (pagination)
export const fetchMoreUsers = createAsyncThunk(
  "users/fetchMoreUsers",
  async ({ page, limit = 10, search = undefined }, { rejectWithValue }) => {
    const requestKey = `users:more:${page}:${limit}:${search ?? ""}`;
    inFlightRequestKeys.add(requestKey);
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchUsersRoute(page, limit, search);
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch more users");
      }

      // Handle API response format with pagination object
      const pagination = data.pagination || {};

      return {
        users: data.users || [],
        hasMore: pagination.hasMore !== undefined ? pagination.hasMore : false,
        page: pagination.page || page,
        limit: pagination.limit || limit,
        totalDocuments: pagination.totalDocuments || 0,
        totalPages: pagination.totalPages || 0,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more users");
    } finally {
      inFlightRequestKeys.delete(requestKey);
      lastRequestAtByKey.set(requestKey, Date.now());
    }
  },
  {
    condition: ({ page, limit = 10, search = undefined }, { getState }) => {
      if (!Number.isFinite(page) || page < 1) return false;

      const requestKey = `users:more:${page}:${limit}:${search ?? ""}`;
      if (inFlightRequestKeys.has(requestKey)) {
        return false;
      }

      const now = Date.now();
      const lastRequestAt = lastRequestAtByKey.get(requestKey) ?? 0;
      if (now - lastRequestAt < FETCH_MORE_USERS_DEDUPE_WINDOW_MS) {
        return false;
      }

      const state = getState()?.users;
      if (state?.loadingMore || state?.loading) {
        return false;
      }

      return true;
    },
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: cachedState ? { ...defaultState, ...cachedState } : defaultState,
  reducers: {
    clearUsers: (state) => {
      state.users = [];
      state.error = null;
      state.hasMore = false;
      state.page = 1;
      state.totalDocuments = 0;
      state.totalPages = 0;
      state.hasLoaded = false;
      writeUsersCache(state);
    },
    updateUserLastMessage: (state, action) => {
      const { userid, lastMessage, lastChatTime } = action.payload;
      const user = state.users.find((u) => matchUserId(u, userid));
      if (user) {
        user.last_message = lastMessage;
        user.last_chat_time = lastChatTime;
        state.lastFetched = Date.now();
        writeUsersCache(state);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Initial fetch
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        const previousUsers = state.users || [];
        const incomingUsers = action.payload.users || [];
        const incomingSearch = action.payload.search;
        const isFirstPage = (action.payload.page || 1) === 1;
        const searchChanged = state.lastSearch !== incomingSearch;
        const requestedLimit = action.meta?.arg?.limit;
        const isFullRosterFetch =
          requestedLimit === -1 || action.payload.limit === -1;

        const mergedIncomingUsers = incomingUsers.map((u) => {
          const existingUser = previousUsers.find((prevUser) =>
            matchUserId(prevUser, u.userid ?? u.userId ?? u.contactId ?? u.id ?? u.phone)
          );
          return mergeChatMetadata(u, existingUser);
        });

        let nextUsers = mergedIncomingUsers;

        if (isFullRosterFetch) {
          nextUsers = mergedIncomingUsers;
        } else if (isFirstPage && !searchChanged) {
          const knownPageSize =
            Number.isFinite(action.payload.limit) && action.payload.limit > 0
              ? action.payload.limit
              : mergedIncomingUsers.length;
          const preservedTailUsers = previousUsers.slice(knownPageSize);

          nextUsers = [...mergedIncomingUsers];

          preservedTailUsers.forEach((user) => {
            const alreadyIncluded = nextUsers.some((existingUser) =>
              matchUserId(
                existingUser,
                user.userid ??
                  user.userId ??
                  user.contactId ??
                  user.id ??
                  user.phone
              )
            );

            if (!alreadyIncluded) {
              nextUsers.push(user);
            }
          });
        }

        state.users = dedupeUsers(nextUsers);
        state.hasMore =
          isFullRosterFetch && !action.payload.hasMore && !action.payload.totalPages
            ? false
            : action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.lastSearch = action.payload.search;
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
        state.hasLoaded = true;
        if (import.meta.env.DEV) {
          console.debug("[usersSlice] fetchUsers.fulfilled", {
            requestedLimit,
            payloadLimit: action.payload.limit,
            users: state.users.length,
            hasMore: state.hasMore,
            page: state.page,
            totalDocuments: state.totalDocuments,
            totalPages: state.totalPages,
          });
        }
        writeUsersCache(state);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
        state.hasLoaded = true;
      })
      // Load more users
      .addCase(fetchMoreUsers.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreUsers.fulfilled, (state, action) => {
        const existingUsers = state.users || [];
        const mergedIncomingUsers = (action.payload.users || []).map((u) => {
          const existingUser = existingUsers.find((prevUser) =>
            matchUserId(prevUser, u.userid ?? u.userId ?? u.contactId ?? u.id ?? u.phone)
          );
          return mergeChatMetadata(u, existingUser);
        });

        const nextUsers = [...existingUsers];

        mergedIncomingUsers.forEach((incomingUser) => {
          const existingIndex = nextUsers.findIndex((user) =>
            matchUserId(user, incomingUser.userid ?? incomingUser.userId ?? incomingUser.contactId ?? incomingUser.id ?? incomingUser.phone)
          );

          if (existingIndex >= 0) {
            nextUsers[existingIndex] = {
              ...nextUsers[existingIndex],
              ...incomingUser,
            };
            return;
          }

          nextUsers.push(incomingUser);
        });

        state.users = dedupeUsers(nextUsers);
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.loadingMore = false;
        state.error = null;
        state.lastFetched = Date.now();
        writeUsersCache(state);
      })
      .addCase(fetchMoreUsers.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

export const { clearUsers, updateUserLastMessage } = usersSlice.actions;
export default usersSlice.reducer;
