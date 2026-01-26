import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Copy, Flag } from "lucide-react";
import { fetchDocumentByIdRoute } from "../utils/apiRoutes";

export default function DocumentPreviewContent({ selectedDoc }) {
  const [fullDoc, setFullDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedValue, setCopiedValue] = useState("");

  useEffect(() => {
    if (!selectedDoc?.id) return;

    const fetchFullDocument = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("adminToken");
        const url = fetchDocumentByIdRoute(selectedDoc.id, selectedDoc.type);
        
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch document details");
        }

        setFullDoc(data.document || selectedDoc);
      } catch (err) {
        setError(err.message);
        // Fallback to selectedDoc if API fails
        setFullDoc(selectedDoc);
      } finally {
        setLoading(false);
      }
    };

    fetchFullDocument();
  }, [selectedDoc]);

  if (!selectedDoc) return null;

  const doc = fullDoc || selectedDoc;
  const url = doc.document_url;
  const cleanURL = url?.split("?")[0];
  const ext = cleanURL?.split(".").pop()?.toLowerCase();

  const isPDF = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-400">Loading document details...</p>
        </div>
      </div>
    );
  }

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(value);
      setTimeout(() => setCopiedValue(""), 1500);
    } catch (copyError) {
      console.error("Failed to copy value", copyError);
    }
  };

  const renderCopyButton = (value, label) => (
    <button
      type="button"
      onClick={() => handleCopy(value)}
      className="text-gray-500 hover:text-gray-200 transition-colors"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-6 text-white">
      {error && (
        <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700 text-yellow-400 text-sm">
          {error}
        </div>
      )}

      {/* Preview Area */}
      <div className="w-full rounded-lg overflow-hidden bg-black/20 border border-gray-700 min-h-[500px] flex items-center justify-center">
        {isImage && (
          <img
            src={url}
            alt="Document Preview"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {isPDF && (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(
              url
            )}&embedded=true`}
            className="w-full h-[600px] rounded"
            title="PDF Preview"
          />
        )}

        {!isImage && !isPDF && (
          <div className="text-center p-8 space-y-4">
            <p className="text-sm text-gray-400">
              Unable to preview this file type.
            </p>
            <Button asChild variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open File
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* Document Information */}
      <div className="space-y-4 p-4 rounded-lg border border-gray-700 bg-[#161b22]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Uploaded By
            </span>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {doc.driver_name || "Unknown"}
                </p>
                {doc.driver_email && (
                  <p className="text-xs text-gray-300 truncate">
                    {doc.driver_email}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {renderCopyButton(doc.driver_name || "Unknown", "driver name")}
                {doc.driver_email && renderCopyButton(doc.driver_email, "driver email")}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Date
            </span>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {new Date(doc.date).toLocaleDateString()}
              </p>
              {renderCopyButton(new Date(doc.date).toLocaleDateString(), "date")}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Type
            </span>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white truncate">
                {doc.type || "—"}
              </p>
              {renderCopyButton(doc.type || "—", "type")}
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Category
            </span>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white truncate">
                {doc.category || doc.feature || "—"}
              </p>
              {renderCopyButton(doc.category || doc.feature || "—", "category")}
            </div>
          </div>
        </div>

        {/* Flag Information */}
        {doc.flag && (
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Flag className={`h-4 w-4 ${doc.flag.flagged ? "text-[#1f6feb]" : "text-gray-600"}`} fill={doc.flag.flagged ? "#1f6feb" : "none"} />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Flag Status
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">
                  {doc.flag.flagged ? "Flagged" : "Not Flagged"}
                </p>
                {renderCopyButton(doc.flag.flagged ? "Flagged" : "Not Flagged", "flag status")}
              </div>
              {doc.flag.flagged && doc.flag.reason && (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-gray-300">
                    <span className="text-gray-400">Reason: </span>
                    {doc.flag.reason}
                  </p>
                  {renderCopyButton(doc.flag.reason, "flag reason")}
                </div>
              )}
            </div>
          </div>
        )}

        {doc.note && (
          <div className="pt-4 border-t border-gray-700">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
              Note
            </span>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300">{doc.note}</p>
              {renderCopyButton(doc.note, "note")}
            </div>
          </div>
        )}

        {doc.acknowledgement && (
          <div className="pt-4 border-t border-gray-700">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-2">
              Acknowledgement
            </span>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-300">{doc.acknowledgement}</p>
              {renderCopyButton(doc.acknowledgement, "acknowledgement")}
            </div>
          </div>
        )}

        {copiedValue && (
          <p className="text-xs text-green-400">Copied to clipboard.</p>
        )}
      </div>
    </div>
  );
}
