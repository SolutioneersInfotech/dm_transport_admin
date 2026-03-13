import { createSlice, createAsyncThunk, createSelector } from "@reduxjs/toolkit";
import { fetchDocumentsRoute, fetchDocumentCountRoute, updateDocumentRoute, changeDocumentTypeRoute } from "../../utils/apiRoutes";
import { deleteDocument, deleteDocuments } from "../../services/documentDeleteAPI";
import { fetchDocumentsHeadAPI } from "../../services/documentHeadAPI";
import { buildDocumentCacheKey, getCachedDocumentRequest, setCachedDocumentRequest } from "../../services/documentRequestCache";
import { buildCountCacheKey, getCachedDocumentCount, setCachedDocumentCount } from "../../utils/documentCountCache";

const SYNC_SOURCE = {
  backendFetch: "backendFetch",
  headFetch: "headFetch",
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

const hasDocumentChanged = (existing = {}, incoming = {}) => {
  const incomingKeys = Object.keys(incoming);
  for (const key of incomingKeys) {
    if (existing[key] !== incoming[key]) return true;
  }

  return false;
};

const overlayMapFromDocuments = (previousOverlay = {}, incomingDocuments = []) => {
  const nextOverlay = {};

  incomingDocuments.forEach((document) => {
    if (!document?.id || isDeletedDocument(document)) return;

    const previous = previousOverlay[document.id];
    nextOverlay[document.id] = previous && !hasDocumentChanged(previous, document) ? previous : document;
  });

  return nextOverlay;
};

const applyDocumentToOverlay = (overlayById = {}, nextDocument) => {
  if (!nextDocument?.id || isDeletedDocument(nextDocument)) return overlayById;

  const previous = overlayById[nextDocument.id];
  if (previous && !hasDocumentChanged(previous, nextDocument)) {
    return overlayById;
  }

  return {
    ...overlayById,
    [nextDocument.id]: previous ? { ...previous, ...nextDocument } : nextDocument,
  };
};

const removeDocumentFromOverlay = (overlayById = {}, documentId) => {
  if (!documentId || !overlayById[documentId]) return overlayById;

  const next = { ...overlayById };
  delete next[documentId];
  return next;
};

const mergeVisiblePageOne = ({ backendDocuments = [], headOverlayById = {}, liveOverlayById = {}, limit = 10 }) => {
  const merged = new Map();

  const addDocuments = (documents) => {
    documents.forEach((document) => {
      if (!document?.id || isDeletedDocument(document)) return;
      const existing = merged.get(document.id);
      merged.set(document.id, existing ? { ...existing, ...document } : document);
    });
  };

  // Backend stays authoritative for pagination; page-1 freshness layers on top via head + live overlays.
  addDocuments(backendDocuments.slice(0, limit));
  addDocuments(Object.values(headOverlayById));
  addDocuments(Object.values(liveOverlayById));

  const nextVisible = Array.from(merged.values());
  sortDocumentsByLatest(nextVisible);
  return nextVisible.slice(0, limit);
};

const getVisibleDocuments = (state) => {
  if (state.page !== 1) return state.backendDocuments;
  return mergeVisiblePageOne(state);
};

const patchOverlayDocument = (overlayById = {}, documentId, changes = {}) => {
  if (!documentId || !overlayById[documentId]) return overlayById;

  return {
    ...overlayById,
    [documentId]: {
      ...overlayById[documentId],
      ...changes,
    },
  };
};

const patchCollectionDocument = (collection = [], documentId, changes = {}) => {
  const index = collection.findIndex((doc) => doc.id === documentId);
  if (index < 0) return;

  collection[index] = {
    ...collection[index],
    ...changes,
  };
};

const LIST_CACHE_TTL_MS = 8 * 1000;
const createDocumentsCacheKey = ({ startDateTimeUtc, endDateTimeUtc, page = 1, limit = 10, search = "", isSeen = null, isFlagged = null, category = null, filters = [] }) =>
  buildDocumentCacheKey("documentsList", { startDateTimeUtc, endDateTimeUtc, page, limit, search, isSeen, isFlagged, category, filters });

const beginSyncSource = (state, source) => {
  state.documentSyncInFlightCount += 1;
  state.documentSyncInFlightSources[source] = (state.documentSyncInFlightSources[source] || 0) + 1;
};

const endSyncSource = (state, source) => {
  state.documentSyncInFlightCount = Math.max(0, state.documentSyncInFlightCount - 1);
  const previous = state.documentSyncInFlightSources[source] || 0;
  if (previous <= 1) {
    delete state.documentSyncInFlightSources[source];
  } else {
    state.documentSyncInFlightSources[source] = previous - 1;
  }
};

export const fetchDocuments = createAsyncThunk(
  "documents/fetchDocuments",
  async ({ startDateTimeUtc, endDateTimeUtc, page = 1, limit = 10, search = "", isSeen = null, isFlagged = null, category = null, filters = [], bypassCache = false, requestSignature = "" }, { rejectWithValue }) => {
    try {
      const cacheKey = createDocumentsCacheKey({ startDateTimeUtc, endDateTimeUtc, page, limit, search, isSeen, isFlagged, category, filters });
      if (!bypassCache) {
        const cached = getCachedDocumentRequest(cacheKey, LIST_CACHE_TTL_MS);
        if (cached) {
          return { ...cached, fromCache: true, requestSignature };
        }
      }

      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute({ startDateTimeUtc, endDateTimeUtc }, { page, limit, search, isSeen, isFlagged, category, filters });
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || "Failed to fetch documents");

      const payload = {
        documents: (data.documents || []).filter((document) => !isDeletedDocument(document)),
        hasMore: data.hasMore !== undefined ? data.hasMore : (data.documents?.length || 0) >= limit,
        page: data.page || page,
        limit: data.limit || limit,
        total: data.pagination?.totalDocuments || 0,
      };

      setCachedDocumentRequest(cacheKey, payload);
      return { ...payload, requestSignature };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch documents");
    }
  }
);

export const fetchMoreDocuments = createAsyncThunk(
  "documents/fetchMoreDocuments",
  async ({ startDateTimeUtc, endDateTimeUtc, page, limit = 10, search = "", isSeen = null, isFlagged = null, category = null, filters = [], bypassCache = false }, { rejectWithValue }) => {
    try {
      const cacheKey = createDocumentsCacheKey({ startDateTimeUtc, endDateTimeUtc, page, limit, search, isSeen, isFlagged, category, filters });
      if (!bypassCache) {
        const cached = getCachedDocumentRequest(cacheKey, LIST_CACHE_TTL_MS);
        if (cached) {
          return { ...cached, fromCache: true };
        }
      }

      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute({ startDateTimeUtc, endDateTimeUtc }, { page, limit, search, isSeen, isFlagged, category, filters });
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) return rejectWithValue(data.message || "Failed to fetch more documents");

      const payload = {
        documents: (data.documents || []).filter((document) => !isDeletedDocument(document)),
        hasMore: data.hasMore !== undefined ? data.hasMore : (data.documents?.length || 0) >= limit,
        page: data.page || page,
        limit: data.limit || limit,
        total: data.pagination?.totalDocuments || 0,
      };

      setCachedDocumentRequest(cacheKey, payload);
      return payload;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch more documents");
    }
  }
);

export const fetchDocumentsHead = createAsyncThunk(
  "documents/fetchDocumentsHead",
  async ({ startDateTimeUtc, endDateTimeUtc, search = "", isSeen = null, isFlagged = null, category = null, filters = [], limit = 100, bypassCache = false }, { rejectWithValue }) => {
    try {
      const data = await fetchDocumentsHeadAPI({ startDateTimeUtc, endDateTimeUtc, search, isSeen, isFlagged, category, filters, limit, bypassCache });
      const documents = (data.documents || data.head || []).filter((document) => !isDeletedDocument(document));
      return { documents, limit };
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch documents head");
    }
  }
);

export const fetchDocumentCount = createAsyncThunk("documents/fetchDocumentCount", async ({ startDateTimeUtc, endDateTimeUtc, search = "", isSeen = null, isFlagged = null, category = null, filters = [], bypassCache = false, requestSignature = "" }, { rejectWithValue }) => {
  try {
    // count cache/request signatures must include flag filter, otherwise flagged totals reuse unfiltered counts
    const cacheKey = buildCountCacheKey({
      types: filters,
      isFlagged,
      startDateTimeUtc,
      endDateTimeUtc,
      category,
      search,
      isSeen,
    });

    if (!bypassCache) {
      // Counts are expensive and usually unchanged between polls, so reuse filter-scoped cached totals for up to 360 seconds.
      const cached = getCachedDocumentCount(cacheKey);
      if (cached !== null) {
        return { ...cached, requestSignature };
      }
    }

    const token = localStorage.getItem("adminToken");
    const url = fetchDocumentCountRoute({ startDateTimeUtc, endDateTimeUtc }, { search, isSeen, isFlagged, category, filters });
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return rejectWithValue(data.message || "Failed to fetch document counts");

    const payload = { counts: data.counts || {}, total: data.total || 0, filters: data.filters || {} };
    setCachedDocumentCount(cacheKey, payload);
    return { ...payload, requestSignature };
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
  headOverlayById: {},
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
  lastCountRequestSignature: "",
  lastListRequestSignature: "",
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
      state.headOverlayById = {};
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
    preparePageOneFilterTransition: (state) => {
      // Page-1 server-side filter changes must drop stale backend base so fast head rows are not crowded out by old query results.
      state.backendDocuments = [];
      state.documents = [];
      state.headOverlayById = {};
      state.liveOverlayById = {};
      state.page = 1;
      state.hasMore = false;
    },
    preparePageOneTypeFilterTransition: (state) => {
      // Type-filter transitions intentionally keep current visible rows until fresh data arrives.
      state.page = 1;
      state.hasMore = false;
    },
    setHeadDocuments: (state, action) => {
      state.headOverlayById = overlayMapFromDocuments(state.headOverlayById, action.payload || []);
      state.documents = getVisibleDocuments(state);
    },
    upsertLiveDocument: (state, action) => {
      state.liveOverlayById = applyDocumentToOverlay(state.liveOverlayById, action.payload);
      state.documents = getVisibleDocuments(state);
    },
    removeLiveDocument: (state, action) => {
      state.liveOverlayById = removeDocumentFromOverlay(state.liveOverlayById, action.payload);
      state.documents = getVisibleDocuments(state);
    },
    clearLiveDocumentOverlay: (state) => {
      state.liveOverlayById = {};
      state.headOverlayById = {};
      state.documents = getVisibleDocuments(state);
    },
    mergeBackendDocumentsWithLiveOverlay: (state) => {
      state.documents = getVisibleDocuments(state);
    },
    trimVisibleDocumentsToPageSize: (state, action) => {
      const pageSize = action.payload ?? state.limit;
      if (state.page !== 1) return;
      if (state.documents.length > pageSize) {
        state.documents = state.documents.slice(0, pageSize);
      }
    },
    beginDocumentSync: (state, action) => {
      beginSyncSource(state, action.payload || "unknown");
    },
    endDocumentSync: (state, action) => {
      endSyncSource(state, action.payload || "unknown");
    },
    optimisticUpdateDocumentRow: (state, action) => {
      const { documentId, changes } = action.payload || {};
      if (!documentId || !changes) return;

      patchCollectionDocument(state.backendDocuments, documentId, changes);
      patchCollectionDocument(state.documents, documentId, changes);
      state.headOverlayById = patchOverlayDocument(state.headOverlayById, documentId, changes);
      state.liveOverlayById = patchOverlayDocument(state.liveOverlayById, documentId, changes);
      state.documents = getVisibleDocuments(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state, action) => {
        state.loading = true;
        state.loadingMore = false;
        state.error = null;
        state.lastFetchParams = action.meta.arg;
        state.lastListRequestSignature = action.meta.arg?.requestSignature || "";
        beginSyncSource(state, SYNC_SOURCE.backendFetch);
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        // Ignore stale deferred reconciliations so older filter signatures cannot overwrite newer page-1 state.
        const responseSignature = action.payload.requestSignature || "";
        if (responseSignature && state.lastListRequestSignature && responseSignature !== state.lastListRequestSignature) {
          endSyncSource(state, SYNC_SOURCE.backendFetch);
          return;
        }

        state.loading = false;
        state.backendDocuments = action.payload.documents;
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
        state.lastFetched = Date.now();
        state.totalDocuments = action.payload.total;
        state.documents = getVisibleDocuments(state);
        endSyncSource(state, SYNC_SOURCE.backendFetch);
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        const requestSignature = action.meta.arg?.requestSignature || "";
        if (requestSignature && state.lastListRequestSignature && requestSignature !== state.lastListRequestSignature) {
          endSyncSource(state, SYNC_SOURCE.backendFetch);
          return;
        }

        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload;
        endSyncSource(state, SYNC_SOURCE.backendFetch);
      })
      .addCase(fetchMoreDocuments.pending, (state) => {
        state.loadingMore = true;
        state.error = null;
      })
      .addCase(fetchMoreDocuments.fulfilled, (state, action) => {
        state.loadingMore = false;
        state.backendDocuments = [...state.backendDocuments, ...action.payload.documents];
        state.hasMore = action.payload.hasMore;
        state.page = action.payload.page;
        state.limit = action.payload.limit;
        state.total = action.payload.total;
        state.error = null;
        state.documents = getVisibleDocuments(state);
      })
      .addCase(fetchMoreDocuments.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload;
      })
      .addCase(fetchDocumentsHead.pending, (state) => {
        beginSyncSource(state, SYNC_SOURCE.headFetch);
      })
      .addCase(fetchDocumentsHead.fulfilled, (state, action) => {
        state.headOverlayById = overlayMapFromDocuments(state.headOverlayById, action.payload.documents);
        state.documents = getVisibleDocuments(state);
        endSyncSource(state, SYNC_SOURCE.headFetch);
      })
      .addCase(fetchDocumentsHead.rejected, (state) => {
        endSyncSource(state, SYNC_SOURCE.headFetch);
      })
      .addCase(fetchDocumentCount.pending, (state, action) => {
        state.countsLoading = true;
        state.countsError = null;
        state.lastCountRequestSignature = action.meta.arg?.requestSignature || "";
      })
      .addCase(fetchDocumentCount.fulfilled, (state, action) => {
        // Ignore stale count responses so rapid filter changes (including type filters) cannot overwrite newer totals.
        const responseSignature = action.payload.requestSignature || "";
        if (responseSignature && state.lastCountRequestSignature && responseSignature !== state.lastCountRequestSignature) {
          return;
        }

        state.countsLoading = false;
        state.documentCounts = action.payload.counts;
        state.countsTotal = action.payload.total;
        state.total = action.payload.total;
        state.totalDocuments = action.payload.total;
        state.countsError = null;
        state.lastCountsFetched = Date.now();
      })
      .addCase(fetchDocumentCount.rejected, (state, action) => {
        const requestSignature = action.meta.arg?.requestSignature || "";
        if (requestSignature && state.lastCountRequestSignature && requestSignature !== state.lastCountRequestSignature) {
          return;
        }

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
        state.liveOverlayById = removeDocumentFromOverlay(state.liveOverlayById, documentId);
        state.headOverlayById = removeDocumentFromOverlay(state.headOverlayById, documentId);
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
          documentIds.forEach((id) => {
            state.liveOverlayById = removeDocumentFromOverlay(state.liveOverlayById, id);
            state.headOverlayById = removeDocumentFromOverlay(state.headOverlayById, id);
          });
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
  preparePageOneFilterTransition,
  preparePageOneTypeFilterTransition,
  setHeadDocuments,
  upsertLiveDocument,
  removeLiveDocument,
  clearLiveDocumentOverlay,
  mergeBackendDocumentsWithLiveOverlay,
  trimVisibleDocumentsToPageSize,
  beginDocumentSync,
  endDocumentSync,
  optimisticUpdateDocumentRow,
} = documentsSlice.actions;

export const selectIsDocumentSyncActive = createSelector([(state) => state.documents.documentSyncInFlightCount], (count) => count > 0);

export default documentsSlice.reducer;
