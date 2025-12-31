import {
  maintenanceFetchUsersRoute,
  maintenanceFetchChatHistoryRoute,
  maintenanceSendChatMessageRoute,
  maintenanceDeleteChatHistoryRoute,
  maintenanceDeleteSpecificChatRoute,
} from "../utils/apiRoutes";

function getToken() {
  return localStorage.getItem("adminToken");
}

async function api(url, method = "GET", body = null) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : null,
  });

  return res.json();
}

export async function fetchUsersForChat() {
  const result = await api(maintenanceFetchUsersRoute, "GET");

  return {
    users: result?.users || [],
  };
}

export async function fetchMessages(userid) {
  return await api(maintenanceFetchChatHistoryRoute(userid), "GET");
}

export async function sendMessage(userid, text) {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"));

  return await api(maintenanceSendChatMessageRoute, "POST", {
    userid,
    message: text,
    sendername: adminUser?.userid || "Admin",
    contactid: userid,
  });
}

export async function deleteChatHistory(userid) {
  return await api(maintenanceDeleteChatHistoryRoute, "DELETE", { userid });
}

export async function deleteSpecificMessage(id) {
  return await api(maintenanceDeleteSpecificChatRoute, "DELETE", { id });
}
