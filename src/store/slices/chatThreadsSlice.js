import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchChatThreads as fetchChatThreadsApi } from "../../services/chatAPI";

function normalizeThreadsResponse(payload, fallbackPage, fallbackLimit, fallbackSearch, fallbackType) {
  const threads = Array.isArray(payload?.threads)
    ? payload.threads
    : Array.isArray(payload?.users)
      ? payload.users
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const pagination = payload?.pagination || {};
  const page = pagination.page ?? payload?.page ?? fallbackPage;
  const limit = pagination.limit ?? payload?.limit ?? fallbackLimit;
  const hasMore =
    pagination.hasMore !== undefined
      ? pagination.hasMore
      : pagination.totalPages !== undefined
        ? page < pagination.totalPages
        : threads.length >= limit;

  return {
    threads,
    page,
    limit,
    hasMore,
    totalDocuments: pagination.totalDocuments ?? payload?.totalDocuments ?? 0,
    totalPages: pagination.totalPages ?? payload?.totalPages ?? 0,
    search: payload?.search ?? fallbackSearch,
    type: payload?.type ?? fallbackType,
  };
}

export const fetchChatThreads = createAsyncThunk(
  "chatThreads/fetchChatThreads",
  async ({ page = 1, limit = 20, search = undefined, type = "general" } = {}, { rejectWithValue }) => {
    try {
      const payload = await fetchChatThreadsApi({ page, limit, search, type });
      return normalizeThreadsResponse(payload, page, limit, search, type);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch chat threads");
    }
  }
);

export const fetchMoreChatThreads = createAsyncThunk(
  "chatThreads/fetchMoreChatThreads",
  async ({ page, limit = 20, search = undefined, type = "general" }, { rejectWithValue }) => {
    try {
      const payload = await fetchChatThreadsApi({ page, limit, search, type });
      return normalizeThreadsResponse(payload, page, limit, search, type);
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more chat threads");
    }
  }
);

const chatThreadsSlice = createSlice({
  name: "chatThreads",
  initialState: {
    threads: [],
    loading: false,
    loadingMore: false,
    error: null,
    page: 1,
    limit: 20,
    hasMore: false,
    totalDocuments: 0,
    totalPages: 0,
    lastSearch: undefined,
    searchTerm: "",
    type: "general",
  },
  reducers: {
    clearThreads: (state) => {
      state.threads = [];
      state.error = null;
      state.page = 1;
      state.hasMore = false;
      state.searchTerm = "";
    },
    markThreadReadOptimistic: (state, action) => {
      const driverId = action.payload?.driverId ?? action.payload;
      if (!driverId) return;
      const thread = state.threads.find((item) => item.driverId === driverId || item.userid === driverId);
      if (thread) {
        thread.unreadCount = 0;
        thread.lastReadAt = Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatThreads.fulfilled, (state, action) => {
        state.threads = action.payload.threads;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.hasMore = action.payload.hasMore;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.lastSearch = action.payload.search;
        state.searchTerm = action.payload.search ?? "";
        state.type = action.payload.type;
        state.loading = false;
        state.loadingMore = false;
      })
      .addCase(fetchChatThreads.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
      })
      .addCase(fetchMoreChatThreads.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreChatThreads.fulfilled, (state, action) => {
        const threadMap = new Map();
        state.threads.forEach((thread) => {
          const key = thread?.driverId ?? thread?.userid;
          if (key) {
            threadMap.set(key, thread);
          }
        });
        action.payload.threads.forEach((thread) => {
          const key = thread?.driverId ?? thread?.userid;
          if (!key) return;
          const existing = threadMap.get(key);
          threadMap.set(key, existing ? { ...existing, ...thread } : thread);
        });

        state.threads = Array.from(threadMap.values());
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.hasMore = action.payload.hasMore;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.loadingMore = false;
        state.error = null;
      })
      .addCase(fetchMoreChatThreads.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

export const { clearThreads, markThreadReadOptimistic } = chatThreadsSlice.actions;
export default chatThreadsSlice.reducer;
