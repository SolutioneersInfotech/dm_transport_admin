// Base URL configuration
export const baseBackendUrl = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/admin`
  : "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";


// Auth routes
export const loginRoute = `${baseBackendUrl}/login`;

// Chat routes
export const fetchUsersRoute = `${baseBackendUrl}/fetchusers`;
export const fetchChatHistoryRoute = (userid) => `${baseBackendUrl}/fetchchathistory?userid=${userid}`;
export const sendChatMessageRoute = `${baseBackendUrl}/sendchatmessage`;
export const deleteChatHistoryRoute = `${baseBackendUrl}/deletechathistory`;
export const deleteSpecificChatRoute = `${baseBackendUrl}/deletespecificchats`;

// Document routes
export const fetchDocumentsRoute = (startDate, endDate, options = {}) => {
  const baseUrl = `${baseBackendUrl}/fetchdocuments`;
  const params = new URLSearchParams();

  if (startDate && endDate) {
    params.append("start_date", startDate);
    params.append("end_date", endDate);
  }

  if (options.limit) {
    params.append("limit", options.limit);
  }

  if (options.cursor?.cursor_date) {
    params.append("cursor_date", options.cursor.cursor_date);
  }

  if (options.cursor?.cursor_path) {
    params.append("cursor_path", options.cursor.cursor_path);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Maintenance chat routes
export const maintenanceFetchUsersRoute = `${baseBackendUrl}/fetchusers`;
export const maintenanceFetchChatHistoryRoute = (userid) => `${baseBackendUrl}/fetchchathistory?userid=${userid}`;
export const maintenanceSendChatMessageRoute = `${baseBackendUrl}/sendchatmessage`;
export const maintenanceDeleteChatHistoryRoute = `${baseBackendUrl}/deletechathistory`;
export const maintenanceDeleteSpecificChatRoute = `${baseBackendUrl}/deletespecificchats`;
