import { signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

async function ensureAdminFirebaseAuth() {
  const currentUser = auth.currentUser;
  if (currentUser?.uid?.startsWith("admin_")) {
    return;
  }

  const token = await getAdminFirebaseCustomToken();
  await signInWithCustomToken(auth, token);
}

export async function uploadBroadcastFile(
  file,
  adminId,
  recipientType,
  onProgress,
  onError,
  onComplete
) {
  if (!(file instanceof File)) {
    onError?.("Invalid file");
    return;
  }

  try {
    await ensureAdminFirebaseAuth();
  } catch (err) {
    const msg = err?.message || "Authentication failed";
    const isAccessError = /access|permission|unauthorized|forbidden|denied/i.test(msg);
    onError?.(
      isAccessError
        ? "You don't have permission to upload files. Contact your administrator to enable uploads."
        : msg
    );
    return;
  }

  const safeName = (file.name || `file_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const uploaderUid =
    auth.currentUser?.uid ||
    (adminId ? `admin_${String(adminId).replace(/\s+/g, "_")}` : "admin_unknown");
  const scope = String(recipientType || "all").replace(/[^a-zA-Z0-9_-]/g, "_") || "all";
  const path = `broadcast/uploads/${uploaderUid}/${scope}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      uploadedBy: String(adminId || ""),
      recipientType: scope,
    },
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      const progress = snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0;
      onProgress?.(progress);
    },
    (err) => {
      const msg = err?.message || "Upload failed";
      const code = err?.code;
      const isAccessError = /access|permission|unauthorized|forbidden|denied|storage/i.test(msg);
      onError?.(
        isAccessError
          ? `Upload denied${code ? ` (${code})` : ""}: Storage rules may block broadcast uploads.`
          : code
            ? `${msg} (${code})`
            : msg
      );
    },
    async () => {
      try {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        onComplete?.(url);
      } catch (err) {
        onError?.(err?.message || "Failed to get download URL");
      }
    }
  );
}
