import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "../firebase/firebaseApp";
import { getAdminFirebaseCustomToken } from "./adminFirebaseToken";

async function waitForAuthUser(expectedUid, timeoutMs = 5000) {
  return new Promise((resolve) => {
    let timeoutId = null;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        return;
      }
      if (!expectedUid || currentUser.uid === expectedUid) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        unsubscribe();
        resolve(currentUser);
      }
    });

    timeoutId = setTimeout(() => {
      unsubscribe();
      resolve(auth.currentUser || null);
    }, timeoutMs);
  });
}

async function ensureAdminFirebaseAuth() {
  const existingUser = auth.currentUser;
  const needsAdminSignIn = !existingUser || !existingUser.uid?.startsWith("admin_");
  let user = existingUser;
  let tokenResult;
  if (needsAdminSignIn) {
    const token = await getAdminFirebaseCustomToken();
    const credential = await signInWithCustomToken(auth, token);
    user = credential.user;
    user = await waitForAuthUser(user?.uid);
  }

  if (!user) {
    console.debug("[chat upload] firebase auth failed: no currentUser after sign-in");
    throw new Error("Firebase admin authentication failed");
  }

  tokenResult = await user.getIdTokenResult(true);
  console.debug("[chat upload] firebase auth uid/claims:", {
    uid: user.uid,
    claims: tokenResult?.claims,
  });
  return { user, tokenResult };
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

  let authContext;
  try {
    authContext = await ensureAdminFirebaseAuth();
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
  const uploaderUid = authContext?.user?.uid || auth.currentUser?.uid || fallbackAdminId;
  if (auth.currentUser?.uid && authContext?.user?.uid && auth.currentUser.uid !== authContext.user.uid) {
    console.warn("[chat upload] auth uid mismatch:", {
      authUid: auth.currentUser.uid,
      contextUid: authContext.user.uid,
    });
  }
  console.debug("[chat upload] firebase uid:", uploaderUid);
  const path = `chat/uploads/${uploaderUid}/${driverId || "unknown"}/${Date.now()}_${safeName}`;
  if (authContext?.tokenResult) {
    console.debug("[chat upload] upload path/claims:", {
      path,
      claims: authContext.tokenResult.claims,
    });
  }
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
      let claims = authContext?.tokenResult?.claims;
      if (auth.currentUser && !claims) {
        try {
          const tokenResult = await auth.currentUser.getIdTokenResult(true);
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
          ? `Upload denied (${code || "unknown"}): you don't have permission, or Storage rules may block chat uploads. Contact your administrator.`
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
