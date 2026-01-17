import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { fetchChatThreads as fetchChatThreadsRequest } from "../../services/adminAPI";

const mergeThreadsByDriverId = (existing, incoming) => {
  const map = new Map();
  existing.forEach((thread) => {
    if (thread?.driverId) {
      map.set(thread.driverId, thread);
    }
  });
  incoming.forEach((thread) => {
    if (thread?.driverId) {
      map.set(thread.driverId, thread);
    }
  });
  return Array.from(map.values());
};

export const fetchChatThreads = createAsyncThunk(
  "chatThreads/fetchChatThreads",
  async (
    { page = 1, limit = 10, search = undefined, type = "general" } = {},
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchChatThreadsRequest({
        page,
        limit,
        search,
        type,
      });

      const pagination = data.pagination || {};

      return {
        threads: data.threads || data.chatThreads || data.users || [],
        hasMore:
          pagination.hasMore !== undefined
            ? pagination.hasMore
            : false,
        page: pagination.page || page,
        limit: pagination.limit || limit,
        totalDocuments: pagination.totalDocuments || 0,
        totalPages: pagination.totalPages || 0,
        search,
        type,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch chat threads");
    }
  }
);

export const fetchMoreChatThreads = createAsyncThunk(
  "chatThreads/fetchMoreChatThreads",
  async (
    { page, limit = 10, search = undefined, type = "general" },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchChatThreadsRequest({
        page,
        limit,
        search,
        type,
      });

      const pagination = data.pagination || {};

      return {
        threads: data.threads || data.chatThreads || data.users || [],
        hasMore:
          pagination.hasMore !== undefined
            ? pagination.hasMore
            : false,
        page: pagination.page || page,
        limit: pagination.limit || limit,
        totalDocuments: pagination.totalDocuments || 0,
        totalPages: pagination.totalPages || 0,
        search,
        type,
      };
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
    hasMore: false,
    page: 1,
    limit: 10,
    totalDocuments: 0,
    totalPages: 0,
    searchTerm: undefined,
    type: "general",
  },
  reducers: {
    clearThreads: (state) => {
      state.threads = [];
      state.error = null;
      state.hasMore = false;
      state.page = 1;
    },
    markThreadReadOptimistic: (state, action) => {
      const { driverId, lastReadAt = Date.now() } = action.payload;
      const thread = state.threads.find((item) => item.driverId === driverId);
      if (thread) {
        thread.unreadCount = 0;
        thread.lastReadAt = lastReadAt;
      }
    },
    rollbackThreadRead: (state, action) => {
      const { driverId, unreadCount, lastReadAt } = action.payload;
      const thread = state.threads.find((item) => item.driverId === driverId);
      if (thread) {
        thread.unreadCount = unreadCount;
        thread.lastReadAt = lastReadAt;
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
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.searchTerm = action.payload.search;
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
        state.threads = mergeThreadsByDriverId(
          state.threads,
          action.payload.threads
        );
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.searchTerm = action.payload.search;
        state.type = action.payload.type;
        state.loadingMore = false;
        state.loading = false;
      })
      .addCase(fetchMoreChatThreads.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearThreads,
  markThreadReadOptimistic,
  rollbackThreadRead,
} = chatThreadsSlice.actions;
export default chatThreadsSlice.reducer;
