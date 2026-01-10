import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUsersRoute } from "../../utils/apiRoutes";

// Async thunk for fetching initial users
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async ({ page = 1, limit = 10, search = undefined } = {}, { rejectWithValue }) => {
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
  initialState: {
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
  },
  reducers: {
    clearUsers: (state) => {
      state.users = [];
      state.error = null;
      state.hasMore = false;
      state.page = 1;
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
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.lastSearch = action.payload.search;
        state.loading = false;
        state.error = null;
        state.lastFetched = Date.now();
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
      })
      // Load more users
      .addCase(fetchMoreUsers.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreUsers.fulfilled, (state, action) => {
        state.users = [...state.users, ...action.payload.users];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.totalDocuments = action.payload.totalDocuments;
        state.totalPages = action.payload.totalPages;
        state.loadingMore = false;
        state.error = null;
      })
      .addCase(fetchMoreUsers.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      });
  },
});

export const { clearUsers, updateUserLastMessage } = usersSlice.actions;
export default usersSlice.reducer;

