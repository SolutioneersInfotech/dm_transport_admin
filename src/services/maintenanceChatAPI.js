const BASE_URL =
  import.meta.env.VITE_DM_BACKEND_URL ??
  "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/dm_backend";

function getToken() {
  return localStorage.getItem("adminToken");
}

async function api(url, method = "GET", body = null) {
  const res = await fetch(`${BASE_URL}/${url}`, {
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
  const result = await api("fetchusers", "GET");

  return {
    users: result?.users || [],
  };
}

export async function fetchMessages(userid) {
  return await api(`fetchchathistory?userid=${userid}`, "GET");
}

export async function sendMessage(userid, text) {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"));

  return await api("sendchatmessage", "POST", {
    userid,
    message: text,
    sendername: adminUser?.userid || "Admin",
    contactid: userid,
  });
}

export async function deleteChatHistory(userid) {
  return await api("deletechathistory", "DELETE", { userid });
}

export async function deleteSpecificMessage(id) {
  return await api("deletespecificchats", "DELETE", { id });
}
