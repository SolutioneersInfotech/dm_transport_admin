import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUsersRoute } from "../../utils/apiRoutes";

const USERS_CACHE_KEY = "chat_users_cache_v1";

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
  const normalized = String(value).trim();
  return normalized || null;
};

const matchUserId = (user, targetUserId) => {
  const expected = normalizeComparableId(targetUserId);
  if (!expected) return false;

  return [user.userid, user.userId, user.contactId, user.contactid, user.uid, user.id]
    .map(normalizeComparableId)
    .some((candidate) => candidate === expected);
};

// Async thunk for fetching initial users
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ page = 1, limit = -1, search = undefined } = {}, { rejectWithValue }) => {
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
    }
  }
);

// Async thunk for loading more users (pagination)
export const fetchMoreUsers = createAsyncThunk(
  "users/fetchMoreUsers",
  async ({ page, limit = 10, search = undefined }, { rejectWithValue }) => {
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
    }
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
        // Strip last_message/last_chat_time so ChatList re-fetches from Firebase and sorts by real order
        state.users = (action.payload.users || []).map((u) => ({
          ...u,
          last_message: undefined,
          last_chat_time: undefined,
        }));
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.lastSearch = action.payload.search;
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
        state.hasLoaded = true;
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
        const newUsers = (action.payload.users || []).map((u) => ({
          ...u,
          last_message: undefined,
          last_chat_time: undefined,
        }));
        state.users = [...state.users, ...newUsers];
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
