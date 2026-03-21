import {
  fetchAcknowledgementsRoute,
  createAcknowledgementRoute,
  updateAcknowledgementRoute,
  deleteAcknowledgementRoute,
  updateDocumentRoute,
} from "../utils/apiRoutes";

/**
 * Fetch all acknowledgement templates
 * @returns {Promise<Array<{id: string, data: string}>>}
 */
export async function fetchAcknowledgements() {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(fetchAcknowledgementsRoute, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to fetch acknowledgements");
    }

    // Transform the response to array format
    const acknowledgements = data.chatAcknowledgement || [];
    return acknowledgements.map((item) => ({
      id: item.id,
      data: item.data || item.value || "",
    }));
  } catch (error) {
    console.error("Failed to fetch acknowledgements:", error);
    throw error;
  }
}

/**
 * Create a new acknowledgement template
 * @param {string} value - Acknowledgement text
 * @returns {Promise<{id: string}>}
 */
export async function createAcknowledgement(value) {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(createAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to create acknowledgement");
    }

    return { id: data.id || data.acknowledgementId };
  } catch (error) {
    console.error("Failed to create acknowledgement:", error);
    throw error;
  }
}

/**
 * Update an acknowledgement template
 * @param {string} id - Acknowledgement ID
 * @param {string} newValue - Updated acknowledgement text
 * @returns {Promise<{success: boolean}>}
 */
export async function updateAcknowledgement(id, newValue) {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(updateAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id,
        new_value: newValue,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to update acknowledgement");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update acknowledgement:", error);
    throw error;
  }
}

/**
 * Delete an acknowledgement template
 * @param {string} id - Acknowledgement ID
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteAcknowledgement(id) {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(deleteAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ id }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to delete acknowledgement");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete acknowledgement:", error);
    throw error;
  }
}

/**
 * Send acknowledgement to driver (updates document only; backend sends notifications)
 * @param {object} document - Document object
 * @param {string} acknowledgement - Acknowledgement text
 * @returns {Promise<{success: boolean}>}
 */
export async function sendAcknowledgement(document, acknowledgement) {
  try {
    const token = localStorage.getItem("adminToken");

    // Update document with acknowledgement
    const updateRes = await fetch(updateDocumentRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...document,
        acknowledgement,
      }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      throw new Error(updateData.message || "Failed to update document");
    }


    return { success: true, document: updateData.document || { ...document, acknowledgement } };
  } catch (error) {
    console.error("Failed to send acknowledgement:", error);
    throw error;
  }
}
