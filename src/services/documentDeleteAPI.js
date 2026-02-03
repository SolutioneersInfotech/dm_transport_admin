import { deleteDocumentsRoute } from "../utils/apiRoutes";

/**
 * Permanently delete documents
 * @param {object[]} documents - Document data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDocuments(documents) {
  try {
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error("Documents are required");
    }

    const payload = documents.reduce((acc, document) => {
      if (!document?.type || !document?.id) {
        return acc;
      }
      if (!acc[document.type]) {
        acc[document.type] = [];
      }
      acc[document.type].push(document.id);
      return acc;
    }, {});

    if (Object.keys(payload).length === 0) {
      throw new Error("Document type and ID are required");
    }

    const token = localStorage.getItem("adminToken");
    const res = await fetch(deleteDocumentsRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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

/**
 * Permanently delete a document
 * @param {object} document - Document data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteDocument(document) {
  return deleteDocuments([document]);
}
