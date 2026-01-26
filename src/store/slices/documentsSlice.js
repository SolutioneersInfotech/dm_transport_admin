import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDocumentsRoute, fetchDocumentCountRoute, updateDocumentRoute, changeDocumentTypeRoute } from "../../utils/apiRoutes";
import { deleteDocument } from "../../services/documentDeleteAPI";

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

// Async thunk for updating document (toggle seen status or flag)
export const updateDocument = createAsyncThunk(
  "documents/updateDocument",
  async ({ document, seen, flag, state, completed, acknowledgement }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      
      // Build the request body
      const requestBody = { ...document };
      
      // Update seen status if provided
      if (seen !== undefined) {
        requestBody.seen = seen;
      }
      
      // Update flag if provided
      if (flag !== undefined) {
        requestBody.flag = flag;
      }
      
      // Update state if provided
      if (state !== undefined) {
        requestBody.state = state;
      }
      
      // Update completed status if provided
      if (completed !== undefined) {
        requestBody.completed = completed;
      }
      
      // Update acknowledgement if provided
      if (acknowledgement !== undefined) {
        requestBody.acknowledgement = acknowledgement;
      }
      
      const res = await fetch(updateDocumentRoute, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      console.log(data);

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to update document");
      }

      return {
        document: data.document || requestBody,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to update document");
    }
  }
);

// Async thunk for deleting document (soft delete)
export const deleteDocumentThunk = createAsyncThunk(
  "documents/deleteDocument",
  async ({ document }, { rejectWithValue }) => {
    try {
      const docType = document.type;
      const docId = document.id;

      if (!docType || !docId) {
        return rejectWithValue("Document type and ID are required");
      }

      const result = await deleteDocument(docType, docId);

      if (!result.success) {
        return rejectWithValue(result.error || "Failed to delete document");
      }

      return {
        documentId: docId,
        documentType: docType,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to delete document");
    }
  }
);

// Async thunk for changing document type
export const changeDocumentType = createAsyncThunk(
  "documents/changeDocumentType",
  async ({ documentId, oldType, newType }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      
      const res = await fetch(changeDocumentTypeRoute, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          document_id: documentId,
          old_type: oldType,
          new_type: newType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || "Failed to change document type");
      }

      return {
        documentId,
        newType,
        documentUrl: data.document_url || data.data?.document_url,
      };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to change document type");
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
      })
      // Update document
      .addCase(updateDocument.fulfilled, (state, action) => {
        const updatedDoc = action.payload.document;
        const docIndex = state.documents.findIndex(
          (doc) => doc.id === updatedDoc.id
        );
        if (docIndex >= 0) {
          state.documents[docIndex] = {
            ...state.documents[docIndex],
            ...updatedDoc,
            seen: updatedDoc.seen !== undefined ? updatedDoc.seen : state.documents[docIndex].seen,
            flag: updatedDoc.flag !== undefined ? updatedDoc.flag : state.documents[docIndex].flag,
            state: updatedDoc.state !== undefined ? updatedDoc.state : state.documents[docIndex].state,
            completed: updatedDoc.completed !== undefined ? updatedDoc.completed : state.documents[docIndex].completed,
            acknowledgement: updatedDoc.acknowledgement !== undefined ? updatedDoc.acknowledgement : state.documents[docIndex].acknowledgement,
          };
        }
      })
      .addCase(updateDocument.rejected, (state, action) => {
        // Error handling - log error but don't break the UI
        console.error("Failed to update document:", action.payload);
      })
      // Delete document
      .addCase(deleteDocumentThunk.pending, (state) => {
        // Optional: Set loading state if needed
      })
      .addCase(deleteDocumentThunk.fulfilled, (state, action) => {
        const { documentId } = action.payload;
        // Remove document from the list or mark as deleted
        state.documents = state.documents.filter((doc) => doc.id !== documentId);
        // Update total count if needed
        if (state.total > 0) {
          state.total -= 1;
        }
      })
      .addCase(deleteDocumentThunk.rejected, (state, action) => {
        // Error handling - log error but don't break the UI
        console.error("Failed to delete document:", action.payload);
      })
      // Change document type
      .addCase(changeDocumentType.pending, (state) => {
        // Optional: Set loading state if needed
      })
      .addCase(changeDocumentType.fulfilled, (state, action) => {
        const { documentId, newType, documentUrl } = action.payload;
        const docIndex = state.documents.findIndex((doc) => doc.id === documentId);
        if (docIndex >= 0) {
          state.documents[docIndex] = {
            ...state.documents[docIndex],
            type: newType,
            document_url: documentUrl || state.documents[docIndex].document_url,
          };
        }
      })
      .addCase(changeDocumentType.rejected, (state, action) => {
        // Error handling - log error but don't break the UI
        console.error("Failed to change document type:", action.payload);
      });
  },
});

export const { clearDocuments, markDocumentAsSeen, resetPagination } = documentsSlice.actions;
export default documentsSlice.reducer;

