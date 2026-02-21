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

const ADMIN_GENERAL_PATH = "chat/users/admin/general";
const USER_MIRROR_BASE = "chat/users";
const FETCH_USERS_URL =
  "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchusers";

function isDevMode() {
  return typeof import.meta !== "undefined" && Boolean(import.meta?.env?.DEV);
}

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  return JSON.parse(localStorage.getItem("adminUser"));
}

function normalizeMessage(messageId, msg) {
  const rawDate = msg?.dateTime || msg?.datetime || "";
  const parsedTime = parseDateTimeMs(rawDate);
  const dateTime = parsedTime > 0 ? new Date(parsedTime).toISOString() : String(rawDate || "");
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

function parseDateTimeMs(rawDate) {
  if (!rawDate) return 0;

  const direct = new Date(rawDate).getTime();
  if (!Number.isNaN(direct)) return direct;

  const asString = String(rawDate).trim();
  if (!asString) return 0;

  let normalized = asString.includes(" ") ? asString.replace(" ", "T") : asString;
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized = `${normalized}Z`;
  }

  const tolerant = new Date(normalized).getTime();
  return Number.isNaN(tolerant) ? 0 : tolerant;
}

function normalizeContactId(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/[+\s-]/g, "");
  return cleaned || null;
}

function resolveUserId(chatTarget) {
  if (chatTarget && typeof chatTarget === "object") {
    const candidate =
      chatTarget.userid ??
      chatTarget.userId ??
      chatTarget.uid ??
      chatTarget.id ??
      null;

    return normalizeContactId(candidate);
  }

  return normalizeContactId(chatTarget);
}

function resolveContactId(chatTarget) {
  if (chatTarget && typeof chatTarget === "object") {
    const preferred = [
      chatTarget.phoneNumber,
      chatTarget.phone,
      chatTarget.mobile,
      chatTarget.contact,
      chatTarget.whatsappNumber,
    ];

    for (const option of preferred) {
      const normalized = normalizeContactId(option);
      if (normalized) return normalized;
    }
  }

  return resolveUserId(chatTarget);
}

function buildMessageDedupKey(message) {
  if (message?.id) return `id:${message.id}`;

  const dt = String(message?.dateTime || "");
  const sender = String(message?.sendername || "");
  const text = String(message?.content?.message ?? message?.message ?? "");
  const type = String(message?.type ?? "");
  const mediaUrl = String(message?.content?.attachmentUrl ?? message?.attachmentUrl ?? "");

  return `fallback:${dt}|${sender}|${text}|${type}|${mediaUrl}`;
}

function mergeMessageObjects(primaryMessagesObject = {}, fallbackMessagesObject = {}) {
  const mergedMap = new Map();

  const addMessages = (messagesObject) => {
    Object.entries(messagesObject || {}).forEach(([id, msg]) => {
      const normalized = normalizeMessage(id, msg);
      const dedupKey = buildMessageDedupKey(normalized);

      if (!mergedMap.has(dedupKey)) {
        mergedMap.set(dedupKey, normalized);
      }
    });
  };

  addMessages(primaryMessagesObject);
  addMessages(fallbackMessagesObject);

  return sortByDateTimeAsc(Array.from(mergedMap.values()));
}

function sortByDateTimeAsc(messages) {
  return messages.sort((a, b) => {
    const left = parseDateTimeMs(a?.dateTime);
    const right = parseDateTimeMs(b?.dateTime);
    return left - right;
  });
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
export async function fetchMessages(chatTarget, messageLimit = 10) {
  const userid = resolveUserId(chatTarget);
  const contactId = resolveContactId(chatTarget);
  if (!userid || !contactId) {
    return { messages: [] };
  }

  const primaryPath = `${ADMIN_GENERAL_PATH}/${contactId}`;
  const fallbackPath = `${USER_MIRROR_BASE}/${userid}/admin`;

  if (isDevMode()) {
    console.log("[chatAPI] fetchMessages", { userid, contactId, primaryPath, fallbackPath });
  }

  const [primarySnapshot, fallbackSnapshot] = await Promise.all([
    get(ref(database, primaryPath)),
    get(ref(database, fallbackPath)),
  ]);

  const messages = mergeMessageObjects(
    primarySnapshot.exists() ? primarySnapshot.val() : {},
    fallbackSnapshot.exists() ? fallbackSnapshot.val() : {}
  );

  // If we only need 1 message, return just the most recent (last in sorted array)
  if (messageLimit === 1 && messages.length > 0) {
    return { messages: [messages[messages.length - 1]] };
  }

  // Return the last N messages (most recent)
  return { messages: messages.slice(-messageLimit) };
}

/**
 * Subscribe to messages for a specific user - fetches all messages
 * @param {string} userid - User ID
 * @param {function} onChange - Callback function called when messages change
 * @returns {function} Unsubscribe function
 */
export function subscribeMessages(userid, onChange) {
  const resolvedUserId = resolveUserId(userid);
  const contactId = resolveContactId(userid);
  if (!resolvedUserId || !contactId) {
    onChange([]);
    return () => {};
  }

  const primaryPath = `${ADMIN_GENERAL_PATH}/${contactId}`;
  const fallbackPath = `${USER_MIRROR_BASE}/${resolvedUserId}/admin`;

  if (isDevMode()) {
    console.log("[chatAPI] subscribeMessages", { userid: resolvedUserId, contactId, primaryPath, fallbackPath });
  }

  let primaryMessagesObject = {};
  let fallbackMessagesObject = {};

  const emit = () => {
    onChange(mergeMessageObjects(primaryMessagesObject, fallbackMessagesObject));
  };

  const unsubscribePrimary = onValue(ref(database, primaryPath), (snapshot) => {
    primaryMessagesObject = snapshot.exists() ? snapshot.val() : {};
    emit();
  });

  const unsubscribeFallback = onValue(ref(database, fallbackPath), (snapshot) => {
    fallbackMessagesObject = snapshot.exists() ? snapshot.val() : {};
    emit();
  });

  return () => {
    unsubscribePrimary();
    unsubscribeFallback();
  };
}

/**
 * Subscribe to the latest message for a specific user.
 * Uses a bounded window, then sorts by dateTime to avoid Firebase key-order issues.
 * @param {string} userid
 * @param {(message: object|null) => void} onChange
 * @returns {function} Unsubscribe function
 */
export function subscribeLastMessage(userid, onChange) {
  return subscribeMessages(userid, (messages) => {
    onChange(messages.length ? messages[messages.length - 1] : null);
  });
}

export function subscribeChatSummary(chatTarget, onChange) {
  const resolvedUserId = resolveUserId(chatTarget);
  const contactId = resolveContactId(chatTarget);

  if (!resolvedUserId || !contactId) {
    onChange({ lastMessage: null, unreadCount: 0 });
    return () => {};
  }

  const primaryRef = ref(database, `${ADMIN_GENERAL_PATH}/${contactId}`);
  const fallbackRef = ref(database, `${USER_MIRROR_BASE}/${resolvedUserId}/admin`);

  let primaryMessagesObject = {};
  let fallbackMessagesObject = {};

  const emit = () => {
    let lastMessage = null;
    let lastTimestamp = 0;
    let unreadCount = 0;

    Object.entries(primaryMessagesObject).forEach(([id, raw]) => {
      const msg = normalizeMessage(id, raw);
      if (!msg) return;

      const ts = parseDateTimeMs(msg.dateTime);
      if (ts >= lastTimestamp) {
        lastTimestamp = ts;
        lastMessage = msg;
      }

      if (raw?.type === 1 && !isSeenByCurrentAdmin(raw)) {
        unreadCount++;
      }
    });

    Object.entries(fallbackMessagesObject).forEach(([id, raw]) => {
      const msg = normalizeMessage(id, raw);
      if (!msg) return;

      const ts = parseDateTimeMs(msg.dateTime);
      if (ts >= lastTimestamp) {
        lastTimestamp = ts;
        lastMessage = msg;
      }
    });

    onChange({ lastMessage, unreadCount });
  };

  const unsubscribePrimary = onValue(primaryRef, (snapshot) => {
    primaryMessagesObject = snapshot.exists() ? snapshot.val() : {};
    emit();
  });

  const unsubscribeFallback = onValue(fallbackRef, (snapshot) => {
    fallbackMessagesObject = snapshot.exists() ? snapshot.val() : {};
    emit();
  });

  return () => {
    unsubscribePrimary();
    unsubscribeFallback();
  };
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
export async function sendMessage(chatTarget, text, adminUser = getAdminUser(), replyToMsgId = null, attachmentUrl = "") {
  const userid = resolveUserId(chatTarget);
  const contactId = resolveContactId(chatTarget);

  if (!userid || !contactId) {
    throw new Error("Missing chat target id.");
  }

  const messageId = push(ref(database, `${ADMIN_GENERAL_PATH}/${contactId}`)).key;

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
    contactId,
    sendername: adminUser?.name || adminUser?.userid || "Admin",
    replyTo,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  const writes = [
    set(ref(database, `${ADMIN_GENERAL_PATH}/${contactId}/${messageId}`), payload),
    set(ref(database, `${USER_MIRROR_BASE}/${contactId}/admin/${messageId}`), userPayload),
  ];

  if (userid !== contactId) {
    writes.push(set(ref(database, `${USER_MIRROR_BASE}/${userid}/admin/${messageId}`), userPayload));
  }

  await Promise.all(writes);

  return { message: payload };
}

/**
 * Delete a specific message
 * @param {string} messageId - Message ID
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteSpecificMessage(messageId, userid) {
  await Promise.all([
    remove(ref(database, `${ADMIN_GENERAL_PATH}/${userid}/${messageId}`)),
    remove(ref(database, `${USER_MIRROR_BASE}/${userid}/admin/${messageId}`)),
  ]);

  return { success: true };
}

/**
 * Delete entire chat history for a user
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteChatHistory(userid) {
  await Promise.all([
    remove(ref(database, `${ADMIN_GENERAL_PATH}/${userid}`)),
    remove(ref(database, `${USER_MIRROR_BASE}/${userid}/admin`)),
  ]);

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
export async function markMessagesAsSeen(chatTarget) {
  try {
    const userid = resolveUserId(chatTarget);
    const contactId = resolveContactId(chatTarget);
    if (!userid || !contactId) {
      return { success: true };
    }

    const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${contactId}`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return { success: true };
    }

    const messagesObject = snapshot.val();
    const updateData = {};
    const adminId = getCurrentAdminId();
    const seenTimestamp = new Date().toISOString();

    // Mark only for current admin: set seenByAdmins/<adminId> (and legacy fields for display)
    Object.keys(messagesObject).forEach((messageId) => {
      const msg = messagesObject[messageId];
      if (msg.type !== 1) return;
      if (isSeenByCurrentAdmin(msg)) return;
      const messagePath = `${ADMIN_GENERAL_PATH}/${contactId}/${messageId}`;
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
export async function getUnreadCount(chatTarget) {
  try {
    const contactId = resolveContactId(chatTarget);
    if (!contactId) {
      return { unreadCount: 0 };
    }

    const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${contactId}`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return 0;
    }

    const messagesObject = snapshot.val();
    let unreadCount = 0;

    Object.values(messagesObject).forEach((msg) => {
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
export function subscribeUnreadCount(chatTarget, onChange) {
  const contactId = resolveContactId(chatTarget);
  if (!contactId) {
    onChange(0);
    return () => {};
  }

  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${contactId}`);

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(0);
      return;
    }

    const messagesObject = snapshot.val();
    let unreadCount = 0;

    Object.values(messagesObject).forEach((msg) => {
      if (msg.type === 1 && !isSeenByCurrentAdmin(msg)) {
        unreadCount++;
      }
    });

    onChange(unreadCount);
  });

  return unsubscribe;
}
