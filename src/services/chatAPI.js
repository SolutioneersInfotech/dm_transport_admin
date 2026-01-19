import {
  get,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
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
  const fetchLimit = messageLimit === 1 ? 20 : messageLimit; // Fetch more if we only need 1
  
  const messagesRef = query(
    ref(database, `${ADMIN_GENERAL_PATH}/${userid}`)
  );
  
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
 * @param {string} text - Message text
 * @param {object} adminUser - Admin user object (optional, will fetch if not provided)
 * @returns {Promise<{message: object}>}
 */
export async function sendMessage(userid, text, adminUser = getAdminUser()) {
  const messageId = push(ref(database, `${ADMIN_GENERAL_PATH}/${userid}`)).key;

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
    const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return { success: true };
    }

    const messagesObject = snapshot.val();
    const updateData = {};
    const adminUser = getAdminUser();
    const adminId = adminUser?.userid || "admin";
    const seenTimestamp = new Date().toISOString();

    // Update all unread messages (type === 1, from user) to mark them as seen
    Object.keys(messagesObject).forEach((messageId) => {
      const msg = messagesObject[messageId];
      // Only mark messages from user (type === 1) that haven't been seen
      if (msg.type === 1 && !msg.seenByAdmin) {
        const messagePath = `${ADMIN_GENERAL_PATH}/${userid}/${messageId}`;
        updateData[`${messagePath}/seenByAdmin`] = true;
        updateData[`${messagePath}/seenAt`] = seenTimestamp;
        updateData[`${messagePath}/seenBy`] = adminId;
      }
    });

    if (Object.keys(updateData).length > 0) {
      // Use update to batch update all fields at once
      await update(ref(database), updateData);
    }

    // Store last seen timestamp for this user
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
 * Get unread message count for a user
 * @param {string} userid - User ID
 * @returns {Promise<number>}
 */
export async function getUnreadCount(userid) {
  try {
    const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
    const snapshot = await get(messagesRef);
    
    if (!snapshot.exists()) {
      return 0;
    }

    const messagesObject = snapshot.val();
    let unreadCount = 0;

    Object.values(messagesObject).forEach((msg) => {
      // Count messages from user (type === 1) that haven't been seen
      if (msg.type === 1 && !msg.seenByAdmin) {
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
 * Subscribe to unread count changes for a user
 * @param {string} userid - User ID
 * @param {function} onChange - Callback function called when unread count changes
 * @returns {function} Unsubscribe function
 */
export function subscribeUnreadCount(userid, onChange) {
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
  
  const unsubscribe = onValue(messagesRef, (snapshot) => {
    if (!snapshot.exists()) {
      onChange(0);
      return;
    }

    const messagesObject = snapshot.val();
    let unreadCount = 0;

    Object.values(messagesObject).forEach((msg) => {
      if (msg.type === 1 && !msg.seenByAdmin) {
        unreadCount++;
      }
    });

    onChange(unreadCount);
  });

  return unsubscribe;
}
