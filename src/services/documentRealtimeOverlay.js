import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { firestore } from "../firebase/firebaseApp";
import { documentMatchesRealtimeFilters } from "./documentRealtimeSync";

const DOCUMENTS_COLLECTION = "documents";
const LIVE_HEAD_LIMIT = 250;
const PRIMARY_ORDER_FIELD = "date";

const subscriptionsBySignature = new Map();

const normalizeDocument = (snapshotDoc) => {
  const data = snapshotDoc.data() || {};
  return {
    id: data.id || data.document_id || snapshotDoc.id,
    ...data,
  };
};

const getChangesFromSnapshot = (snapshot, filters) => {
  const changes = [];

  snapshot.docChanges().forEach((change) => {
    const document = normalizeDocument(change.doc);
    const matches = documentMatchesRealtimeFilters(document, filters);

    if (change.type === "removed" || !matches) {
      changes.push({ type: "removed", documentId: document.id, document });
      return;
    }

    changes.push({ type: change.type, document });
  });

  return changes;
};

const cleanupSubscription = (signature) => {
  const entry = subscriptionsBySignature.get(signature);
  if (!entry) return;

  try {
    entry.unsubscribe?.();
  } finally {
    subscriptionsBySignature.delete(signature);
  }
};

/**
 * Old admin felt instant because page-1 stayed warm from Firebase's latest-first stream while
 * backend pagination still handled authoritative total/page navigation.
 */
export const subscribeToLiveDocuments = ({ filters, onInitialDocuments, onChanges, onError }) => {
  const signature = JSON.stringify(filters || {});
  const listener = {
    onInitialDocuments,
    onChanges,
    onError,
  };

  const existing = subscriptionsBySignature.get(signature);
  if (existing) {
    existing.listeners.add(listener);

    // New listeners joining an existing channel still get current live head immediately.
    if (existing.initialDocuments) {
      onInitialDocuments?.(existing.initialDocuments);
    }

    return () => {
      const current = subscriptionsBySignature.get(signature);
      if (!current) return;

      current.listeners.delete(listener);
      if (current.listeners.size === 0) {
        cleanupSubscription(signature);
      }
    };
  }

  const listeners = new Set([listener]);
  let initialized = false;
  let initialDocuments = null;

  const docsQuery = query(
    collection(firestore, DOCUMENTS_COLLECTION),
    orderBy(PRIMARY_ORDER_FIELD, "desc"),
    limit(LIVE_HEAD_LIMIT)
  );

  const unsubscribe = onSnapshot(
    docsQuery,
    (snapshot) => {
      if (!initialized) {
        initialized = true;
        initialDocuments = snapshot.docs
          .map(normalizeDocument)
          .filter((document) => documentMatchesRealtimeFilters(document, filters));

        const current = subscriptionsBySignature.get(signature);
        if (current) {
          current.initialDocuments = initialDocuments;
        }

        listeners.forEach((entry) => entry.onInitialDocuments?.(initialDocuments));
        return;
      }

      const changes = getChangesFromSnapshot(snapshot, filters);
      if (changes.length === 0) return;

      listeners.forEach((entry) => entry.onChanges?.(changes));
    },
    (error) => {
      listeners.forEach((entry) => entry.onError?.(error));
    }
  );

  subscriptionsBySignature.set(signature, {
    unsubscribe,
    listeners,
    initialDocuments,
  });

  return () => {
    const current = subscriptionsBySignature.get(signature);
    if (!current) return;

    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      cleanupSubscription(signature);
    }
  };
};
