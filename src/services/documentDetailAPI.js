import { fetchDocumentByIdRoute } from "../utils/apiRoutes";

export const fetchDocumentDetailAPI = async ({ documentId, type }) => {
  if (!documentId) {
    throw new Error("Document id is required");
  }

  const token = localStorage.getItem("adminToken");
  const url = fetchDocumentByIdRoute(documentId, type);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || "Failed to fetch document details");
  }

  return data?.document || null;
};
