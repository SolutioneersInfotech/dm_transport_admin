import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, firestore, storage } from "../firebase/firebaseApp";

const PRIORITY_FILTERS = {
  all: () => true,
  high: (priority) => priority === 3,
  medium: (priority) => priority === 2,
  low: (priority) => priority === 1,
};

let authPromise = null;

async function ensureAnonymousAuth() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (!authPromise) {
    authPromise = signInAnonymously(auth).catch((error) => {
      authPromise = null;
      throw error;
    });
  }

  const credential = await authPromise;
  return credential.user;
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser"));
  } catch {
    return null;
  }
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

  await addDoc(collection(firestore, "messages"), {
    senderId,
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

  await addDoc(collection(firestore, "Notes_notifications"), {
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
  void type;
  try {
    await ensureAnonymousAuth();
  } catch (error) {
    const errorCode = error?.code || "";
    const errorMessage = error?.message || "";
    const isAdminOnly =
      errorCode === "auth/admin-restricted-operation" ||
      errorMessage.includes("ADMIN_ONLY_OPERATION");

    if (!isAdminOnly) {
      throw error;
    }

    console.warn(
      "[Notes] Anonymous auth disabled; continuing without sign-in.",
      error
    );
  }
  const safeName = file?.name || "file";
  const storageRef = ref(storage, `uploads/${Date.now()}_${safeName}`);
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
