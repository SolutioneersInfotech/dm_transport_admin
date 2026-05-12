import { baseBackendUrl, broadcastRoute } from "../utils/apiRoutes";
import { get, ref, push, set, remove } from "firebase/database";
import { database } from "../firebase/firebaseApp";

const BROADCAST_HISTORY_PATH = "broadcastHistory";

function getToken() {
  return localStorage.getItem("adminToken");
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser")) || {};
  } catch {
    return {};
  }
}

/**
 * Sends a broadcast message to specified recipients
 * @param {string} recipientType - 'all', 'drivers', or 'admins'
 * @param {string} message - The broadcast message
 * @param {Array} drivers - Array of driver objects
 * @param {Array} admins - Array of admin objects
 * @param {Array<string>} selectedDriverIds - Selected driver IDs
 * @param {Array<string>} selectedAdminIds - Selected admin IDs
 * @returns {Promise} Result of broadcast send
 */
export async function sendBroadcast(
  recipientType,
  message,
  drivers = [],
  admins = [],
  selectedDriverIds = [],
  selectedAdminIds = [],
  attachmentOptions = {}
) {
  try {
    const adminUser = getAdminUser();
    console.log(adminUser);
    const adminName = adminUser?.userid || "Admin";
    const messageText = typeof message === "string" ? message.trim() : String(message ?? "").trim();
    const attachmentUrl =
      typeof attachmentOptions?.attachmentUrl === "string" && attachmentOptions.attachmentUrl.trim()
        ? attachmentOptions.attachmentUrl.trim()
        : "";
    const attachmentName =
      typeof attachmentOptions?.attachmentName === "string" && attachmentOptions.attachmentName.trim()
        ? attachmentOptions.attachmentName.trim()
        : "";
    const attachmentMimeType =
      typeof attachmentOptions?.attachmentMimeType === "string" && attachmentOptions.attachmentMimeType.trim()
        ? attachmentOptions.attachmentMimeType.trim()
        : "";

    if (!messageText && !attachmentUrl) {
      throw new Error("Broadcast must include a message or attachment");
    }

    const validTypes = ["all", "drivers", "admins"];
    const type = recipientType?.trim();

    if (!validTypes.includes(type)) {
      throw new Error("Invalid recipient type");
    }

    // Build userids array based on recipient type and selections
    let userids = [];
    let recipientNames = [];

    if (type === "all") {
      const selectedDriverIdSet = new Set(selectedDriverIds.filter(Boolean));
      const selectedAdminIdSet = new Set(selectedAdminIds.filter(Boolean));
      userids = [...selectedDriverIdSet, ...selectedAdminIdSet];

      const driverNames = drivers
        .filter((d) => selectedDriverIdSet.has(d?.userid ?? d?.id))
        .map((d) => d?.name || d?.driver_name || "Unknown")
        .filter(Boolean);
      const adminNames = admins
        .filter((a) => selectedAdminIdSet.has(a?.userid ?? a?.id))
        .map((a) => a?.name || a?.username || "Unknown")
        .filter(Boolean);
      recipientNames = [...driverNames, ...adminNames];
    } else if (type === "drivers") {
      // Only selected drivers
      userids = selectedDriverIds.filter(Boolean);
      recipientNames = drivers
        .filter((d) => selectedDriverIds.includes(d?.userid ?? d?.id))
        .map((d) => d?.name || d?.driver_name || "Unknown")
        .filter(Boolean);
    } else if (type === "admins") {
      // Only selected admins
      userids = selectedAdminIds.filter(Boolean);
      recipientNames = admins
        .filter((a) => selectedAdminIds.includes(a?.userid ?? a?.id))
        .map((a) => a?.name || a?.username || "Unknown")
        .filter(Boolean);
    }

    if (userids.length === 0) {
      throw new Error("No recipients selected");
    }

    const payload = {
      userids,
      message: messageText,
      sendername: adminName,
      attachmentUrl,
      attachmentName,
      attachmentMimeType,
      type: "broadcast",
    };

    const response = await fetch(broadcastRoute, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData}`);
    }

    const data = await response.json();

    // Store broadcast in Firebase history for tracking
    const historyRef = ref(database, BROADCAST_HISTORY_PATH);
    const newHistoryRef = push(historyRef);
    
    const broadcastRecord = {
      userids,
      message: messageText,
      sendername: adminName,
      recipientType: type,
      recipientNames,
      attachmentUrl,
      attachmentName,
      attachmentMimeType,
      type: "broadcast",
      timestamp: new Date().toISOString(),
      broadcastId: newHistoryRef.key,
    };

    await set(newHistoryRef, broadcastRecord);

    return {
      success: true,
      message: "Broadcast sent successfully",
      broadcast: data,
    };
  } catch (error) {
    console.error("Error sending broadcast:", error);
    throw error;
  }
}

/**
 * Fetches all broadcast history from Firebase
 * @returns {Promise<Array>} Array of broadcasts
 */
export async function fetchBroadcastHistory() {
  try {
    const historyRef = ref(database, BROADCAST_HISTORY_PATH);
    const snapshot = await get(historyRef);

    if (!snapshot.exists()) {
      return [];
    }

    const data = snapshot.val();
    const broadcasts = [];

    for (const [key, value] of Object.entries(data)) {
      broadcasts.push({
        id: key,
        ...value,
      });
    }

    // Sort by timestamp descending (most recent first)
    broadcasts.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });

    return broadcasts;
  } catch (error) {
    console.error("Error fetching broadcast history:", error);
    return [];
  }
}

/**
 * Subscribes to broadcast history changes (Optional - for future real-time updates)
 * @param {Function} callback - Called with updated broadcasts
 * @returns {Function} Unsubscribe function
 */
export function subscribeToBroadcastHistory(callback) {
  try {
    // For now, return a no-op unsubscribe function
    // This can be enhanced later for real-time updates if needed
    return () => {};
  } catch (error) {
    console.error("Error subscribing to broadcast history:", error);
    throw error;
  }
}

/**
 * Delete a broadcast history record
 * @param {string} broadcastId - The broadcast ID to delete
 * @returns {Promise<{success: boolean}>}
 */
// export async function deleteBroadcast(broadcastId) {
//   try {
//     if (!broadcastId) {
//       throw new Error("Broadcast ID is required");
//     }

//     // Delete from Firebase history
//     await remove(ref(database, `${BROADCAST_HISTORY_PATH}/${broadcastId}`));

//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting broadcast:", error);
//     throw error;
//   }
// }

export async function deleteBroadcast(broadcastId) {
  try {
    if (!broadcastId) {
      throw new Error("Broadcast ID is required");
    }

    const token = getToken();

    if (!token) {
      throw new Error("User not authenticated");
    }

    const response = await fetch(
      `${baseBackendUrl}/deletebroadcastmessage/${broadcastId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    console.log("Backend delete response:", data);

    if (!response.ok) {
      throw new Error(data?.message || "Failed to delete broadcast");
    }

    // Delete from Firebase history
    await remove(ref(database, `${BROADCAST_HISTORY_PATH}/${broadcastId}`));

    return { success: true };
  } catch (error) {
    console.error("Error deleting broadcast:", error);
    throw error;
  }
}
