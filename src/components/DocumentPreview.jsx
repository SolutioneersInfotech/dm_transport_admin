import { useEffect, useState } from "react";

export default function DocumentPreview({ selectedDoc }) {
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");

  const url = selectedDoc?.document_url;

  // remove query params to detect file extension
  const cleanURL = url?.split("?")[0];
  const ext = cleanURL?.split(".").pop()?.toLowerCase();

  const isPDF = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  useEffect(() => {
    if (!isPDF || !url) {
      setPdfPreviewUrl("");
      return;
    }

    const controller = new AbortController();
    let objectUrl = "";
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
        if (!response.ok) {
          throw new Error(`Failed to load PDF (${response.status})`);
        }
        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setPdfPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setPdfPreviewUrl("");
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isPDF, url]);

  if (!selectedDoc) {
    return null;
  }

  return (
    <div className="text-left w-full h-full">
      <h2 className="text-xl font-semibold mb-4">Document Details</h2>

      <p><b>Uploaded By:</b> {selectedDoc.driver_name}</p>
      <p><b>Date:</b> {new Date(selectedDoc.date).toLocaleDateString()}</p>
      <p><b>Type:</b> {selectedDoc.type}</p>
      <p><b>Category:</b> {selectedDoc.feature}</p>
      {selectedDoc.note && <p><b>Note:</b> {selectedDoc.note}</p>}

      {/* PREVIEW AREA */}
      <div className="mt-4 w-full h-[70vh] rounded overflow-hidden bg-black/20 flex justify-center items-start">

        {/* IMAGE PREVIEW */}
        {isImage && (
          <img
            src={url}
            alt="Document Preview"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* PDF PREVIEW */}
        {isPDF && (
          <div className="relative w-full h-full">
            <iframe
              src={pdfPreviewUrl}
              className="w-full h-full rounded"
              title="PDF Preview"
            ></iframe>
          </div>
        )}

        {/* UNKNOWN FILE TYPE */}
        {!isImage && !isPDF && (
          <p className="text-gray-400 p-4">
            Unable to preview this file.
            <br />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Open File
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
