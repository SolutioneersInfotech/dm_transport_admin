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

function normalizeMessage(messageId, msg) {
  const rawDate = msg?.dateTime || msg?.datetime;
  const date = rawDate ? new Date(rawDate) : new Date();
  const dateTime = Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();

  return {
    msgId: messageId,
    id: messageId,
    dateTime,
    content: {
      message: msg?.content?.message ?? msg?.message ?? "",
      attachmentUrl: msg?.content?.attachmentUrl ?? msg?.attachmentUrl ?? "",
    },
    status: msg?.status ?? 0,
    type: typeof msg?.type === "number" ? msg.type : 0,
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
  const adminRef = ref(database, ADMIN_GENERAL_PATH);
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

  const users = contacts
    .map((contactId) => {
      const driver = driverMap.get(String(contactId));
      if (!driver) {
        return null;
      }

      return {
        userid: contactId,
        name: getDriverName(driver, contactId),
        image: getDriverImage(driver),
      };
    })
    .filter(Boolean);

  return { users };
}

export async function fetchMessages(userid) {
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);
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
  const messagesRef = ref(database, `${ADMIN_GENERAL_PATH}/${userid}`);

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

export async function deleteSpecificMessage(messageId, userid) {
  await Promise.all([
    remove(ref(database, `${ADMIN_GENERAL_PATH}/${userid}/${messageId}`)),
    remove(ref(database, `${USER_MIRROR_BASE}/${userid}/admin/${messageId}`)),
  ]);

  return { success: true };
}

export async function deleteChatHistory(userid) {
  await Promise.all([
    remove(ref(database, `${ADMIN_GENERAL_PATH}/${userid}`)),
    remove(ref(database, `${USER_MIRROR_BASE}/${userid}/admin`)),
  ]);

  return { success: true };
}
