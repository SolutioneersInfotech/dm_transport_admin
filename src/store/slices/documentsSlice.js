import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDocumentsRoute, fetchDocumentCountRoute } from "../../utils/apiRoutes";

// Async thunk for fetching initial documents
export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async (
    {
      startDate,
      endDate,
      page = 1,
      limit = 10,
      search = "",
      isSeen = null,
      isFlagged = null,
      category = null,
      filters = [],
    },
    { rejectWithValue }
  ) => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute(startDate, endDate, {
        page,
        limit,
        search,
        isSeen,
        isFlagged,
        category,
        filters,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch documents");
      }

      return {
        documents: data.documents || [],
        hasMore: data.hasMore !== undefined ? data.hasMore : (data.documents?.length || 0) >= limit,
        page: data.page || page,
        limit: data.limit || limit,
        total: data.pagination.totalDocuments || 0,

      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch documents");
    }
  }
);

// Async thunk for loading more documents (pagination)
export const fetchMoreDocuments = createAsyncThunk(
  "documents/fetchMoreDocuments",
  async (
    {
      startDate,
      endDate,
      page,
      limit = 10,
      search = "",
      isSeen = null,
      isFlagged = null,
      category = null,
      filters = [],
    },
    { rejectWithValue }
  ) => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute(startDate, endDate, {
        page,
        limit,
        search,
        isSeen,
        isFlagged,
        category,
        filters,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch more documents");
      }
      
      return {
        documents: data.documents || [],
        hasMore: data.hasMore !== undefined ? data.hasMore : (data.documents?.length || 0) >= limit,
        page: data.page || page,
        limit: data.limit || limit,
       
        total: data.pagination.totalDocuments || 0,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more documents");
    }
  }
);
export const fetchDocumentCount = createAsyncThunk(
  "documents/fetchDocumentCount",
  async (
    {
      start_date,
      end_date,
      isSeen = null,
      isFlagged = null,
    },
    { rejectWithValue }
  ) => {
    try {
      const token = localStorage.getItem("adminToken");

      const url = fetchDocumentCountRoute(start_date, end_date, {
        isSeen,
        isFlagged,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to fetch document counts");
      }

      return {
        counts: data.counts || {},
        total: data.total || 0,
        filters: data.filters || {},
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch document counts");
    }
  }
);


const documentsSlice = createSlice({
  name: "documents",
  initialState: {
    documents: [],
    loading: false,
    loadingMore: false,
    error: null,
    lastFetchParams: null,
    lastFetched: null,
    hasMore: false,
    page: 1,
    limit: 10,
    total: 0,
    totalDocuments: 0,
    // Document counts state
    documentCounts: {},
    countsLoading: false,
    countsError: null,
    countsTotal: 0,
    lastCountsFetched: null,
  },
  reducers: {
    clearDocuments: (state) => {
      state.documents = [];
      state.error = null;
      state.hasMore = false;
      state.page = 1;
    },
    markDocumentAsSeen: (state, action) => {
      const document = state.documents.find(
        (doc) => doc.id === action.payload
      );
      if (document) {
        document.seen = true;
      }
    },
    resetPagination: (state) => {
      state.page = 1;
      state.hasMore = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initial fetch
      .addCase(fetchDocuments.pending, (state, action) => {
        state.loading = true;
        state.loadingMore = false;
        state.error = null;
        state.lastFetchParams = action.meta.arg;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.documents;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
        state.lastFetched = Date.now();
        state.totalDocuments = action.payload.totalDocuments;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
      })
      // Load more
      .addCase(fetchMoreDocuments.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreDocuments.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.documents = [...state.documents, ...action.payload.documents];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
      })
      .addCase(fetchMoreDocuments.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      })
      // Document counts
      .addCase(fetchDocumentCount.pending, (state) => {
        state.countsLoading = true;
        state.countsError = null;
      })
      .addCase(fetchDocumentCount.fulfilled, (state, action) => {
        state.countsLoading = false;
        state.documentCounts = action.payload.counts;
        state.countsTotal = action.payload.total;
        state.countsError = null;
        state.lastCountsFetched = Date.now();
      })
      .addCase(fetchDocumentCount.rejected, (state, action) => {
        state.countsLoading = false;
        state.countsError = action.payload;
      });
  },
});

export const { clearDocuments, markDocumentAsSeen, resetPagination } = documentsSlice.actions;
export default documentsSlice.reducer;

