



// const BASE_URL =
//   "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin";

// // Always get latest token
// function getToken() {
//   return localStorage.getItem("adminToken");
// }

// async function api(url, method = "GET", body = null) {
//   const res = await fetch(`${BASE_URL}/${url}`, {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${getToken()}`,
//     },
//     body: body ? JSON.stringify(body) : null,
//   });

//   return res.json();
// }

// /* ------------------------------------------------------------------
//     🔹 1. Fetch ALL DRIVERS / USERS for Chat (Correct List)
// ------------------------------------------------------------------ */
// export async function fetchUsersForChat() {
//   return await api("fetchusers", "GET");
// }

// /* ------------------------------------------------------------------
//     🔹 2. Acknowledgement settings (OLD - not used for chat list)
// ------------------------------------------------------------------ */
// export async function fetchDrivers() {
//   return await api("fetchchatacknowledgement", "GET");
// }

// /* ------------------------------------------------------------------
//     🔹 3. Fetch chat messages with a driver
// ------------------------------------------------------------------ */
// export async function fetchMessages(userid) {
//   return await api(`fetchchathistory?userid=${userid}`, "GET");
// }

// /* ------------------------------------------------------------------
//     🔹 4. Send message to driver
// ------------------------------------------------------------------ */
// export async function sendMessage(userid, text) {
//   return await api(`createchatacknowledgement`, "POST", {
//     userid,
//     message: text,
//   });
// }

// /* ------------------------------------------------------------------
//     🔹 5. Delete full chat history
// ------------------------------------------------------------------ */
// export async function deleteChatHistory(userid) {
//   return await api("deletechathistory", "DELETE", { userid });
// }

// /* ------------------------------------------------------------------
//     🔹 6. Delete single message
// ------------------------------------------------------------------ */
// export async function deleteSpecificMessage(id) {
//   return await api("deletespecificchats", "DELETE", { id });
// }


// const BASE_URL =
//   "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin";

// // Always get latest token
// function getToken() {
//   return localStorage.getItem("adminToken");
// }

// async function api(url, method = "GET", body = null) {
//   const res = await fetch(`${BASE_URL}/${url}`, {
//     method,
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: `Bearer ${getToken()}`,
//     },
//     body: body ? JSON.stringify(body) : null,
//   });

//   return res.json();
// }

// /* ------------------------------------------------------------------
//     1️⃣ Fetch all drivers/users for chat
//     (Chat list → show all drivers)
// ------------------------------------------------------------------ */
// export async function fetchUsersForChat() {
//   const result = await api("fetchusers", "GET");

//   return {
//     users: result?.users || [],
//   };
// }

// /* ------------------------------------------------------------------
//     2️⃣ Fetch Chat Messages (NEW Controller)
// ------------------------------------------------------------------ */
// export async function fetchMessages(userid) {
//   return await api(`fetchchathistory?userid=${userid}`, "GET");
// }

// /* ------------------------------------------------------------------
//     3️⃣ Send Message to Driver (NEW Controller)
//     ✔ backend expects → { userid, message }
// ------------------------------------------------------------------ */
// export async function sendMessage(userid, text) {
//   return await api("sendchatmessage", "POST", {
//     userid,
//     message: text, // 👈 corrected key (backend expects “message”)
//   });
// }

// /* ------------------------------------------------------------------
//     4️⃣ Delete complete chat history (existing endpoint)
// ------------------------------------------------------------------ */
// export async function deleteChatHistory(userid) {
//   return await api("deletechathistory", "DELETE", { userid });
// }

// /* ------------------------------------------------------------------
//     5️⃣ Delete single message (existing endpoint)
// ------------------------------------------------------------------ */
// export async function deleteSpecificMessage(id) {
//   return await api("deletespecificchats", "DELETE", { id });
// }


const BASE_URL =
  "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin";

// Always get latest token
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

/* ------------------------------------------------------------------
    1️⃣ Fetch all drivers/users for chat
------------------------------------------------------------------ */
export async function fetchUsersForChat() {
  const result = await api("fetchusers", "GET");

  return {
    users: result?.users || [],
  };
}

/* ------------------------------------------------------------------
    2️⃣ Fetch Chat Messages
------------------------------------------------------------------ */
export async function fetchMessages(userid) {
  return await api(`fetchchathistory?userid=${userid}`, "GET");
}

/* ------------------------------------------------------------------
    3️⃣ Send Message (UPDATED to include sendername)
------------------------------------------------------------------ */
export async function sendMessage(userid, text) {
  const adminUser = JSON.parse(localStorage.getItem("adminUser"));

  return await api("sendchatmessage", "POST", {
    userid,                    // driver id
    message: text,             // chat text
    sendername: adminUser?.userid || "Admin", // logged-in admin
    contactid: userid          // ⭐ must match Firebase old chat format
  });
}


/* ------------------------------------------------------------------
    4️⃣ Delete complete chat history
------------------------------------------------------------------ */
export async function deleteChatHistory(userid) {
  return await api("deletechathistory", "DELETE", { userid });
}

/* ------------------------------------------------------------------
    5️⃣ Delete single message
------------------------------------------------------------------ */
export async function deleteSpecificMessage(id) {
  return await api("deletespecificchats", "DELETE", { id });
}
