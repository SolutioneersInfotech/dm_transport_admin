import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase/firebaseApp";

/**
 * Soft delete a document by marking it as deleted
 * @param {string} docType - Document type (e.g., "pick_up", "delivery", etc.)
 * @param {string} docId - Document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDocument(docType, docId) {
  try {
    if (!docType || !docId) {
      throw new Error("Document type and ID are required");
    }

    // Firestore path: documents/{docType}/uploads/{docId}
    const docRef = doc(firestore, "documents", docType, "uploads", docId);
    
    // Soft delete by setting isDeleted to "yes"
    await updateDoc(docRef, {
      isDeleted: "yes",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete document:", error);
    return {
      success: false,
      error: error.message || "Failed to delete document",
    };
  }
}
