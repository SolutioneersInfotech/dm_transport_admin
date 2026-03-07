import { collection, limit, onSnapshot, query } from "firebase/firestore";
import { firestore } from "../firebase/firebaseApp";
import { documentMatchesRealtimeFilters } from "./documentRealtimeSync";

const DOCUMENTS_COLLECTION = "documents";
const OVERLAY_LIMIT = 200;

let activeSubscription = null;
let activeSubscriptionKey = null;

const normalizeDocument = (snapshotDoc) => {
  const data = snapshotDoc.data() || {};
  return {
    id: data.id || data.document_id || snapshotDoc.id,
    ...data,
  };
};

/**
 * Lightweight page-1 overlay subscription.
 * Backend pagination stays authoritative for total, filters, details and page navigation.
 */
export const subscribeToLiveDocuments = ({ filters, onChanges, onError }) => {
  const nextKey = JSON.stringify(filters || {});

  if (activeSubscription && activeSubscriptionKey === nextKey) {
    return activeSubscription;
  }

  if (activeSubscription) {
    activeSubscription();
    activeSubscription = null;
    activeSubscriptionKey = null;
  }

  const docsQuery = query(collection(firestore, DOCUMENTS_COLLECTION), limit(OVERLAY_LIMIT));
  let initialized = false;

  const unsubscribe = onSnapshot(
    docsQuery,
    (snapshot) => {
      const changes = [];

      if (!initialized) {
        initialized = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        const document = normalizeDocument(change.doc);
        const matches = documentMatchesRealtimeFilters(document, filters);

        if (change.type === "removed" || !matches) {
          changes.push({ type: "removed", documentId: document.id, document });
          return;
        }

        changes.push({ type: change.type, document });
      });

      if (changes.length > 0) {
        onChanges?.(changes);
      }
    },
    (error) => {
      onError?.(error);
    }
  );

  activeSubscription = () => {
    unsubscribe();
    if (activeSubscriptionKey === nextKey) {
      activeSubscription = null;
      activeSubscriptionKey = null;
    }
  };
  activeSubscriptionKey = nextKey;

  return activeSubscription;
};
