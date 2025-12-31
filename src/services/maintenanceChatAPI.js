import {
  get,
  push,
  ref,
  remove,
  set,
} from "firebase/database";
import { database } from "../firebase/firebaseApp";

const ADMIN_MAINTENANCE_PATH = "chat/users/admin/maintenance";
const USER_MAINTENANCE_PATH = "chat/users";
const USERS_PATH = "users";
const DRIVERS_PATH = "drivers";
const CONFIG_PATH = "configuration";

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

function getDriverNameFromMessages(messages, fallback) {
  for (const msg of messages) {
    if (msg?.driver_name) {
      return msg.driver_name;
    }
    if (msg?.type === 0 && msg?.sendername && msg.sendername !== "Admin") {
      return msg.sendername;
    }
  }

  return fallback;
}

async function fetchDriverProfile(contactId) {
  const profilePaths = [
    `${USERS_PATH}/${contactId}`,
    `${DRIVERS_PATH}/${contactId}`,
  ];

  for (const path of profilePaths) {
    const snapshot = await get(ref(database, path));
    if (snapshot.exists()) {
      return snapshot.val();
    }
  }

  return null;
}

function getDriverImage(profile) {
  return (
    profile?.profilePic ||
    profile?.image ||
    profile?.photoUrl ||
    profile?.avatar ||
    null
  );
}

function getDriverName(profile) {
  return (
    profile?.name ||
    profile?.driver_name ||
    profile?.fullName ||
    profile?.username ||
    null
  );
}

export async function fetchUsersForChat() {
  const adminRef = ref(database, ADMIN_MAINTENANCE_PATH);
  const snapshot = await get(adminRef);
  const threads = snapshot.exists() ? snapshot.val() : {};

  const contacts = Object.keys(threads || {});

  if (contacts.length === 0) {
    return { users: [] };
  }

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
    const profile = await fetchDriverProfile(contactId);
    const profileName = getDriverName(profile);

    users.push({
      userid: contactId,
      driver_name:
        profileName || getDriverNameFromMessages(sortedMessages, contactId),
      driver_image: getDriverImage(profile),
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
