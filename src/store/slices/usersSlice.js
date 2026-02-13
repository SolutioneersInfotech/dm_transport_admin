import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUsersRoute } from "../../utils/apiRoutes";

const USERS_CACHE_KEY = "chat_users_cache_v1";

const defaultState = {
  users: [],
  sourceKey: null,
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
      sourceKey: parsed.sourceKey || "general",
      hasMore: Boolean(parsed.hasMore),
      page: Number.isFinite(parsed.page) ? parsed.page : 1,
      limit: Number.isFinite(parsed.limit) ? parsed.limit : 10,
      totalDocuments: Number.isFinite(parsed.totalDocuments) ? parsed.totalDocuments : 0,
      totalPages: Number.isFinite(parsed.totalPages) ? parsed.totalPages : 0,
      lastSearch: parsed.lastSearch,
      lastFetched: Number.isFinite(parsed.lastFetched) ? parsed.lastFetched : null,
      hasLoaded: parsed.users.length > 0,
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
      sourceKey: state.sourceKey,
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

// Async thunk for fetching initial users
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ page = 1, limit = -1, search = undefined, sourceKey = "general" } = {}, { rejectWithValue }) => {
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
        sourceKey,
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
  async ({ page, limit = 10, search = undefined, sourceKey = "general" }, { rejectWithValue }) => {
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
        sourceKey,
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
      state.sourceKey = null;
      state.error = null;
      state.hasMore = false;
      state.page = 1;
      state.totalDocuments = 0;
      state.totalPages = 0;
      state.hasLoaded = false;
      writeUsersCache(state);
    },
    setUsersForSource: (state, action) => {
      const {
        users = [],
        sourceKey = "general",
        page = 1,
        limit = -1,
        hasMore = false,
        totalDocuments = 0,
        totalPages = 0,
        search = undefined,
      } = action.payload || {};

      state.users = users;
      state.sourceKey = sourceKey;
      state.page = page;
      state.limit = limit;
      state.hasMore = hasMore;
      state.totalDocuments = totalDocuments;
      state.totalPages = totalPages;
      state.lastSearch = search;
      state.loading = false;
      state.loadingMore = false;
      state.error = null;
      state.hasLoaded = true;
      state.lastFetched = Date.now();
      writeUsersCache(state);
    },
    updateUserLastMessage: (state, action) => {
      const { userid, lastMessage, lastChatTime } = action.payload;
      const user = state.users.find((u) => {
        // Try multiple possible ID fields
        return (
          u.userid === userid ||
          u.userId === userid ||
          u.contactId === userid ||
          u.contactid === userid ||
          u.uid === userid ||
          u.id === userid
        );
      });
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
        // Replace users for initial load
        state.users = action.payload.users;
        state.sourceKey = action.payload.sourceKey || "general";
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
        state.users = [...state.users, ...action.payload.users];
        state.sourceKey = action.payload.sourceKey || state.sourceKey || "general";
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

export const { clearUsers, setUsersForSource, updateUserLastMessage } = usersSlice.actions;
export default usersSlice.reducer;
