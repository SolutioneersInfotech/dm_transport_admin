import { signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

async function ensureAdminFirebaseAuth() {
  const cu = auth.currentUser;
  if (cu?.uid?.startsWith("admin_")) return;

  const token = await getAdminFirebaseCustomToken();
  await signInWithCustomToken(auth, token);

  const uid = auth.currentUser?.uid;
  let claims = {};
  try {
    const tokenRes = await auth.currentUser?.getIdTokenResult(true);
    claims = tokenRes?.claims || {};
  } catch (error) {
    console.debug("[ChatUpload] failed to read token claims", error);
  }
  console.debug("[ChatUpload] signed in uid:", uid, "claims:", claims);
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
  const uploaderUid =
    auth.currentUser?.uid ||
    (adminId ? `admin_${String(adminId).replace(/\s+/g, "_")}` : "admin_unknown");
  const path = `chat/uploads/${uploaderUid}/${driverId || "unknown"}/${Date.now()}_${safeName}`;
  console.debug("[ChatUpload] uploading path:", path, "uid:", auth.currentUser?.uid);
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
    async (err) => {
      const msg = err?.message || "Upload failed";
      const code = err?.code;
      const currentUid = auth.currentUser?.uid;
      let claims;
      if (auth.currentUser) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(false);
          claims = tokenResult?.claims;
        } catch (claimErr) {
          console.debug("[chat upload] failed to read idToken claims:", claimErr);
        }
      }
      console.error("[chat upload] upload failed:", {
        code,
        message: msg,
        uid: currentUid,
        path,
        claims,
      });
      const isAccessError = /access|permission|unauthorized|forbidden|denied|storage/i.test(msg);
      onError?.(
        isAccessError
          ? `Upload denied${code ? ` (${code})` : ""}: you don't have permission, or Storage rules may block chat uploads. Contact your administrator.`
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
