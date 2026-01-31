// Base URL configuration
export const baseBackendUrl = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/admin`
  : "https://northamerica-northeast1-dmtransport-1.cloudfunctions.net/api/admin";


// Auth routes
export const loginRoute = `${baseBackendUrl}/login`;
export const checkTokenRoute = `${baseBackendUrl}/checkToken`;

// Chat routes
export const fetchUsersRoute = (page = 1, limit = 10, search = undefined) => {
  const baseUrl = `${baseBackendUrl}/fetchusers`;
  const params = new URLSearchParams();
  
  params.append("page", page);
  params.append("limit", limit);
  
  // Only include search if it's provided (even if empty string)
  if (search !== undefined) {
    params.append("search", search);
  }
  
  return `${baseUrl}?${params.toString()}`;
};
export const fetchChatHistoryRoute = (userid) => `${baseBackendUrl}/fetchchathistory?userid=${userid}`;
export const sendChatMessageRoute = `${baseBackendUrl}/sendchatmessage`;
export const deleteChatHistoryRoute = `${baseBackendUrl}/deletechathistory`;
export const deleteSpecificChatRoute = `${baseBackendUrl}/deletespecificchats`;

// Document routes
export const fetchDocumentsRoute = (startDate, endDate, options = {}) => {
  const baseUrl = `${baseBackendUrl}/fetchdocuments`;
  const params = new URLSearchParams();

  // Required parameters
  if (startDate && endDate) {
    params.append("start_date", startDate);
    params.append("end_date", endDate);
  }

  // Pagination
  if (options.page) {
    params.append("page", options.page);
  }
  if (options.limit) {
    params.append("limit", options.limit);
  }

  // Search
  if (options.search) {
    params.append("search", options.search);
  }

  // Status filters
  if (options.isSeen !== undefined && options.isSeen !== null) {
    params.append("isSeen", options.isSeen);
  }

  // Flagged filter
  if (options.isFlagged !== undefined && options.isFlagged !== null) {
    params.append("isFlagged", options.isFlagged);
  }

  // Category filter - send as array: repeated param (category=C&category=D)
  if (options.category != null && options.category !== "") {
    const arr = Array.isArray(options.category)
      ? options.category.filter(Boolean).map((c) => String(c).trim())
      : String(options.category).trim().split(/\s*,\s*/).filter(Boolean);
    arr.forEach((c) => params.append("category", c));
  }

  // Type filters (multiple document types) - for backward compatibility
  // Note: If filters array is provided, send as multiple "type" parameters
  if (options.filters && Array.isArray(options.filters) && options.filters.length > 0) {
    options.filters.forEach((filter) => {
      params.append("type", filter);
    });
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Document count route
export const fetchDocumentCountRoute = (startDate, endDate, options = {}) => {
  const baseUrl = `${baseBackendUrl}/fetchdocumentcount`;
  const params = new URLSearchParams();

  // Required parameters
  if (startDate && endDate) {
    params.append("start_date", startDate);
    params.append("end_date", endDate);
  }

  // Status filters
  if (options.isSeen !== undefined && options.isSeen !== null) {
    params.append("isSeen", options.isSeen);
  }

  // Flagged filter
  if (options.isFlagged !== undefined && options.isFlagged !== null) {
    params.append("isFlagged", options.isFlagged);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

// Fetch document by ID route
export const fetchDocumentByIdRoute = (documentId, type) => {
  const baseUrl = `${baseBackendUrl}/fetchdocumentbyid`;
  const params = new URLSearchParams();
  
  params.append("document_id", documentId);
  if (type) {
    params.append("type", type);
  }
  
  return `${baseUrl}?${params.toString()}`;
};

// Update document route
export const updateDocumentRoute = `${baseBackendUrl}/updateDocument`;

// Change document type route
export const changeDocumentTypeRoute = `${baseBackendUrl}/changedocumenttype`;

// Acknowledgement routes
export const fetchAcknowledgementsRoute = `${baseBackendUrl}/fetchchatacknowledgement`;
export const createAcknowledgementRoute = `${baseBackendUrl}/createchatacknowledgement`;
export const updateAcknowledgementRoute = `${baseBackendUrl}/updatechatacknowledgement`;
export const deleteAcknowledgementRoute = `${baseBackendUrl}/deletechatacknowledgement`;
export const sendPushNotificationRoute = `${baseBackendUrl}/sendpushnotification`;

// Maintenance chat routes
export const maintenanceFetchUsersRoute = `${baseBackendUrl}/fetchusers`;
export const maintenanceFetchChatHistoryRoute = (userid) => `${baseBackendUrl}/fetchchathistory?userid=${userid}`;
export const maintenanceSendChatMessageRoute = `${baseBackendUrl}/sendchatmessage`;
export const maintenanceDeleteChatHistoryRoute = `${baseBackendUrl}/deletechathistory`;
export const maintenanceDeleteSpecificChatRoute = `${baseBackendUrl}/deletespecificchats`;
