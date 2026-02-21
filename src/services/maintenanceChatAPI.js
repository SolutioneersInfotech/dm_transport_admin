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

const ADMIN_MAINTENANCE_PATH = "chat/users/admin/maintenance";
const USER_MAINTENANCE_PATH = "chat/users";
const FETCH_CHAT_THREADS_URL =
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin/fetchchatthreads?chatType=maintenance";

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  return JSON.parse(localStorage.getItem("adminUser"));
}

function normalizeUserId(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
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

    return normalizeUserId(candidate);
  }

  return normalizeUserId(chatTarget);
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
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId) {
    return { messages: [] };
  }

  // FIX: Fetch all messages and sort by timestamp to get the actual most recent
  // Firebase key order is not timestamp order, so we need to sort all messages
  // to ensure we get the most recent messages correctly
  
  const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);
  
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
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId) {
    onChange([]);
    return () => {};
  }

  // Fetch all messages without limit to ensure no messages are missed
  const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);

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
 * Subscribe to the latest message for a specific maintenance thread.
 * @param {string|object} userid
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
  if (!resolvedUserId) {
    onChange({ lastMessage: null, unreadCount: 0 });
    return () => {};
  }

  const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange({ lastMessage: null, unreadCount: 0 });
      return;
    }

    const messagesObject = snapshot.val() || {};

    let lastMessage = null;
    let lastTimestamp = 0;
    let unreadCount = 0;

    Object.entries(messagesObject).forEach(([id, raw]) => {
      const msg = normalizeMessage(id, raw);
      if (!msg) return;

      const ts = msg.dateTime ? new Date(msg.dateTime).getTime() : 0;
      if (ts >= lastTimestamp) {
        lastTimestamp = ts;
        lastMessage = msg;
      }

      if (msg.type === 1 && !isSeenByCurrentAdmin(msg)) {
        unreadCount++;
      }
    });

    onChange({ lastMessage, unreadCount });
  });

  return unsubscribe;
}

export async function sendMessage(userid, text, adminUser = getAdminUser()) {
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId) {
    throw new Error("Missing userid for maintenance chat message.");
  }

  const messageId = push(
    ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`)
  ).key;

  if (!messageId) {
    throw new Error("Unable to generate message id.");
  }

  const payload = {
    id: messageId,
    dateTime: new Date().toISOString(),
    content: { message: text, attachmentUrl: "" },
    status: 0,
    type: 0,
    contactId: resolvedUserId,
    sendername: adminUser?.userid || "Admin",
    replyTo: null,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  await Promise.all([
    set(
      ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}/${messageId}`),
      payload
    ),
    set(
      ref(database, `${USER_MAINTENANCE_PATH}/${resolvedUserId}/maintenance/${messageId}`),
      userPayload
    ),
  ]);

  return { message: payload };
}

export async function deleteChatHistory(userid) {
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId) {
    return { success: true };
  }

  await Promise.all([
    remove(ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`)),
    remove(ref(database, `${USER_MAINTENANCE_PATH}/${resolvedUserId}/maintenance`)),
  ]);

  return { success: true };
}

export async function deleteSpecificMessage(messageId, userid) {
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId || !messageId) {
    return { success: true };
  }

  const deletes = [
    remove(
      ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}/${messageId}`)
    ),
  ];

  if (resolvedUserId) {
    deletes.push(
      remove(
        ref(
          database,
          `${USER_MAINTENANCE_PATH}/${resolvedUserId}/maintenance/${messageId}`
        )
      )
    );
  }

  await Promise.all(deletes);

  return { success: true };
}

// Mark messages as seen/read for the current admin only (per-admin seen)
export async function markMessagesAsSeen(userid) {
  try {
    const resolvedUserId = resolveUserId(userid);
    if (!resolvedUserId) {
      return { success: true };
    }

    const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);
    const snapshot = await get(messagesRef);

    if (!snapshot.exists()) {
      return { success: true };
    }

    const messagesObject = snapshot.val();
    const updateData = {};
    const adminId = getCurrentAdminId();
    const seenTimestamp = new Date().toISOString();

    Object.keys(messagesObject).forEach((messageId) => {
      const msg = messagesObject[messageId];
      if (msg.type !== 1) return;
      if (isSeenByCurrentAdmin(msg)) return;
      const messagePath = `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}/${messageId}`;
      updateData[`${messagePath}/seenByAdmins/${adminId}`] = seenTimestamp;
      updateData[`${messagePath}/seenAt`] = seenTimestamp;
      updateData[`${messagePath}/seenBy`] = adminId;
    });

    if (Object.keys(updateData).length > 0) {
      await update(ref(database), updateData);
    }

    const lastSeenRef = ref(database, `chat/admin/maintenance/lastSeen/${resolvedUserId}`);
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
    const resolvedUserId = resolveUserId(userid);
    if (!resolvedUserId) {
      return 0;
    }

    const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);
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

// Subscribe to unread count for the current admin only (per-admin)
export function subscribeUnreadCount(userid, onChange) {
  const resolvedUserId = resolveUserId(userid);
  if (!resolvedUserId) {
    onChange(0);
    return () => {};
  }

  const messagesRef = ref(database, `${ADMIN_MAINTENANCE_PATH}/${resolvedUserId}`);

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
