import { signInAnonymously } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";

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

function parseExtension(file) {
  const name = file?.name || "";
  const ext = name.includes(".") ? name.split(".").pop() : "";
  return ext || "png";
}

export async function uploadDriverImage({ file, phone }) {
  if (!file) {
    return null;
  }

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
      "[Drivers] Anonymous auth disabled; continuing without sign-in.",
      error
    );
  }

  const safePhone = String(phone || "unknown").replace(/\s+/g, "");
  const extension = parseExtension(file);
  const storageRef = ref(storage, `user_pics/${safePhone}.${extension}`);
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
}

export async function createDriver(payload) {
  const token = localStorage.getItem("adminToken");
  const response = await fetch(`${BASE_URL}/createuser`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message =
      data?.message || data?.error || text || "Failed to create driver.";
    throw new Error(message);
  }

  return data;
}
