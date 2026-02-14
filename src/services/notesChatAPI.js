import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getApps, initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import { app, firestore } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

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

function normalizeContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object") {
    if (typeof content.attachmentUrl === "string" && content.attachmentUrl.trim()) {
      return content.attachmentUrl;
    }

    if (typeof content.message === "string") {
      return content.message;
    }
  }

  return "";
}


async function writeToCollectionWithFallback(collectionName, docData) {
  const docRef = doc(collection(firestore, collectionName));

  try {
    const { firestore: adminFirestore } = await ensureAdminUploadServices();
    await setDoc(doc(adminFirestore, collectionName, docRef.id), docData);
    return;
  } catch (adminError) {
    console.warn(`[Notes] Admin write failed for ${collectionName}, falling back to primary app auth.`, adminError);
  }

  await setDoc(docRef, docData);
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
            senderAdminId: data.senderAdminId ?? "",
            senderName: data.senderName ?? "",
            content: normalizeContent(data.content),
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
  const senderAdminId = resolvedAdmin?.userid || "";
  const senderName = resolvedAdmin?.name || senderAdminId || "Admin";
  const contentValue = contentOverride ?? text ?? "";

  let senderId = senderAdminId || "admin";
  try {
    const { auth: uploadAuth } = await ensureAdminUploadServices();
    senderId = uploadAuth.currentUser?.uid || senderId;
  } catch {
    // Fall back to previous senderId when admin upload services are unavailable.
  }

  await writeToCollectionWithFallback("messages", {
    senderId,
    senderAdminId,
    senderName,
    content: contentValue,
    type,
    priority: 0,
    timestamp: serverTimestamp(),
    reactions: {},
  });

  let notificationMessage = `${senderName}: ${text ?? ""}`;
  if (type === "image") {
    notificationMessage = `${senderName} shared an image`;
  } else if (type === "video") {
    notificationMessage = `${senderName} shared a video`;
  } else if (type === "document") {
    notificationMessage = `${senderName} shared a document`;
  }

  await writeToCollectionWithFallback("Notes_notifications", {
    message: notificationMessage,
    type,
    timestamp: serverTimestamp(),
    userid: senderAdminId || senderId,
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
