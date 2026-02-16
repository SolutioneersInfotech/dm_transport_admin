import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
  update,
} from "firebase/database";
import { database } from "../firebase/firebaseApp";

// Realtime DB structure: chat/users/{userId}/maintenance (all messages for this user's maintenance chat)
const CHAT_USERS_BASE = "chat/users";
function userMaintenancePath(userid) {
  return `${CHAT_USERS_BASE}/${userid}/maintenance`;
}
const FETCH_CHAT_THREADS_URL =
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin/fetchchatthreads?chatType=maintenance";

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  return JSON.parse(localStorage.getItem("adminUser"));
}

function normalizeMessage(messageId, msg) {
  const rawDate = msg?.dateTime || msg?.datetime;
  const date = rawDate ? new Date(rawDate) : new Date();
  const dateTime = Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
  const type =
    msg?.type === 0 ? 1 :
    msg?.type === 1 ? 0 :
    msg?.type;

  return {
    msgId: messageId,
    id: messageId,
    dateTime,
    content: {
      message: msg?.content?.message ?? msg?.message ?? "",
      attachmentUrl: msg?.content?.attachmentUrl ?? msg?.attachmentUrl ?? "",
    },
    status: msg?.status ?? 0,
    type: typeof type === "number" ? type : 0,
    contactId: msg?.contactId ?? msg?.userid ?? null,
    sendername: msg?.sendername ?? "Unknown",
    replyTo: msg?.replyTo ?? null,
    seenByAdmin: msg?.seenByAdmin ?? false,
    seenByAdmins: msg?.seenByAdmins ?? null,
    seenAt: msg?.seenAt ?? null,
    seenBy: msg?.seenBy ?? null,
  };
}

function getCurrentAdminId() {
  const adminUser = getAdminUser();
  return adminUser?.userid || adminUser?.userId || adminUser?.id || "admin";
}

function isSeenByCurrentAdmin(msg) {
  const adminId = getCurrentAdminId();
  if (msg.seenByAdmins && typeof msg.seenByAdmins === "object" && msg.seenByAdmins[adminId]) {
    return true;
  }
  if (msg.seenByAdmin === true && (!msg.seenByAdmins || Object.keys(msg.seenByAdmins || {}).length === 0)) {
    return true;
  }
  return false;
}

function sortByDateTimeAsc(messages) {
  return messages.sort((a, b) => {
    const left = a?.dateTime ? new Date(a.dateTime).getTime() : 0;
    const right = b?.dateTime ? new Date(b.dateTime).getTime() : 0;
    return left - right;
  });
}

function isMessageLike(obj) {
  if (!obj || typeof obj !== "object") return false;
  return (
    obj.dateTime != null ||
    obj.datetime != null ||
    obj.content != null ||
    obj.message != null
  );
}

function flattenMessagesFromSnapshot(val) {
  if (!val || typeof val !== "object") return [];
  const entries = Object.entries(val);
  const out = [];
  for (const [key, value] of entries) {
    if (!value || typeof value !== "object") continue;
    if (isMessageLike(value)) {
      out.push([key, value]);
      continue;
    }
    const inner = Object.entries(value);
    const allLookLikeMessages = inner.length > 0 && inner.every(([, v]) => isMessageLike(v));
    if (allLookLikeMessages) {
      inner.forEach(([id, msg]) => out.push([id, msg]));
    }
  }
  return out;
}

function collectMessagePaths(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return [];
  const out = [];
  for (const [key, value] of Object.entries(obj)) {
    if (!value || typeof value !== "object") continue;
    if (isMessageLike(value)) {
      const pathSuffix = prefix ? `${prefix}/${key}` : key;
      out.push([pathSuffix, key, value]);
      continue;
    }
    const inner = Object.entries(value);
    if (inner.length > 0 && inner.every(([, v]) => isMessageLike(v))) {
      const segment = prefix ? `${prefix}/${key}` : key;
      inner.forEach(([id, msg]) => out.push([`${segment}/${id}`, id, msg]));
    }
  }
  return out;
}

export async function fetchUsersForChat() {
  const token = getToken();
  const response = await fetch(FETCH_CHAT_THREADS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch chat threads.");
  }

  const data = await response.json();
  const users = Array.isArray(data?.users) ? data.users : [];
  return { users };
}

/**
 * Fetch messages for a specific user with pagination
 * @param {string} userid - User ID
 * @param {number} messageLimit - Number of messages to fetch (default: 10)
 * @returns {Promise<{messages: Array}>}
 */
export async function fetchMessages(userid, messageLimit = 10) {
  // FIX: Fetch all messages and sort by timestamp to get the actual most recent
  // Firebase key order is not timestamp order, so we need to sort all messages
  // to ensure we get the most recent messages correctly
  
  const messagesRef = ref(database, userMaintenancePath(userid));
  const snapshot = await get(messagesRef);
  const raw = snapshot.exists() ? snapshot.val() : null;
  const flat = flattenMessagesFromSnapshot(raw);
  const messages = sortByDateTimeAsc(
    flat.map(([id, msg]) => normalizeMessage(id, msg))
  );

  // If we only need 1 message, return just the most recent (last in sorted array)
  if (messageLimit === 1 && messages.length > 0) {
    return { messages: [messages[messages.length - 1]] };
  }
  if (messageLimit <= 0 || messageLimit >= messages.length) {
    return { messages };
  }
  return { messages: messages.slice(-messageLimit) };
}

/**
 * Subscribe to messages for a specific user - loads the whole chat (no limit).
 * @param {string} userid - User ID
 * @param {function} onChange - Callback function called when messages change
 * @returns {function} Unsubscribe function
 */
export function subscribeMessages(userid, onChange) {
  const messagesRef = ref(database, userMaintenancePath(userid));

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const raw = snapshot.exists() ? snapshot.val() : null;
    const flat = flattenMessagesFromSnapshot(raw);
    const messages = sortByDateTimeAsc(
      flat.map(([id, msg]) => normalizeMessage(id, msg))
    );
    onChange(messages);
  });

  return unsubscribe;
}

export async function sendMessage(userid, text, adminUser = getAdminUser()) {
  const path = userMaintenancePath(userid);
  const messageId = push(ref(database, path)).key;

  if (!messageId) {
    throw new Error("Unable to generate message id.");
  }

  const payload = {
    id: messageId,
    dateTime: new Date().toISOString(),
    content: { message: text, attachmentUrl: "" },
    status: 0,
    type: 0,
    contactId: userid,
    sendername: adminUser?.userid || "Admin",
    replyTo: null,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  await set(ref(database, `${path}/${messageId}`), userPayload);
  return { message: payload };
}

export async function deleteChatHistory(userid) {
  await remove(ref(database, userMaintenancePath(userid)));
  return { success: true };
}

export async function deleteSpecificMessage(messageId, userid) {
  await remove(ref(database, `${userMaintenancePath(userid)}/${messageId}`));
  return { success: true };
}

// Mark messages as seen/read for the current admin only (per-admin seen)
export async function markMessagesAsSeen(userid) {
  try {
    const basePath = userMaintenancePath(userid);
    const messagesRef = ref(database, basePath);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return { success: true };
    }

    const raw = snapshot.val();
    const pathEntries = collectMessagePaths(raw);
    const updateData = {};
    const adminId = getCurrentAdminId();
    const seenTimestamp = new Date().toISOString();

    pathEntries.forEach(([pathSuffix, , msg]) => {
      if (msg.type !== 1) return;
      if (isSeenByCurrentAdmin(msg)) return;
      const messagePath = `${basePath}/${pathSuffix}`;
      updateData[`${messagePath}/seenByAdmins/${adminId}`] = seenTimestamp;
      updateData[`${messagePath}/seenAt`] = seenTimestamp;
      updateData[`${messagePath}/seenBy`] = adminId;
    });

    if (Object.keys(updateData).length > 0) {
      await update(ref(database), updateData);
    }

    const lastSeenRef = ref(database, `chat/admin/maintenance/lastSeen/${userid}`);
    await set(lastSeenRef, {
      timestamp: seenTimestamp,
      adminId: adminId,
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    return { success: false, error: error.message };
  }
}

// Get unread message count for the current admin only (per-admin)
export async function getUnreadCount(userid) {
  try {
    const messagesRef = ref(database, userMaintenancePath(userid));
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return 0;
    }

    const raw = snapshot.val();
    const flat = flattenMessagesFromSnapshot(raw);
    let unreadCount = 0;
    flat.forEach(([, msg]) => {
      if (msg.type === 1 && !isSeenByCurrentAdmin(msg)) {
        unreadCount++;
      }
    });
    return unreadCount;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

// Subscribe to unread count for the current admin only (per-admin)
export function subscribeUnreadCount(userid, onChange) {
  const messagesRef = ref(database, userMaintenancePath(userid));

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(0);
      return;
    }
    const raw = snapshot.val();
    const flat = flattenMessagesFromSnapshot(raw);
    let unreadCount = 0;
    flat.forEach(([, msg]) => {
      if (msg.type === 1 && !isSeenByCurrentAdmin(msg)) {
        unreadCount++;
      }
    });
    onChange(unreadCount);
  });

  return unsubscribe;
}
