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
export default function FilePreviewModal({
  file,
  adminId,
  driverId,
  onClose,
  onSent,
  uploadFile,
  uploadContext,
  title = "Send attachment",
}) {
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
    if (!file || !adminId) {
      console.error("⚠️ Cannot upload: missing file or adminId", { file, adminId, driverId });
      return;
    }
    console.log("📤 Starting file upload:", { fileName, fileSize, mimeType: file.type });
    setError(null);
    setUploading(true);
    setProgress(0);

    const uploadHandler =
      uploadFile ||
      ((nextFile, nextAdminId, _uploadContext, onProgress, onError, onComplete) =>
        uploadChatFile(nextFile, nextAdminId, driverId, onProgress, onError, onComplete)
      );

    uploadHandler(
      file,
      adminId,
      uploadContext,
      (p) => {
        console.log("📊 Upload progress:", Math.round(p) + "%");
        setProgress(p);
      },
      (err) => {
        console.error("❌ Upload error:", err);
        setUploading(false);
        setError(err || "Upload failed");
      },
      (url) => {
        console.log("✅ Upload complete, received URL:", url);
        console.log("🔄 About to call onSent callback...", { onSent, url });
        setUploading(false);
        if (onSent) {
          console.log("📞 Calling onSent with URL");
          onSent(url);
        } else {
          console.error("❌ onSent callback is null or undefined!");
        }
        console.log("🔄 About to call onClose callback...", { onClose });
        onClose?.();
      }
    );
  };

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050816]/78 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="File preview"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(19,26,38,0.98),rgba(9,13,22,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <span className="text-sm font-medium tracking-[0.01em] text-white/92">{title}</span>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(67,97,161,0.18),transparent_58%)] p-4">
          {previewUrl && isImage && (
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[50vh] max-w-full rounded-2xl border border-white/10 object-contain shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            />
          )}
          {previewUrl && isVideo && (
            <video
              src={previewUrl}
              controls
              className="max-h-[50vh] max-w-full rounded-2xl border border-white/10 bg-black/40 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
            />
          )}
          {isPDF && (
            <div className="w-full space-y-3">
              {/* Send dialog keeps PDF preview first, then metadata below for clearer scan flow. */}
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120] shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
                {previewUrl ? (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0`}
                    title="PDF preview"
                    className="h-56 w-full bg-[#0b1120]"
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center text-red-300">
                    <FileText className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-red-500/20 p-2 text-red-300">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/92">{fileName}</p>
                    <p className="text-xs text-white/55">{fileSize} • PDF</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isImage && !isVideo && !isPDF && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-6 text-white/68 shadow-[0_12px_32px_rgba(0,0,0,0.24)]">
              <p className="truncate text-sm text-white/88">{fileName}</p>
              <p className="mt-1 text-xs">{fileSize}</p>
            </div>
          )}
        </div>

        {error && (
          <p className="px-4 pb-2 text-center text-sm text-red-300">{error}</p>
        )}

        {uploading && (
          <div className="px-4 pb-3">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#1f6feb] transition-[width] duration-200"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="mt-1 text-center text-xs text-white/55">
              Uploading… {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        <div className="flex gap-2 border-t border-white/10 bg-white/[0.02] p-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-white/12 bg-transparent text-white/82 hover:bg-white/[0.04] hover:text-white"
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

