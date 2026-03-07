import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { fetchDocumentsRoute, fetchDocumentCountRoute, updateDocumentRoute, changeDocumentTypeRoute } from "../../utils/apiRoutes";
import { deleteDocument, deleteDocuments } from "../../services/documentDeleteAPI";

const SYNC_SOURCE = {
  backendFetch: "backendFetch",
  polling: "polling",
  reconciliation: "reconciliation",
  firebaseOverlay: "firebaseOverlay",
  manualRefresh: "manualRefresh",
};

const isDeletedDocument = (document) => {
  const value = document?.isDeleted;
  return value === true || value === "true" || value === "yes" || value === 1 || value === "1";
};

const getDocumentSortTimestamp = (document) => {
  const candidates = [document?.date, document?.createdAt, document?.created_at, document?.timestamp, document?.updatedAt, document?.updated_at];

  for (const value of candidates) {
    if (!value) continue;
    if (value?.toDate instanceof Function) return value.toDate().getTime();
    if (typeof value?.seconds === "number") return value.seconds * 1000;

    const parsed = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
  }

  return 0;
};

const compareByLatest = (a, b) => {
  const byDate = getDocumentSortTimestamp(b) - getDocumentSortTimestamp(a);
  if (byDate !== 0) return byDate;
  return String(b?.id || "").localeCompare(String(a?.id || ""));
};

const sortDocumentsByLatest = (documents = []) => {
  documents.sort(compareByLatest);
};

const mergeUniqueDocuments = (currentDocuments = [], incomingDocuments = []) => {
  const deduped = new Map();
  currentDocuments.forEach((document) => {
    if (document?.id) deduped.set(document.id, document);
  });
  incomingDocuments.forEach((document) => {
    if (document?.id) deduped.set(document.id, document);
  });
  const nextDocuments = Array.from(deduped.values());
  sortDocumentsByLatest(nextDocuments);
  return nextDocuments;
};

const applyLiveOverlayToBackendPage = (backendDocuments = [], liveOverlayById = {}, page = 1, limit = 10) => {
  // Backend pagination remains authoritative; overlay only patches the first page so we avoid
  // rebuilding large arrays on each realtime event and keep table rendering responsive.
  if (page !== 1) return backendDocuments;

  const overlayValues = Object.values(liveOverlayById || {}).filter(Boolean);
  if (overlayValues.length === 0) return backendDocuments;

  const mergedTop = mergeUniqueDocuments(backendDocuments.slice(0, limit), overlayValues);
  return mergedTop.slice(0, limit);
};

export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async ({ startDate, endDate, page = 1, limit = 10, search = "", isSeen = null, isFlagged = null, category = null, filters = [] }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute(startDate, endDate, { page, limit, search, isSeen, isFlagged, category, filters });
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || "Failed to fetch documents");

      const documents = (data.documents || []).filter((document) => !isDeletedDocument(document));
      return {
        documents,
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

export const fetchMoreDocuments = createAsyncThunk(
  "documents/fetchMoreDocuments",
  async ({ startDate, endDate, page, limit = 10, search = "", isSeen = null, isFlagged = null, category = null, filters = [] }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute(startDate, endDate, { page, limit, search, isSeen, isFlagged, category, filters });
      const res = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || "Failed to fetch more documents");

      const documents = (data.documents || []).filter((document) => !isDeletedDocument(document));
      return {
        documents,
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

export const fetchDocumentCount = createAsyncThunk("documents/fetchDocumentCount", async ({ start_date, end_date, isSeen = null, isFlagged = null }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("adminToken");
    const url = fetchDocumentCountRoute(start_date, end_date, { isSeen, isFlagged });
    const res = await fetch(url, {
      method: "GET",
      cache: "force-cache",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message || "Failed to fetch document counts");

    return { counts: data.counts || {}, total: data.total || 0, filters: data.filters || {} };
  } catch (error) {
    return rejectWithValue(error.message || "Failed to fetch document counts");
  }
});

export const updateDocument = createAsyncThunk("documents/updateDocument", async ({ document, seen, flag, state, completed, acknowledgement }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("adminToken");
    const requestBody = { ...document };
    delete requestBody.flag;
    delete requestBody.flagged;
    delete requestBody.flagged_reason;
    if (seen !== undefined) requestBody.seen = seen;
    if (flag !== undefined) {
      requestBody.flagged = flag.flagged;
      requestBody.flagged_reason = flag.reason ?? "";
    }
    if (state !== undefined) requestBody.state = state;
    if (completed !== undefined) requestBody.completed = completed;
    if (acknowledgement !== undefined) requestBody.acknowledgement = acknowledgement;

    const res = await fetch(updateDocumentRoute, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message || "Failed to update document");

    const responseDocument = data.document || requestBody;
    const normalizedFlag =
      flag !== undefined
        ? flag
        : responseDocument.flag !== undefined
          ? responseDocument.flag
          : responseDocument.flagged !== undefined || responseDocument.flagged_reason !== undefined
            ? { flagged: responseDocument.flagged ?? false, reason: responseDocument.flagged_reason ?? "" }
            : undefined;

    return { document: { ...responseDocument, ...(normalizedFlag !== undefined ? { flag: normalizedFlag } : {}) } };
  } catch (error) {
    return rejectWithValue(error.message || "Failed to update document");
  }
});

export const deleteDocumentThunk = createAsyncThunk("documents/deleteDocument", async ({ document }, { rejectWithValue }) => {
  try {
    const docType = document.type;
    const docId = document.id;
    if (!docType || !docId) return rejectWithValue("Document type and ID are required");

    const result = await deleteDocument(document);
    if (!result.success) return rejectWithValue(result.error || "Failed to delete document");
    return { documentId: docId, documentType: docType };
  } catch (error) {
    return rejectWithValue(error.message || "Failed to delete document");
  }
});

export const deleteDocumentsThunk = createAsyncThunk("documents/deleteDocuments", async ({ documents }, { rejectWithValue }) => {
  try {
    if (!Array.isArray(documents) || documents.length === 0) return rejectWithValue("Documents are required");
    const result = await deleteDocuments(documents);
    if (!result.success) return rejectWithValue(result.error || "Failed to delete documents");
    return { documentIds: documents.map((doc) => doc.id) };
  } catch (error) {
    return rejectWithValue(error.message || "Failed to delete documents");
  }
});

export const changeDocumentType = createAsyncThunk("documents/changeDocumentType", async ({ documentId, oldType, newType }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(changeDocumentTypeRoute, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ document_id: documentId, old_type: oldType, new_type: newType }),
    });

    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message || "Failed to change document type");
    return { documentId, newType, documentUrl: data.document_url || data.data?.document_url };
  } catch (error) {
    return rejectWithValue(error.message || "Failed to change document type");
  }
});

const initialState = {
  documents: [],
  backendDocuments: [],
  liveOverlayById: {},
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
  documentCounts: {},
  countsLoading: false,
  countsError: null,
  countsTotal: 0,
  lastCountsFetched: null,
  documentSyncInFlightCount: 0,
  documentSyncInFlightSources: {},
};

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    clearDocuments: (state) => {
      state.documents = [];
      state.backendDocuments = [];
      state.liveOverlayById = {};
      state.error = null;
      state.hasMore = false;
      state.page = 1;
    },
    markDocumentAsSeen: (state, action) => {
      const document = state.documents.find((doc) => doc.id === action.payload);
      if (document) document.seen = true;
    },
    resetPagination: (state) => {
      state.page = 1;
      state.hasMore = false;
    },
    upsertLiveDocument: (state, action) => {
      const nextDocument = action.payload;
      if (!nextDocument?.id || isDeletedDocument(nextDocument)) return;

      state.liveOverlayById[nextDocument.id] = nextDocument;

      if (state.page !== 1) return;

      const existingIndex = state.documents.findIndex((document) => document.id === nextDocument.id);
      if (existingIndex >= 0) {
        state.documents[existingIndex] = { ...state.documents[existingIndex], ...nextDocument };
      } else {
        state.documents.unshift(nextDocument);
      }

      const scanWindow = Math.min(state.documents.length, Math.max(state.limit, 30));
      const sortedSlice = state.documents.slice(0, scanWindow);
      sortDocumentsByLatest(sortedSlice);
      state.documents.splice(0, scanWindow, ...sortedSlice);
    },
    removeLiveDocument: (state, action) => {
      const documentId = action.payload;
      if (!documentId) return;

      delete state.liveOverlayById[documentId];
      if (state.page !== 1) return;

      const existingIndex = state.documents.findIndex((document) => document.id === documentId);
      if (existingIndex >= 0) state.documents.splice(existingIndex, 1);
    },
    clearLiveDocumentOverlay: (state) => {
      state.liveOverlayById = {};
      state.documents = applyLiveOverlayToBackendPage(state.backendDocuments, state.liveOverlayById, state.page, state.limit);
    },
    mergeBackendDocumentsWithLiveOverlay: (state) => {
      state.documents = applyLiveOverlayToBackendPage(state.backendDocuments, state.liveOverlayById, state.page, state.limit);
    },
    trimVisibleDocumentsToPageSize: (state, action) => {
      const pageSize = action.payload ?? state.limit;
      if (state.page !== 1) return;
      if (state.documents.length > pageSize) {
        state.documents = state.documents.slice(0, pageSize);
      }
    },
    beginDocumentSync: (state, action) => {
      const source = action.payload || "unknown";
      state.documentSyncInFlightCount += 1;
      state.documentSyncInFlightSources[source] = (state.documentSyncInFlightSources[source] || 0) + 1;
    },
    endDocumentSync: (state, action) => {
      const source = action.payload || "unknown";
      state.documentSyncInFlightCount = Math.max(0, state.documentSyncInFlightCount - 1);
      const previous = state.documentSyncInFlightSources[source] || 0;
      if (previous <= 1) {
        delete state.documentSyncInFlightSources[source];
      } else {
        state.documentSyncInFlightSources[source] = previous - 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state, action) => {
        state.loading = true;
        state.loadingMore = false;
        state.error = null;
        state.lastFetchParams = action.meta.arg;
        state.documentSyncInFlightCount += 1;
        state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] = (state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] || 0) + 1;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.backendDocuments = mergeUniqueDocuments([], action.payload.documents);
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
        state.lastFetched = Date.now();
        state.totalDocuments = action.payload.total;
        state.documents = applyLiveOverlayToBackendPage(state.backendDocuments, state.liveOverlayById, state.page, state.limit);
        state.documentSyncInFlightCount = Math.max(0, state.documentSyncInFlightCount - 1);
        const prev = state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] || 0;
        if (prev <= 1) delete state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch];
        else state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] = prev - 1;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
        state.documentSyncInFlightCount = Math.max(0, state.documentSyncInFlightCount - 1);
        const prev = state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] || 0;
        if (prev <= 1) delete state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch];
        else state.documentSyncInFlightSources[SYNC_SOURCE.backendFetch] = prev - 1;
      })
      .addCase(fetchMoreDocuments.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreDocuments.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.backendDocuments = mergeUniqueDocuments(state.backendDocuments, action.payload.documents);
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
        state.documents = applyLiveOverlayToBackendPage(state.backendDocuments, state.liveOverlayById, state.page, state.limit);
      })
      .addCase(fetchMoreDocuments.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      })
      .addCase(fetchDocumentCount.pending, (state) => {
        state.countsLoading = true;
        state.countsError = null;
      })
      .addCase(fetchDocumentCount.fulfilled, (state, action) => {
        state.countsLoading = false;
        state.documentCounts = action.payload.counts;
        state.countsTotal = action.payload.total;
        state.total = action.payload.total;
        state.totalDocuments = action.payload.total;
        state.countsError = null;
        state.lastCountsFetched = Date.now();
      })
      .addCase(fetchDocumentCount.rejected, (state, action) => {
        state.countsLoading = false;
        state.countsError = action.payload;
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        const updatedDoc = action.payload.document;
        const updateInCollection = (collection) => {
          const idx = collection.findIndex((doc) => doc.id === updatedDoc.id);
          if (idx >= 0) {
            collection[idx] = {
              ...collection[idx],
              ...updatedDoc,
              seen: updatedDoc.seen !== undefined ? updatedDoc.seen : collection[idx].seen,
              flag: updatedDoc.flag !== undefined ? updatedDoc.flag : collection[idx].flag,
              state: updatedDoc.state !== undefined ? updatedDoc.state : collection[idx].state,
              completed: updatedDoc.completed !== undefined ? updatedDoc.completed : collection[idx].completed,
              acknowledgement: updatedDoc.acknowledgement !== undefined ? updatedDoc.acknowledgement : collection[idx].acknowledgement,
            };
          }
        };
        updateInCollection(state.backendDocuments);
        updateInCollection(state.documents);
      })
      .addCase(updateDocument.rejected, (state, action) => {
        console.error("Failed to update document:", action.payload);
      })
      .addCase(deleteDocumentThunk.fulfilled, (state, action) => {
        const { documentId } = action.payload;
        state.backendDocuments = state.backendDocuments.filter((doc) => doc.id !== documentId);
        state.documents = state.documents.filter((doc) => doc.id !== documentId);
        delete state.liveOverlayById[documentId];
        if (state.total > 0) state.total -= 1;
      })
      .addCase(deleteDocumentThunk.rejected, (state, action) => {
        console.error("Failed to delete document:", action.payload);
      })
      .addCase(deleteDocumentsThunk.fulfilled, (state, action) => {
        const { documentIds } = action.payload;
        if (Array.isArray(documentIds) && documentIds.length > 0) {
          state.backendDocuments = state.backendDocuments.filter((doc) => !documentIds.includes(doc.id));
          state.documents = state.documents.filter((doc) => !documentIds.includes(doc.id));
          documentIds.forEach((id) => delete state.liveOverlayById[id]);
          if (state.total > 0) state.total = Math.max(state.total - documentIds.length, 0);
        }
      })
      .addCase(deleteDocumentsThunk.rejected, (state, action) => {
        console.error("Failed to delete documents:", action.payload);
      })
      .addCase(changeDocumentType.fulfilled, (state, action) => {
        const { documentId, newType, documentUrl } = action.payload;
        const updateInCollection = (collection) => {
          const docIndex = collection.findIndex((doc) => doc.id === documentId);
          if (docIndex >= 0) {
            collection[docIndex] = {
              ...collection[docIndex],
              type: newType,
              document_url: documentUrl || collection[docIndex].document_url,
            };
          }
        };
        updateInCollection(state.backendDocuments);
        updateInCollection(state.documents);
      })
      .addCase(changeDocumentType.rejected, (state, action) => {
        console.error("Failed to change document type:", action.payload);
      });
  },
});

export const {
  clearDocuments,
  markDocumentAsSeen,
  resetPagination,
  upsertLiveDocument,
  removeLiveDocument,
  clearLiveDocumentOverlay,
  mergeBackendDocumentsWithLiveOverlay,
  trimVisibleDocumentsToPageSize,
  beginDocumentSync,
  endDocumentSync,
} = documentsSlice.actions;

export const selectIsDocumentSyncActive = createSelector(
  [(state) => state.documents.documentSyncInFlightCount],
  (count) => count > 0
);

export default documentsSlice.reducer;
