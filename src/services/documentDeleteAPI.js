import { deleteDocumentRoute } from "../utils/apiRoutes";

/**
 * Permanently delete a document
 * @param {object} document - Document data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDocument(document) {
  try {
    if (!document?.type || !document?.id) {
      throw new Error("Document type and ID are required");
    }

    const token = localStorage.getItem("adminToken");
    const res = await fetch(deleteDocumentRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        document_id: document.id,
        type: document.type,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete document");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete document:", error);
    return {
      success: false,
      error: error.message || "Failed to delete document",
    };
  }
}
