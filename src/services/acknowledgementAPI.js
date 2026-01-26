import {
  fetchAcknowledgementsRoute,
  createAcknowledgementRoute,
  updateAcknowledgementRoute,
  deleteAcknowledgementRoute,
  sendPushNotificationRoute,
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
 * Send push notification to driver
 * @param {string} userId - Driver user ID
 * @param {string} message - Notification message
 * @returns {Promise<{success: boolean}>}
 */
export async function sendPushNotification(userId, message) {
  try {
    const token = localStorage.getItem("adminToken");
    const res = await fetch(sendPushNotificationRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        message,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to send push notification");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}

/**
 * Send acknowledgement to driver (updates document and sends notification)
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

    // Send push notification to driver
    // Try to get userId from various possible fields
    const userId = 
      document.userid || 
      document.userId || 
      document.driver_id || 
      document.driverId ||
      document.driver_userid ||
      document.driver_userId ||
      null;
      
    if (userId) {
      const notificationMessage = `Acknowledgement: ${acknowledgement.substring(0, 50)}${acknowledgement.length > 50 ? "..." : ""}`;
      try {
        await sendPushNotification(userId, notificationMessage);
      } catch (notifError) {
        // Log but don't fail if notification fails
        console.warn("Failed to send push notification:", notifError);
      }
    }

    return { success: true, document: updateData.document || { ...document, acknowledgement } };
  } catch (error) {
    console.error("Failed to send acknowledgement:", error);
    throw error;
  }
}
