import { signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

async function ensureAdminFirebaseAuth() {
  if (auth.currentUser) {
    return;
  }

  const token = await getAdminFirebaseCustomToken();
  await signInWithCustomToken(auth, token);
}

export async function uploadDriverProfilePhoto({ phone, file }) {
  if (!phone || !String(phone).trim()) {
    throw new Error("Enter phone first to upload photo");
  }

  if (!(file instanceof File)) {
    return null;
  }

  await ensureAdminFirebaseAuth();

  const currentUser = auth.currentUser;
  const uploaderUid = currentUser?.uid ?? "anonymous-admin";
  const safePhone =
    (phone && String(phone).replace(/\D/g, "").trim()) || "unknown";

  const path = `chat/uploads/${uploaderUid}/${safePhone}/profile_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });

  return getDownloadURL(storageRef);
}
