import {
  get,
  limitToLast,
  onValue,
  push,
  query,
  ref,
  remove,
  set,
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

function normalizeMessage(messageId, message) {
  const type =
    message?.type === 0 ? 1 :
    message?.type === 1 ? 0 :
    message?.type;

  return {
    ...message,
    msgId: message?.msgId || message?.id || messageId,
    id: message?.id || messageId,
    type,
  };
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

export async function fetchMessages(userid) {
  const messagesRef = query(
    ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}`),
    limitToLast(100)
  );
  const snapshot = await get(messagesRef);
  const messagesObject = snapshot.exists() ? snapshot.val() : {};

  const messages = sortByDateTimeAsc(
    Object.entries(messagesObject).map(([id, msg]) =>
      normalizeMessage(id, msg)
    )
  );

  return { messages };
}

export function subscribeMessages(userid, onChange) {
  const messagesRef = query(
    ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}`),
    limitToLast(100)
  );

  const unsubscribe = onValue(messagesRef, (snapshot) => {
    const messagesObject = snapshot.exists() ? snapshot.val() : {};
    const messages = sortByDateTimeAsc(
      Object.entries(messagesObject || {}).map(([id, msg]) =>
        normalizeMessage(id, msg)
      )
    );

    onChange(messages);
  });

  return unsubscribe;
}

export async function sendMessage(userid, text, adminUser = getAdminUser()) {
  const messageId = push(
    ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}`)
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
    contactId: userid,
    sendername: adminUser?.userid || "Admin",
    replyTo: null,
  };

  const userPayload = {
    ...payload,
    type: 1,
  };

  await Promise.all([
    set(
      ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}/${messageId}`),
      payload
    ),
    set(
      ref(database, `${USER_MAINTENANCE_PATH}/${userid}/maintenance/${messageId}`),
      userPayload
    ),
  ]);

  return { message: payload };
}

export async function deleteChatHistory(userid) {
  await Promise.all([
    remove(ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}`)),
    remove(ref(database, `${USER_MAINTENANCE_PATH}/${userid}/maintenance`)),
  ]);

  return { success: true };
}

export async function deleteSpecificMessage(messageId, userid) {
  const deletes = [
    remove(
      ref(database, `${ADMIN_MAINTENANCE_PATH}/${userid}/${messageId}`)
    ),
  ];

  if (userid) {
    deletes.push(
      remove(
        ref(
          database,
          `${USER_MAINTENANCE_PATH}/${userid}/maintenance/${messageId}`
        )
      )
    );
  }

  await Promise.all(deletes);

  return { success: true };
}
