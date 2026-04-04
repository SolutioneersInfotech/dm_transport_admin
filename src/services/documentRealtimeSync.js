import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { firestore } from "../firebase/firebaseApp";

const DOCUMENTS_COLLECTION = "documents";
const REALTIME_LIMIT = 0;

const isTruthyDeleteFlag = (value) => value === true || value === "true" || value === "yes" || value === 1 || value === "1";

const normalizeDateValue = (value) => {
  if (!value) return null;

  if (value?.toDate instanceof Function) {
    return value.toDate();
  }

  if (typeof value?.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  const next = value instanceof Date ? value : new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
};

const getDocumentDate = (document) => {
  return (
    normalizeDateValue(document?.date) ||
    normalizeDateValue(document?.createdAt) ||
    normalizeDateValue(document?.created_at) ||
    normalizeDateValue(document?.timestamp) ||
    normalizeDateValue(document?.updatedAt) ||
    normalizeDateValue(document?.updated_at)
  );
};

const normalizeDocument = (snapshotDoc) => {
  const data = snapshotDoc.data() || {};
  return {
    id: data.id || data.document_id || snapshotDoc.id,
    ...data,
  };
};

const matchesSearch = (document, search) => {
  if (!search) return true;
  const normalizedSearch = String(search).trim().toLowerCase();
  if (!normalizedSearch) return true;

  const searchableValues = [
    document?.driver_name,
    document?.driverName,
    document?.driver_email,
    document?.email,
    document?.id,
    document?.type,
    document?.category,
  ];

  return searchableValues.some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(normalizedSearch)
  );
};

const matchesFlag = (document, isFlagged) => {
  if (isFlagged === null || isFlagged === undefined) return true;
  const flagged = document?.flag?.flagged ?? document?.flagged ?? document?.isFlagged ?? false;
  return Boolean(flagged) === Boolean(isFlagged);
};

const matchesCategory = (document, categories) => {
  if (!Array.isArray(categories) || categories.length === 0) return true;
  return categories.includes(document?.category);
};

const matchesType = (document, types) => {
  if (!Array.isArray(types) || types.length === 0) return true;
  return types.includes(document?.type);
};

const matchesSeen = (document, isSeen) => {
  if (isSeen === null || isSeen === undefined) return true;
  return Boolean(document?.seen) === Boolean(isSeen);
};

const matchesDateRange = (document, startDateTimeUtc, endDateTimeUtc) => {
  const docDate = getDocumentDate(document);
  if (!docDate) return false;

  if (startDateTimeUtc) {
    const start = normalizeDateValue(startDateTimeUtc);
    if (start && docDate < start) return false;
  }

  if (endDateTimeUtc) {
    const end = normalizeDateValue(endDateTimeUtc);
    if (end && docDate > end) return false;
  }

  return true;
};

export const documentMatchesRealtimeFilters = (document, filters = {}) => {
  if (!document || isTruthyDeleteFlag(document?.isDeleted)) return false;

  return (
    matchesType(document, filters.types) &&
    matchesType(document, filters.allowedTypes) &&
    matchesSearch(document, filters.search) &&
    matchesSeen(document, filters.isSeen) &&
    matchesFlag(document, filters.isFlagged) &&
    matchesCategory(document, filters.category) &&
    // Realtime filter window must match list/head/count UTC-boundary params exactly.
    matchesDateRange(document, filters.startDateTimeUtc, filters.endDateTimeUtc)
  );
};

/**
 * Keeps a long-lived Firestore listener active so document updates can be merged into Redux
 * while the tab is backgrounded. This mirrors old admin behavior where the list stayed warm.
 */
export const subscribeToDocumentRealtimeSync = ({ filters, onDocumentChange, onError, onReady }) => {
  const docsQuery = query(collection(firestore, DOCUMENTS_COLLECTION), limit(REALTIME_LIMIT));

  let isFirstSnapshot = true;

  return onSnapshot(
    docsQuery,
    (snapshot) => {
      if (isFirstSnapshot) {
        isFirstSnapshot = false;
        onReady?.();
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const document = normalizeDocument(change.doc);
        const matches = documentMatchesRealtimeFilters(document, filters);

        if (change.type === "removed" || !matches) {
          onDocumentChange?.({ type: "removed", documentId: document.id, document });
          return;
        }

        onDocumentChange?.({ type: change.type, document });
      });

    },
    (error) => {
      onError?.(error);
    }
  );
};

export const getRealtimeDocumentDate = getDocumentDate;
