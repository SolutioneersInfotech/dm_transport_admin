import {
  fetchAcknowledgementsRoute,
  createAcknowledgementRoute,
  updateAcknowledgementRoute,
  deleteAcknowledgementRoute,
  updateDocumentRoute,
  sendAcknowledgementRoute,
} from "../utils/apiRoutes";

function normalizeComparableId(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().replace(/[+\s-]/g, "");
  return normalized || null;
}

function resolveUserId(chatTarget) {
  if (chatTarget && typeof chatTarget === "object") {
    return normalizeComparableId(
      chatTarget.userid ??
        chatTarget.userId ??
        chatTarget.uid ??
        chatTarget.id ??
        null,
    );
  }

  return normalizeComparableId(chatTarget);
}

function normalizeAcknowledgementMessage(value) {
  const normalizedValue = typeof value === "string" ? value.trim() : "";
  return normalizedValue.replace(
    /^acknowledg(e)?ment\s+sent\b/i,
    "Acknowledgement",
  );
}

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

    const acknowledgements = data.chatAcknowledgement || [];
    return acknowledgements.map((item) => ({
      id: item.id,
      data: normalizeAcknowledgementMessage(item.data || item.value || ""),
      acknowledgementType: item.acknowledgementType || "",
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
    const normalizedValue = normalizeAcknowledgementMessage(value);
    const token = localStorage.getItem("adminToken");
    const res = await fetch(createAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ value: normalizedValue }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Failed to create acknowledgement");
    }

    return {
      id: data?.acknowledgement?.id || data.id || data.acknowledgementId,
    };
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
    const normalizedValue = normalizeAcknowledgementMessage(newValue);
    const token = localStorage.getItem("adminToken");
    const res = await fetch(updateAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id,
        new_value: normalizedValue,
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
 * Send acknowledgement to driver.
 * First updates the document acknowledgement, then asks backend to append chat history + push notification.
 * @param {object} document - Document object
 * @param {string} acknowledgement - Acknowledgement text
 * @param {object} options - Additional acknowledgement metadata
 * @returns {Promise<{success: boolean}>}
 */
export async function sendAcknowledgement(
  document,
  acknowledgement,
  options = {},
) {
  try {
    const token = localStorage.getItem("adminToken");
    const baseFieldKeys = [
      "id",
      "driver_name",
      "driver_image",
      "type",
      "path",
      "document_url",
      "note",
      "allowed_to_view",
      "category",
    ];
    const requestBody = baseFieldKeys.reduce((acc, key) => {
      if (document?.[key] !== undefined) acc[key] = document[key];
      return acc;
    }, {});

    const normalizedAcknowledgement =
      typeof acknowledgement === "string" ? acknowledgement.trim() : "";
    const outboundAcknowledgement =
      normalizeAcknowledgementMessage(normalizedAcknowledgement);
    const acknowledgementType =
      typeof options?.acknowledgementType === "string"
        ? options.acknowledgementType.trim()
        : "";
    const userid =
      resolveUserId(options?.chatTarget) ||
      resolveUserId(document) ||
      resolveUserId(document?.userid);

    if (!userid) {
      throw new Error("Driver user ID not found for acknowledgement send");
    }

    const updateRes = await fetch(updateDocumentRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...requestBody,
        acknowledgement: outboundAcknowledgement,
      }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      throw new Error(updateData.message || "Failed to update document");
    }

    const sendRes = await fetch(sendAcknowledgementRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userid,
        value: outboundAcknowledgement,
        acknowledgementType,
      }),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      throw new Error(sendData.message || "Failed to send acknowledgement");
    }

    return {
      success: true,
      document: updateData.document || {
        ...document,
        acknowledgement: outboundAcknowledgement,
      },
      chat: {
        msgId: sendData.msgId || null,
        historySaved: sendData.historySaved === true,
        pushSent: sendData.pushSent === true,
      },
    };
  } catch (error) {
    console.error("Failed to send acknowledgement:", error);
    throw error;
  }
}
