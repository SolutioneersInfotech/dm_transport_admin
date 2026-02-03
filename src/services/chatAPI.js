import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import { database } from "../firebase/firebaseApp";

const ADMIN_GENERAL_PATH = "chat/users/admin/general";
const USER_MIRROR_BASE = "chat/users";
const ADMIN_READS_PATH = "chat/adminReads";
export const chatType = "general";
const FETCH_USERS_URL =
  "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchusers";

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  return JSON.parse(localStorage.getItem("adminUser"));
}

export function getAdminId() {
  return getAdminUser()?.userid || "admin";
}

function buildContentPayload(input) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const message =
      typeof input.message === "string"
        ? input.message
        : input.message != null
          ? String(input.message)
          : "";
    const attachment = input.attachment ?? null;
    const attachmentUrl =
      typeof input.attachmentUrl === "string"
        ? input.attachmentUrl
        : attachment?.url || "";
    return { message, attachment, attachmentUrl };
  }

  const message =
    typeof input === "string" ? input : input != null ? String(input) : "";
  return {
    message,
    attachment: null,
    attachmentUrl: "",
  };
}

function parseMessageDate(msg) {
  const rawDate = msg?.dateTime ?? msg?.datetime;
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildDateRange(startDate, endDate) {
  const start =
    startDate instanceof Date
      ? startDate
      : startDate
        ? new Date(startDate)
        : null;
  const end =
    endDate instanceof Date
      ? endDate
      : endDate
        ? new Date(endDate)
        : null;

  if (start && Number.isNaN(start.getTime())) return { start: null, end };
  if (end && Number.isNaN(end.getTime())) return { start, end: null };
  return { start, end };
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

  const attachmentUrl =
    msg?.content?.attachment?.url ??
    msg?.content?.attachmentUrl ??
    msg?.attachmentUrl ??
    "";
  const attachment =
    msg?.content?.attachment ??
    msg?.attachment ??
    (attachmentUrl ? { url: attachmentUrl, name: "Attachment" } : null);

  return {
    msgId: messageId,
    id: messageId,
    dateTime,
    content: {
      message: msg?.content?.message ?? msg?.message ?? "",
      attachment,
      attachmentUrl,
    },
    status: msg?.status ?? 0,
    type: typeof type === "number" ? type : 0,
    contactId: msg?.contactId ?? msg?.userid ?? null,
    sendername: msg?.sendername ?? "Unknown",
    replyTo: msg?.replyTo ?? null,
  };
}

function sortByDateTimeAsc(messages) {
  return messages.sort((a, b) => {
    const left = a?.dateTime ? new Date(a.dateTime).getTime() : 0;
    const right = b?.dateTime ? new Date(b.dateTime).getTime() : 0;
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
export async function fetchMessages(userid, messageLimit = 10) {
  // FIX: Fetch more messages and sort by timestamp to get the actual most recent
  // limitToLast() uses Firebase key order, not timestamp order, so we need to sort
  // Fetch more messages (20) to ensure we get the most recent even if keys are out of order
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
  
  const snapshot = await get(messagesRef);
  const messagesObject = snapshot.exists() ? snapshot.val() : {};

  // Sort all messages by dateTime to get the actual most recent
  const messages = sortByDateTimeAsc(
    Object.entries(messagesObject).map(([id, msg]) =>
      normalizeMessage(id, msg)
    )
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
  // Fetch all messages without limit to ensure no messages are missed
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messagesObject = snapshot.exists() ? snapshot.val() : {};
    
    // Normalize and sort all messages by dateTime
    const messages = sortByDateTimeAsc(
      Object.entries(messagesObject || {}).map(([id, msg]) =>
        normalizeMessage(id, msg)
      )
    );

    onChange(messages);
  });

  return unsubscribe;
}

/**
 * Send a message to a user
 * @param {string} userid - User ID
 * @param {string} text - Message text (must be a string)
 * @param {object} [adminUser] - Admin user object (optional, will fetch if not provided)
 * @param {string|null} [replyToMsgId] - Optional message ID this message is replying to
 * @returns {Promise<{message: object}>}
 */
export async function sendMessage(userid, text, adminUser = getAdminUser(), replyToMsgId = null) {
  const messageId = push(ref(database, `${ADMIN_GENERAL_PATH}/${userid}`)).key;

  if (!messageId) {
    throw new Error("Unable to generate message id.");
  }

  const content = buildContentPayload(text);
  const messageText = content.message;
  const replyTo = replyToMsgId != null && replyToMsgId !== "" ? replyToMsgId : null;

  const payload = {
    id: messageId,
    dateTime: new Date().toISOString(),
    content: {
      message: messageText,
      attachment: content.attachment ?? null,
      attachmentUrl: content.attachment?.url || content.attachmentUrl || "",
    },
    status: 0,
    type: 0,
    contactId: userid,
    sendername: adminUser?.userid || "Admin",
    replyTo,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  await Promise.all([
    set(ref(database, `${ADMIN_GENERAL_PATH}/${userid}/${messageId}`), payload),
    set(ref(database, `${USER_MIRROR_BASE}/${userid}/admin/${messageId}`), userPayload),
  ]);

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

/**
 * Mark messages as seen/read for a specific user
 * @param {string} userid - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markMessagesAsSeen(userid) {
  try {
    const seenTimestamp = new Date().toISOString();
    const adminId = getAdminId();
    await setAdminLastRead(chatType, adminId, userid, seenTimestamp);
    return { success: true };
  } catch (error) {
    console.error("Error marking messages as seen:", error);
    return { success: false, error: error.message };
  }
}

export async function fetchAdminLastRead(chatTypeParam, adminId, userId) {
  const snapshot = await get(
    ref(database, `${ADMIN_READS_PATH}/${chatTypeParam}/${adminId}/${userId}`)
  );
  if (!snapshot.exists()) return null;
  return snapshot.val()?.lastReadAt ?? null;
}

export async function setAdminLastRead(chatTypeParam, adminId, userId, lastReadAt) {
  await set(
    ref(database, `${ADMIN_READS_PATH}/${chatTypeParam}/${adminId}/${userId}`),
    { lastReadAt }
  );
}

/**
 * Get unread message count for a user
 * @param {string} userid - User ID
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userid, options = {}) {
  try {
    const adminId = options.adminId || getAdminId();
    const { start, end } = buildDateRange(options.startDate, options.endDate);
    const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return 0;
    }

    const messagesObject = snapshot.val();
    const lastReadAt = await fetchAdminLastRead(chatType, adminId, userid);
    const lastReadDate = lastReadAt ? new Date(lastReadAt) : null;
    let unreadCount = 0;

    Object.values(messagesObject).forEach((msg) => {
      if (msg.type !== 1) return;
      const msgDate = parseMessageDate(msg);
      if (!msgDate) return;
      if (lastReadDate && msgDate <= lastReadDate) return;
      if (start && msgDate < start) return;
      if (end && msgDate > end) return;
      unreadCount += 1;
    });

    return unreadCount;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
}

/**
 * Subscribe to unread count changes for a user
 * @param {string} userid - User ID
 * @param {function} onChange - Callback function called when unread count changes
 * @returns {function} Unsubscribe function
 */
export function subscribeUnreadCount(userid, onChange, options = {}) {
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
  const adminId = options.adminId || getAdminId();
  const readsRef = ref(
    database,
    `${ADMIN_READS_PATH}/${chatType}/${adminId}/${userid}`
  );
  const { start, end } = buildDateRange(options.startDate, options.endDate);
  let lastReadDate = null;
  let messagesObject = {};

  const computeUnread = () => {
    if (!messagesObject || Object.keys(messagesObject).length === 0) {
      onChange(0);
      return;
    }

    let unreadCount = 0;
    Object.values(messagesObject).forEach((msg) => {
      if (msg.type !== 1) return;
      const msgDate = parseMessageDate(msg);
      if (!msgDate) return;
      if (lastReadDate && msgDate <= lastReadDate) return;
      if (start && msgDate < start) return;
      if (end && msgDate > end) return;
      unreadCount += 1;
    });

    onChange(unreadCount);
  };
  
  const unsubscribeMessages = onValue(messagesRef, (snapshot) => {
    messagesObject = snapshot.exists() ? snapshot.val() : {};
    computeUnread();
  });

  const unsubscribeReads = onValue(readsRef, (snapshot) => {
    const lastReadAt = snapshot.exists() ? snapshot.val()?.lastReadAt : null;
    lastReadDate = lastReadAt ? new Date(lastReadAt) : null;
    computeUnread();
  });

  return () => {
    unsubscribeMessages();
    unsubscribeReads();
  };
}
