import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { app, firestore } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

const adminRawBase =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api";

const ADMIN_BASE_URL = adminRawBase.replace(/\/+$/, "");

const PRIORITY_FILTERS = {
  all: () => true,
  high: (priority) => priority === 3,
  medium: (priority) => priority === 2,
  low: (priority) => priority === 1,
};

let authPromise = null;
let notesUploadServices = null;

function getOrCreateNotesUploadApp() {
  const appName = "notes-upload";
  const existing = getApps().find((entry) => entry.name === appName);
  if (existing) {
    return existing;
  }

  return initializeApp(app.options, appName);
}

async function ensureAdminUploadServices() {
  if (notesUploadServices) {
    return notesUploadServices;
  }

  if (!authPromise) {
    authPromise = (async () => {
      const uploadApp = getOrCreateNotesUploadApp();
      const uploadAuth = getAuth(uploadApp);

      if (!uploadAuth.currentUser?.uid?.startsWith("admin_")) {
        const token = await getAdminFirebaseCustomToken();
        await signInWithCustomToken(uploadAuth, token);
      }

      notesUploadServices = {
        app: uploadApp,
        auth: uploadAuth,
        storage: getStorage(uploadApp),
        firestore: getFirestore(uploadApp),
      };

      return notesUploadServices;
    })().catch((error) => {
      authPromise = null;
      throw error;
    });
  }

  return authPromise;
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser"));
  } catch {
    return null;
  }
}

function parseResponseText(text) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function sendNotesMessageViaBackend(payload) {
  const adminToken = localStorage.getItem("adminToken");

  if (!adminToken) {
    throw new Error("Missing admin token for sending notes message.");
  }

  const response = await fetch(`${ADMIN_BASE_URL}/admin/notes/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  const data = parseResponseText(text);

  if (!response.ok) {
    const message =
      data?.message || data?.error || text || "Failed to send notes message.";
    throw new Error(message);
  }

  return data;
}

export const subscribeNotesMessages = ({
  onChange,
  onError,
  priorityFilter = "all",
}) => {
  const messagesQuery = query(
    collection(firestore, "messages"),
    orderBy("timestamp", "asc")
  );

  const filterFn = PRIORITY_FILTERS[priorityFilter] || PRIORITY_FILTERS.all;

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const messages = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data() ?? {};
          const timestamp =
            data.timestamp && typeof data.timestamp.toDate === "function"
              ? data.timestamp.toDate()
              : null;

          return {
            id: docSnapshot.id,
            senderId: data.senderId ?? "",
            senderName: data.senderName ?? "",
            content: data.content ?? "",
            type: data.type ?? "text",
            priority: typeof data.priority === "number" ? data.priority : 0,
            timestamp,
            reactions: data.reactions ?? {},
          };
        })
        .filter((message) => filterFn(message.priority));

      onChange(messages);
    },
    (error) => {
      console.error("[Notes] subscribe error", error);
      if (onError) {
        onError(error);
      }
    }
  );
};

export const sendNotesMessage = async ({
  text,
  type = "text",
  contentOverride,
  adminUser,
}) => {
  const resolvedAdmin = adminUser || getAdminUser() || {};
  const senderId = resolvedAdmin?.userid || "admin";
  const senderName = resolvedAdmin?.name || senderId || "Admin";
  const contentValue = contentOverride ?? text ?? "";
  const payload = {
    senderId,
    senderName,
    content: contentValue,
    type,
    priority: 0,
  };

  await sendNotesMessageViaBackend(payload);

  const { firestore: adminFirestore } = await ensureAdminUploadServices();

  let notificationMessage = `${senderName}: ${text ?? ""}`;
  if (type === "image") {
    notificationMessage = `${senderName} shared an image`;
  } else if (type === "video") {
    notificationMessage = `${senderName} shared a video`;
  } else if (type === "document") {
    notificationMessage = `${senderName} shared a document`;
  }

  await addDoc(collection(adminFirestore, "Notes_notifications"), {
    message: notificationMessage,
    type,
    timestamp: serverTimestamp(),
    userid: senderId,
  });
};

export const deleteNotesMessage = async (messageId) => {
  if (!messageId) {
    return;
  }

  await deleteDoc(doc(firestore, "messages", messageId));
};

export const updateNotesMessagePriority = async (messageId, priorityValue) => {
  if (!messageId) {
    return;
  }

  await updateDoc(doc(firestore, "messages", messageId), {
    priority: priorityValue,
  });
};

export const addReaction = async ({ messageId, emoji, userId }) => {
  if (!messageId || !emoji || !userId) {
    return;
  }

  const messageRef = doc(firestore, "messages", messageId);

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    const data = snapshot.data() ?? {};
    const reactions = { ...(data.reactions ?? {}) };
    const currentUsers = Array.isArray(reactions[emoji])
      ? [...reactions[emoji]]
      : [];

    if (!currentUsers.includes(userId)) {
      currentUsers.push(userId);
    }

    reactions[emoji] = currentUsers;

    transaction.update(messageRef, { reactions });
  });
};

export const uploadNotesAttachment = async (file, type) => {
  if (!(file instanceof File)) {
    throw new Error("Invalid file");
  }

  const { auth: uploadAuth, storage: uploadStorage } =
    await ensureAdminUploadServices();

  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const normalizedType = ["image", "video", "document"].includes(type)
    ? type
    : "document";
  const uploaderUid = uploadAuth.currentUser?.uid || "admin_unknown";
  const storageRef = ref(
    uploadStorage,
    `chat/uploads/${uploaderUid}/notes/${normalizedType}_${Date.now()}_${safeName}`
  );
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};
