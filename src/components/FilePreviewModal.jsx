import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { uploadChatFile } from "../services/chatFileUpload";
import { Button } from "./ui/button";
import {
  extractAttachmentDisplayName,
  formatFileSize,
  getAttachmentKind,
} from "../utils/chatAttachments";

/**
 * Modal to preview image/video before uploading and sending in chat.
 * Shows upload progress and Cancel / Send actions.
 */
export default function FilePreviewModal({ file, adminId, driverId, onClose, onSent }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);

  const attachmentKind = getAttachmentKind({ mimeType: file?.type, name: file?.name });
  const isImage = attachmentKind === "image";
  const isVideo = attachmentKind === "video";
  // PDF attachments use a dedicated preview card because generic file rendering is not enough UX.
  const isPDF = attachmentKind === "pdf";
  const fileName = extractAttachmentDisplayName({ file, fallback: "Attachment" });
  const fileSize = formatFileSize(file?.size);

  useEffect(() => {
    if (!file) return;
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
      return () => {};
    }
    if (isVideo || isPDF) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [file, isImage, isVideo, isPDF]);

  const handleSend = () => {
    if (!file || !adminId || !driverId) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    uploadChatFile(
      file,
      adminId,
      driverId,
      (p) => setProgress(p),
      (err) => {
        setUploading(false);
        setError(err || "Upload failed");
      },
      (url) => {
        setUploading(false);
        onSent?.(url);
        onClose?.();
      }
    );
  };

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-gray-700 bg-[#161b22] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
          <span className="text-sm font-medium text-gray-200">Send attachment</span>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded p-1 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-4">
          {previewUrl && isImage && (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[50vh] max-w-full rounded-lg object-contain"
            />
          )}
          {previewUrl && isVideo && (
            <video
              src={previewUrl}
              controls
              className="max-h-[50vh] max-w-full rounded-lg"
            />
          )}
          {isPDF && (
            <div className="w-full space-y-3">
              {/* Send dialog keeps PDF preview first, then metadata below for clearer scan flow. */}
              <div className="overflow-hidden rounded-lg border border-gray-700 bg-[#0f172a]">
                {previewUrl ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    title="PDF preview"
                    className="h-56 w-full"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center text-red-300">
                    <FileText className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-red-400/30 bg-[#1b2431] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-red-500/20 p-2 text-red-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-100">{fileName}</p>
                    <p className="text-xs text-gray-400">{fileSize} • PDF</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isImage && !isVideo && !isPDF && (
            <div className="rounded-lg border border-gray-600 bg-[#1f2937] px-4 py-6 text-gray-400">
              <p className="truncate text-sm">{fileName}</p>
              <p className="mt-1 text-xs">{fileSize}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="px-4 pb-2 text-center text-sm text-red-400">{error}</p>
        )}

        {uploading && (
          <div className="px-4 pb-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
              <div
                className="h-full rounded-full bg-[#1f6feb] transition-[width] duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-gray-400">
              Uploading… {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        <div className="flex gap-2 border-t border-gray-700 p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-gray-600"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-[#1f6feb] hover:bg-[#1a5fd4] text-white"
            onClick={handleSend}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
