import {
  get,
  onValue,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import { database } from "../firebase/firebaseApp";

const ADMIN_MAINTENANCE_PATH = "chat/users/admin/maintenance";
const USER_MAINTENANCE_PATH = "chat/users";
const CONFIG_PATH = "configuration";
const FETCH_USERS_URL =
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin/fetchUsers";

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  return JSON.parse(localStorage.getItem("adminUser"));
}

function getDriverId(driver) {
  return (
    driver?.userid ||
    driver?.userId ||
    driver?.contactId ||
    driver?.contactid ||
    driver?.id ||
    null
  );
}

function getDriverName(driver, fallback) {
  return (
    driver?.name ||
    driver?.driver_name ||
    driver?.fullName ||
    driver?.username ||
    fallback
  );
}

function getDriverImage(driver) {
  return (
    driver?.image ||
    driver?.profilePic ||
    driver?.photoUrl ||
    driver?.avatar ||
    null
  );
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

async function fetchDriverDirectory() {
  const token = getToken();
  const response = await fetch(FETCH_USERS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch driver directory.");
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data;
  }

  return data?.users || data?.drivers || [];
}

export async function fetchUsersForChat() {
  const adminRef = ref(database, ADMIN_MAINTENANCE_PATH);
  const snapshot = await get(adminRef);
  const threads = snapshot.exists() ? snapshot.val() : {};

  const contacts = Object.keys(threads || {});

  if (contacts.length === 0) {
    return { users: [] };
  }

  let drivers = [];
  try {
    drivers = await fetchDriverDirectory();
  } catch {
    drivers = [];
  }

  const driverMap = new Map(
    drivers
      .map((driver) => {
        const driverId = getDriverId(driver);
        return driverId ? [String(driverId), driver] : null;
      })
      .filter(Boolean)
  );

  const users = [];

  for (const contactId of contacts) {
    const showChatSnapshot = await get(
      ref(database, `${CONFIG_PATH}/${contactId}/showMaintenanceChat`)
    );
    const isVisible = showChatSnapshot.val();

    if (!isVisible) {
      continue;
    }

    const messagesObject = threads?.[contactId] || {};
    const messages = Object.entries(messagesObject).map(([id, msg]) =>
      normalizeMessage(id, msg)
    );

    const sortedMessages = sortByDateTimeAsc(messages);
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const driver = driverMap.get(String(contactId));

    users.push({
      userid: contactId,
      name: getDriverName(driver, contactId),
      image: getDriverImage(driver),
      last_message: lastMessage?.content?.message || "",
      last_chat_time: lastMessage?.dateTime || null,
    });
  }

  return { users };
}

export async function fetchMessages(userid) {
  const messagesRef = ref(
    database,
    `${ADMIN_MAINTENANCE_PATH}/${userid}`
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
  const messagesRef = ref(
    database,
    `${ADMIN_MAINTENANCE_PATH}/${userid}`
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
