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

// Realtime DB structure: chat/users/{userId}/admin (all messages for this user's admin chat)
const CHAT_USERS_BASE = "chat/users";
function userAdminPath(userid) {
  return `${CHAT_USERS_BASE}/${userid}/admin`;
}
const FETCH_USERS_URL =
  "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchusers";

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

function sortByDateTimeAsc(messages) {
  return messages.sort((a, b) => {
    const left = a?.dateTime ? new Date(a.dateTime).getTime() : 0;
    const right = b?.dateTime ? new Date(b.dateTime).getTime() : 0;
    return left - right;
  });
}

/** Returns true if obj looks like a message (has dateTime or content). */
function isMessageLike(obj) {
  if (!obj || typeof obj !== "object") return false;
  return (
    obj.dateTime != null ||
    obj.datetime != null ||
    obj.content != null ||
    obj.message != null
  );
}

/**
 * Flatten Firebase snapshot at chat/users/{userId}/admin into [ [messageId, message], ... ].
 * Handles: direct { msgId: msg } or nested { general: { msgId: msg } } / { messages: { ... } }.
 */
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

/** Collect [pathSuffix, messageId, message] for every message (handles nested e.g. general/msgId). */
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

/**
 * Fetch users for chat from the API
 * @returns {Promise<{users: Array}>}
 */
export async function fetchUsersForChat() {
  const token = getToken();
  const response = await fetch(FETCH_USERS_URL, {
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
  const messagesRef = ref(database, userAdminPath(userid));
  const snapshot = await get(messagesRef);
  const raw = snapshot.exists() ? snapshot.val() : null;
  const flat = flattenMessagesFromSnapshot(raw);

  const messages = sortByDateTimeAsc(
    flat.map(([id, msg]) => normalizeMessage(id, msg))
  );

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
  const messagesRef = ref(database, userAdminPath(userid));

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

/**
 * Subscribe to the latest message for a specific user.
 * Uses a bounded window, then sorts by dateTime to avoid Firebase key-order issues.
 * @param {string} userid
 * @param {(message: object|null) => void} onChange
 * @returns {function} Unsubscribe function
 */
export function subscribeLastMessage(userid, onChange) {
  const messagesRef = ref(database, userAdminPath(userid));

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(null);
      return;
    }
    const raw = snapshot.val();
    const flat = flattenMessagesFromSnapshot(raw);
    const messages = sortByDateTimeAsc(
      flat.map(([id, msg]) => normalizeMessage(id, msg))
    );
    onChange(messages.length ? messages[messages.length - 1] : null);
  });

  return unsubscribe;
}

/**
 * Send a message to a user
 * @param {string} userid - User ID
 * @param {string} text - Message text (must be a string)
 * @param {object} [adminUser] - Admin user object (optional, will fetch if not provided)
 * @param {string|null} [replyToMsgId] - Optional message ID this message is replying to
 * @param {string} [attachmentUrl] - Optional attachment download URL (image/video/document)
 * @returns {Promise<{message: object}>}
 */
export async function sendMessage(userid, text, adminUser = getAdminUser(), replyToMsgId = null, attachmentUrl = "") {
  const path = userAdminPath(userid);
  const messageId = push(ref(database, path)).key;

  if (!messageId) {
    throw new Error("Unable to generate message id.");
  }

  const messageText = typeof text === "string" ? text : (text != null ? String(text) : "");
  const replyTo = replyToMsgId != null && replyToMsgId !== "" ? replyToMsgId : null;
  const attachment = typeof attachmentUrl === "string" && attachmentUrl.trim() ? attachmentUrl.trim() : "";

  const payload = {
    id: messageId,
    dateTime: new Date().toISOString(),
    content: { message: messageText, attachmentUrl: attachment },
    status: 0,
    type: 0,
    contactId: userid,
    sendername: adminUser?.name || adminUser?.userid || "Admin",
    replyTo,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  await set(ref(database, `${path}/${messageId}`), userPayload);
  return { message: payload };
}

/**
 * Delete a specific message
 * @param {string} messageId - Message ID
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteSpecificMessage(messageId, userid) {
  await remove(ref(database, `${userAdminPath(userid)}/${messageId}`));
  return { success: true };
}

/**
 * Delete entire chat history for a user
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteChatHistory(userid) {
  await remove(ref(database, userAdminPath(userid)));
  return { success: true };
}

/** Current admin id for per-admin seen state */
function getCurrentAdminId() {
  const adminUser = getAdminUser();
  return adminUser?.userid || adminUser?.userId || adminUser?.id || "admin";
}

/** True if this message is seen by the current admin (per-admin seen) */
function isSeenByCurrentAdmin(msg) {
  const adminId = getCurrentAdminId();
  if (msg.seenByAdmins && typeof msg.seenByAdmins === "object" && msg.seenByAdmins[adminId]) {
    return true;
  }
  // Legacy: message had global seenByAdmin only → treat as seen by all
  if (msg.seenByAdmin === true && (!msg.seenByAdmins || Object.keys(msg.seenByAdmins || {}).length === 0)) {
    return true;
  }
  return false;
}

/**
 * Mark messages as seen/read for the current admin only (per-admin seen)
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markMessagesAsSeen(userid) {
  try {
    const basePath = userAdminPath(userid);
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

    const lastSeenRef = ref(database, `chat/admin/lastSeen/${userid}`);
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

/**
 * Get unread message count for the current admin only (per-admin)
 * @param {string} userid - User ID
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userid) {
  try {
    const messagesRef = ref(database, userAdminPath(userid));
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

/**
 * Subscribe to unread count for the current admin only (per-admin)
 * @param {string} userid - User ID
 * @param {function} onChange - Callback function called when unread count changes
 * @returns {function} Unsubscribe function
 */
export function subscribeUnreadCount(userid, onChange) {
  const messagesRef = ref(database, userAdminPath(userid));

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
