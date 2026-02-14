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
import { signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import * as firebaseApp from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

const PRIORITY_FILTERS = {
  all: () => true,
  high: (priority) => priority === 3,
  medium: (priority) => priority === 2,
  low: (priority) => priority === 1,
};

const { firestore, storage } = firebaseApp;

async function ensureAdminFirebaseAuth() {
  const { auth } = firebaseApp;

  if (auth.currentUser && auth.currentUser.uid.startsWith("admin_")) {
    await auth.currentUser.getIdToken(true);
    return auth.currentUser.uid;
  }

  const token = await getAdminFirebaseCustomToken();

  const userCredential = await signInWithCustomToken(auth, token);

  if (!userCredential?.user) {
    throw new Error("Firebase admin sign-in failed");
  }

  await userCredential.user.getIdToken(true);

  if (!userCredential.user.uid.startsWith("admin_")) {
    throw new Error("Firebase UID is not admin_ prefixed");
  }

  console.log("[AdminAuth] Signed in as:", userCredential.user.uid);

  return userCredential.user.uid;
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
  contentPathOverride,
  adminUser,
}) => {
  const firebaseUid = await ensureAdminFirebaseAuth();
  const resolvedAdmin = adminUser || getAdminUser() || {};
  const senderId = firebaseUid;
  const senderName = resolvedAdmin?.name || senderId || "Admin";
  const contentValue = contentOverride ?? text ?? "";

  if (import.meta.env.DEV) {
    console.log(
      "[NotesSend] uid:",
      firebaseUid,
      "senderId:",
      senderId,
      "businessAdminId:",
      resolvedAdmin?.userid,
      "type:",
      type,
      "hasContent:",
      Boolean(contentValue)
    );
  }

  let messageRef;
  try {
    messageRef = await addDoc(collection(firestore, "messages"), {
      senderId,
      senderName,
      content: contentValue,
      type,
      priority: 0,
      timestamp: serverTimestamp(),
      reactions: {},
    });
  } catch (error) {
    const code = error?.code || "";
    const msg = error?.message || "";
    const canRetryWithPath =
      type !== "text" &&
      typeof contentPathOverride === "string" &&
      Boolean(contentPathOverride) &&
      /^https?:\/\//i.test(contentValue) &&
      (code === "permission-denied" || /insufficient permissions|permission-denied/i.test(msg));

    if (!canRetryWithPath) {
      throw error;
    }

    console.warn("[NotesSend] URL payload denied, retrying with storage path content", {
      code,
      message: msg,
      contentPathOverride,
    });

    messageRef = await addDoc(collection(firestore, "messages"), {
      senderId,
      senderName,
      content: contentPathOverride,
      type,
      priority: 0,
      timestamp: serverTimestamp(),
      reactions: {},
    });
  }

  if (import.meta.env.DEV) {
    console.log("[NotesSend] message persisted id:", messageRef.id);
  }

  let notificationMessage = `${senderName}: ${text ?? ""}`;
  if (type === "image") {
    notificationMessage = `${senderName} shared an image`;
  } else if (type === "video") {
    notificationMessage = `${senderName} shared a video`;
  } else if (type === "document") {
    notificationMessage = `${senderName} shared a document`;
  }

  try {
    await addDoc(collection(firestore, "Notes_notifications"), {
      message: notificationMessage,
      type,
      timestamp: serverTimestamp(),
      userid: senderId,
    });
  } catch (error) {
    // Keep message persistence successful even if notifications write is blocked by rules.
    console.warn("[NotesSend] notification write failed", error);
  }

  if (import.meta.env.DEV) {
    console.log("[NotesSend] persisted with senderId:", senderId);
  }

  return messageRef.id;
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

  const uploaderUid = await ensureAdminFirebaseAuth();

  if (!uploaderUid) {
    throw new Error("Upload blocked: Firebase auth missing");
  }

  const safeName = (file.name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const normalizedType = ["image", "video", "document"].includes(type)
    ? type
    : "document";
  const storagePath = `chat/uploads/${uploaderUid}/notes/${normalizedType}_${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const task = uploadBytesResumable(storageRef, file);
  await task;
  const url = await getDownloadURL(storageRef);

  if (import.meta.env.DEV) {
    console.log("[NotesUpload] path:", storagePath, "url:", url);
  }

  return {
    url,
    path: storagePath,
    name: file.name || "file",
    contentType: file.type || "application/octet-stream",
  };
};
