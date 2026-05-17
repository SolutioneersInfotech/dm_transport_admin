import { onValue, ref as databaseRef } from "firebase/database";
import {
  collection,
  collectionGroup,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { database, firestore } from "../firebase/firebaseApp";

const BROADCAST_HISTORY_PATH = "broadcastHistory";
const BROADCAST_LIMIT = 12;
const DOCUMENT_LIMIT = 12;

function normalizeTimestampMs(value) {
  if (!value) return 0;

  if (value?.toDate instanceof Function) {
    return value.toDate().getTime();
  }

  if (typeof value?.seconds === "number") {
    return value.seconds * 1000;
  }

  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getDocumentTypeLabel(document) {
  if (typeof document?.type === "string" && document.type.trim()) {
    return document.type.trim();
  }

  if (typeof document?.category === "string" && document.category.trim()) {
    return document.category.trim();
  }

  return "document";
}

function getCanonicalDocumentNotificationId(data = {}, metadata = {}, docSnapshot) {
  return (
    data.id ||
    metadata.document_id ||
    data.document_id ||
    data.documentId ||
    metadata.documentId ||
    docSnapshot?.id ||
    [
      metadata.driver_name || metadata.driverName || data.driver_name || data.driverName || "driver",
      metadata.type || metadata.document_type || data.document_type || getDocumentTypeLabel(data),
      normalizeTimestampMs(
        data.createdAt ||
          data.date ||
          data.created_at ||
          data.timestamp ||
          metadata.createdAt ||
          metadata.date ||
          metadata.timestamp
      ) || 0,
    ].join(":")
  );
}

function normalizeNotificationType(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isDocumentUploadNotification(data = {}) {
  const candidateTypes = [
    data.notificationType,
    data.chatType,
    data.type,
    data.eventType,
    data.category,
    data.action,
  ]
    .map(normalizeNotificationType)
    .filter(Boolean);

  if (
    candidateTypes.some((type) =>
      ["document_upload", "document", "documents", "upload_document", "uploaded_document"].includes(type)
    )
  ) {
    return true;
  }

  const metadata = data.metadata || {};
  return Boolean(
    metadata.document_id ||
      data.document_id ||
      data.documentId ||
      metadata.driver_name ||
      data.driver_name ||
      data.driverName
  );
}

function mapDocumentNotificationDoc(docSnapshot) {
  const data = docSnapshot.data() || {};
  if (!isDocumentUploadNotification(data)) {
    return null;
  }

  const metadata = data.metadata || {};
  const documentId = getCanonicalDocumentNotificationId(data, metadata, docSnapshot);
  const timestampMs = normalizeTimestampMs(
    data.createdAt ||
      data.date ||
      data.created_at ||
      data.timestamp ||
      metadata.createdAt ||
      metadata.date ||
      metadata.timestamp
  );
  const driverName =
    metadata.driver_name ||
    metadata.driverName ||
    data.driver_name ||
    data.driverName ||
    "Driver";
  const typeLabel =
    metadata.type ||
    metadata.document_type ||
    data.document_type ||
    getDocumentTypeLabel(data);

  return {
    id: `document:${documentId}`,
    sourceId: documentId,
    type: "document",
    title: data.title || "Document uploaded",
    detail: `${driverName} uploaded ${typeLabel}`,
    timestampMs,
    route: "/documents",
  };
}

function mapDocumentUploadDoc(docSnapshot) {
  const data = docSnapshot.data() || {};
  const documentId = getCanonicalDocumentNotificationId(data, data.metadata || {}, docSnapshot);
  const timestampMs = normalizeTimestampMs(
    data.date || data.createdAt || data.created_at || data.timestamp
  );
  const driverName = data.driver_name || data.driverName || "Driver";
  const typeLabel = getDocumentTypeLabel(data);

  return {
    id: `document:${documentId}`,
    sourceId: documentId,
    type: "document",
    title: "Document uploaded",
    detail: `${driverName} uploaded ${typeLabel}`,
    timestampMs,
    route: "/documents",
  };
}

function finalizeDocumentNotifications(items) {
  return items
    .filter((item) => item && item.timestampMs > 0)
    .sort((left, right) => right.timestampMs - left.timestampMs)
    .slice(0, DOCUMENT_LIMIT);
}

export function formatNotificationRelativeTime(value, now = Date.now()) {
  const timestampMs = normalizeTimestampMs(value);
  if (!timestampMs) return "Just now";

  const diffMs = Math.max(0, now - timestampMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return "Just now";
  if (diffMs < hourMs) return `${Math.floor(diffMs / minuteMs)}m ago`;
  if (diffMs < dayMs) return `${Math.floor(diffMs / hourMs)}h ago`;
  if (diffMs < 7 * dayMs) return `${Math.floor(diffMs / dayMs)}d ago`;

  return new Date(timestampMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function subscribeBroadcastNotifications(onChange) {
  return onValue(databaseRef(database, BROADCAST_HISTORY_PATH), (snapshot) => {
    if (!snapshot.exists()) {
      onChange([]);
      return;
    }

    const notifications = Object.entries(snapshot.val() || {})
      .map(([id, item]) => {
        const timestampMs = normalizeTimestampMs(item?.timestamp);
        const recipientCount = Array.isArray(item?.userids) ? item.userids.length : 0;
        const senderName = item?.sendername || "Admin";
        const message = String(item?.message || "").trim();
        const attachmentName = String(item?.attachmentName || "").trim();
        const detailParts = [];

        if (message) {
          detailParts.push(message);
        }

        if (attachmentName) {
          detailParts.push(`Attachment: ${attachmentName}`);
        }

        if (recipientCount > 0) {
          detailParts.push(`Recipients: ${recipientCount}`);
        }

        return {
          id: `broadcast:${id}`,
          sourceId: id,
          type: "broadcast",
          title: "Broadcast sent",
          detail: detailParts.join(" | ") || `${senderName} sent a broadcast`,
          timestampMs,
          route: "/broadcast",
        };
      })
      .sort((left, right) => right.timestampMs - left.timestampMs)
      .slice(0, BROADCAST_LIMIT);

    onChange(notifications);
  });
}

export function subscribeDocumentUploadNotifications(onChange) {
  let adminUser = null;

  try {
    adminUser = JSON.parse(window.localStorage.getItem("adminUser") || "null");
  } catch (error) {
    console.error("Failed to parse admin user for document notifications:", error);
  }

  const adminId = adminUser?.userid || adminUser?.userId || adminUser?.id || "admin";

  const notificationsQuery = query(
    collection(firestore, "users", adminId, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  const fallbackUploadsQuery = query(
    collectionGroup(firestore, "uploads"),
    orderBy("date", "desc"),
    limit(DOCUMENT_LIMIT)
  );

  let fallbackUnsubscribe = null;

  const startFallbackSubscription = () => {
    if (fallbackUnsubscribe) {
      return;
    }

    fallbackUnsubscribe = onSnapshot(
      fallbackUploadsQuery,
      (snapshot) => {
        const notifications = finalizeDocumentNotifications(
          snapshot.docs.map(mapDocumentUploadDoc)
        );

        onChange(notifications);
      },
      (error) => {
        console.error("Document upload fallback subscription failed:", error);
        onChange([]);
      }
    );
  };

  const primaryUnsubscribe = onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = finalizeDocumentNotifications(
        snapshot.docs.map(mapDocumentNotificationDoc)
      );

      // If the admin notification feed is reachable but currently has no document-upload
      // items, fall back to the live uploads collection so recent uploads still surface.
      if (notifications.length === 0) {
        startFallbackSubscription();
        return;
      }

      if (fallbackUnsubscribe) {
        fallbackUnsubscribe();
        fallbackUnsubscribe = null;
      }

      onChange(notifications);
    },
    (error) => {
      console.error("Admin notification subscription failed for document uploads:", error);
      startFallbackSubscription();
    }
  );

  return () => {
    primaryUnsubscribe?.();
    fallbackUnsubscribe?.();
  };
}
