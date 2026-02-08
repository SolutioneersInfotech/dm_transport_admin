import { signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

async function ensureAdminFirebaseAuth() {
  if (auth.currentUser) {
    return;
  }
  const token = await getAdminFirebaseCustomToken();
  await signInWithCustomToken(auth, token);
}

/**
 * Upload a chat attachment (image/video/document) to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} adminId - Admin/user ID (for path)
 * @param {string} driverId - Driver/contact ID (for path)
 * @param {Function} onProgress - Progress callback (0–1)
 * @param {Function} onError - Error callback (message string)
 * @param {Function} onComplete - Success callback (download URL)
 */
export async function uploadChatFile(file, adminId, driverId, onProgress, onError, onComplete) {
  if (!(file instanceof File)) {
    onError?.("Invalid file");
    return;
  }

  try {
    await ensureAdminFirebaseAuth();
  } catch (err) {
    const msg = err?.message || "Authentication failed";
    // Backend may return "You don't have access" when admin isn't allowed to get Firebase token
    const isAccessError = /access|permission|unauthorized|forbidden|denied/i.test(msg);
    onError?.(
      isAccessError
        ? "You don't have permission to upload files. Your account may not be allowed to use file upload—contact your administrator to enable it."
        : msg
    );
    return;
  }

  const safeName = (file.name || `file_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, "_");
  const fallbackAdminId = adminId
    ? `admin_${String(adminId).replace(/[^a-zA-Z0-9._-]/g, "_")}`
    : "admin_unknown";
  const uploaderUid = auth.currentUser?.uid || fallbackAdminId;
  console.debug("[chat upload] firebase uid:", uploaderUid);
  const path = `chat/uploads/${uploaderUid}/${driverId || "unknown"}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);
  const metadata = {
    contentType: file.type || "application/octet-stream",
    customMetadata: {
      uploadedBy: String(adminId || ""),
      driverId: String(driverId || ""),
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
      const isAccessError = /access|permission|unauthorized|forbidden|denied|storage/i.test(msg);
      onError?.(
        isAccessError
          ? "Upload denied: you don't have permission, or Storage rules may block chat uploads. Contact your administrator."
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
