// export default function ChatMessageBubble({ msg }) {
//   const isAdmin = msg.type === 1;
//   const text = msg?.content?.message || "";
//   const attachment = msg?.content?.attachmentUrl || "";

//   const dateObj = new Date(msg.dateTime);

//   const time = dateObj.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   // Status ticks
//   const statusIcon =
//     msg.status === 0 ? "✓" :
//     msg.status === 1 ? "✓✓" :
//     msg.status === 2 ? "✓✓" : "";

//   const statusColor = msg.status === 2 ? "text-blue-400" : "text-gray-400";

//   // Detect file type
//   const isImage =
//     attachment &&
//     (attachment.endsWith(".jpg") ||
//       attachment.endsWith(".jpeg") ||
//       attachment.endsWith(".png") ||
//       attachment.endsWith(".webp"));

//   const isPDF = attachment && attachment.endsWith(".pdf");

//   return (
//     <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
//       <div
//         className={`px-4 py-2 max-w-[70%] rounded-lg text-sm shadow
//           ${isAdmin ? "bg-blue-600 text-white" : "bg-[#1f2937] text-gray-200"}`}
//       >
//         {/* 📌 IMAGE PREVIEW */}
//         {isImage && (
//           <img
//             src={attachment}
//             alt="image"
//             className="rounded mb-2 max-w-[200px]"
//           />
//         )}

//         {/* 📌 PDF PREVIEW / DOWNLOAD */}
//         {isPDF && (
//           <a
//             href={attachment}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="block p-2 bg-gray-800 text-gray-200 rounded mb-2"
//           >
//             📄 Open PDF (Click to view/download)
//           </a>
//         )}

//         {/* 📌 OTHER FILE TYPES */}
//         {!isImage && !isPDF && attachment && (
//           <a
//             href={attachment}
//             target="_blank"
//             className="text-blue-300 underline block mt-2"
//           >
//             📎 Open Attachment
//           </a>
//         )}

//         {/* 📌 TEXT MESSAGE */}
//         {text && <p>{text}</p>}

//         {/* 📌 TIME + STATUS */}
//         <div className="flex justify-end items-center gap-1 mt-1">
//           <span className="text-[10px] text-gray-300">{time}</span>
//           <span className={`text-[12px] ${statusColor}`}>{statusIcon}</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ChatMessageBubble({
//   msg,
//   isPrevSameSender,
//   isNextSameSender,
// }) {
//   const isAdmin = msg.type === 1;
//   const text = msg?.content?.message || "";
//   const attachment = msg?.content?.attachmentUrl || "";

//   const dateObj = new Date(msg.dateTime);

//   const time = dateObj.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   // ✔ Status ticks
//   const statusIcon =
//     msg.status === 0 ? "✓" :
//     msg.status === 1 ? "✓✓" :
//     msg.status === 2 ? "✓✓" : "";

//   const statusColor =
//     msg.status === 2 ? "text-blue-400" : "text-gray-400";

//   // ✔ Detect attachment type
//   const isImage =
//     attachment &&
//     /\.(jpg|jpeg|png|webp)$/i.test(attachment);

//   const isPDF =
//     attachment &&
//     /\.pdf$/i.test(attachment);

//   return (
//     <div
//       className={`flex ${
//         isAdmin ? "justify-end" : "justify-start"
//       } ${isPrevSameSender ? "mt-1" : "mt-4"}`}
//     >
//       <div
//         className={`
//           px-4 py-2 max-w-[70%] text-sm shadow
//           ${isAdmin ? "bg-blue-600 text-white" : "bg-[#1f2937] text-gray-200"}
//           ${isPrevSameSender ? "rounded-t-md" : "rounded-t-lg"}
//           ${isNextSameSender ? "rounded-b-md" : "rounded-b-lg"}
//         `}
//       >
//         {/* 🖼 IMAGE */}
//         {isImage && (
//           <img
//             src={attachment}
//             alt="attachment"
//             className="mb-2 rounded-lg max-w-[220px]"
//           />
//         )}

//         {/* 📄 PDF */}
//         {isPDF && (
//           <a
//             href={attachment}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="block mb-2 p-2 rounded bg-gray-800 text-xs text-blue-300"
//           >
//             📄 Open PDF
//           </a>
//         )}

//         {/* 📎 OTHER FILES */}
//         {!isImage && !isPDF && attachment && (
//           <a
//             href={attachment}
//             target="_blank"
//             className="block mb-2 text-blue-300 underline text-xs"
//           >
//             📎 Open Attachment
//           </a>
//         )}

//         {/* 💬 TEXT */}
//         {text && (
//           <p className="whitespace-pre-wrap leading-relaxed">
//             {text}
//           </p>
//         )}

//         {/* ⏱ TIME + STATUS */}
//         <div className="flex justify-end items-center gap-1 mt-1">
//           <span className="text-[10px] text-gray-300">{time}</span>
//           {isAdmin && (
//             <span className={`text-[12px] ${statusColor}`}>
//               {statusIcon}
//             </span>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function ChatMessageBubble({ msg }) {
//   const isAdmin = msg.type === 1;

//   const text = msg?.content?.message || "";
//   const attachment = msg?.content?.attachmentUrl || "";

//   const dateObj = msg?.dateTime ? new Date(msg.dateTime) : null;

//   const time = dateObj
//     ? dateObj.toLocaleTimeString("en-US", {
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "";

//   // ✅ Status ticks
//   const statusIcon =
//     msg.status === 0 ? "✓" :
//     msg.status === 1 ? "✓✓" :
//     msg.status === 2 ? "✓✓" : "";

//   const statusColor =
//     msg.status === 2 ? "text-blue-300" : "text-gray-400";

//   // ✅ File type detection
//   const isImage =
//     attachment &&
//     /\.(jpg|jpeg|png|webp|gif)$/i.test(attachment);

//   const isPDF =
//     attachment && /\.pdf$/i.test(attachment);

//   return (
//     <div
//       className={`flex ${
//         isAdmin ? "justify-end" : "justify-start"
//       } mb-2`}   // 🔥 spacing between bubbles
//     >
//       <div
//         className={`max-w-[65%] rounded-xl px-3 py-2 text-sm shadow
//           ${isAdmin
//             ? "bg-blue-600 text-white rounded-br-none"
//             : "bg-[#1f2937] text-gray-200 rounded-bl-none"
//           }`}
//       >

//         {/* 🖼 IMAGE PREVIEW */}
//         {isImage && (
//           <div className="mb-2">
//             <img
//               src={attachment}
//               alt="attachment"
//               className="rounded-lg max-w-full max-h-60 object-cover border border-gray-700"
//             />
//           </div>
//         )}

//         {/* 📄 PDF PREVIEW */}
//         {isPDF && (
//           <a
//             href={attachment}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-[#111827] hover:bg-[#1a2230]"
//           >
//             <span className="text-xl">📄</span>
//             <div className="flex flex-col">
//               <span className="text-sm text-white">
//                 PDF Document
//               </span>
//               <span className="text-xs text-blue-400">
//                 Click to view / download
//               </span>
//             </div>
//           </a>
//         )}

//         {/* 📎 OTHER FILES */}
//         {!isImage && !isPDF && attachment && (
//           <a
//             href={attachment}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="block mb-2 text-blue-400 underline text-sm"
//           >
//             📎 Download attachment
//           </a>
//         )}

//         {/* 💬 TEXT MESSAGE */}
//         {text && (
//           <p className="whitespace-pre-wrap break-words">
//             {text}
//           </p>
//         )}

//         {/* ⏱ TIME + STATUS */}
//         <div className="flex justify-end items-center gap-1 mt-1">
//           <span className="text-[10px] text-gray-300">
//             {time}
//           </span>
//           {isAdmin && (
//             <span className={`text-[11px] ${statusColor}`}>
//               {statusIcon}
//             </span>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, Download, ExternalLink, FileText, Copy } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  extractAttachmentDisplayName,
  getAttachmentKind,
  isGenericFileAttachment,
} from "../utils/chatAttachments";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

let isPdfWorkerConfigured = false;

function ensurePdfWorkerConfigured() {
  if (isPdfWorkerConfigured) return;
  // Worker must come from the installed pdfjs-dist version to avoid API/worker mismatch errors.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  isPdfWorkerConfigured = true;
}

ensurePdfWorkerConfigured();

const PdfFirstPagePreview = memo(function PdfFirstPagePreview({ pdfData, onPreviewError }) {
  const [loaded, setLoaded] = useState(false);
  // Memoize the file object so react-pdf does not treat each render as a new document input.
  const pdfDocumentFile = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData]);

  useEffect(() => {
    setLoaded(false);
  }, [pdfDocumentFile]);

  if (!pdfDocumentFile) return null;

  return (
    <div className="relative h-44 w-full overflow-hidden rounded-t-lg bg-[#0b1220]">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#0b1220] to-[#151f33]" />
      )}
      <Document
        file={pdfDocumentFile}
        loading={null}
        error={null}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={onPreviewError}
        onSourceError={onPreviewError}
      >
        <Page
          pageNumber={1}
          width={278}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          onRenderError={onPreviewError}
        />
      </Document>
      <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
        PDF
      </span>
    </div>
  );
});

export default function ChatMessageBubble({
  msg,
  senderName,
  showSenderName = true,
  replyToMessage = null,
  replyTargetId = null,
  onReplyClick,
  onImageClick,
  onDownloadMedia,
  isLastMessageInChat,
}) {
  /* ================= DATA ================= */
  const isAdmin = msg?.type === 1;

  const rawMessage = msg?.content?.message;
  const text =
    typeof rawMessage === "string"
      ? rawMessage.trim()
      : typeof rawMessage === "number"
        ? String(rawMessage)
        : rawMessage && typeof rawMessage === "object"
          ? typeof rawMessage.text === "string"
            ? rawMessage.text.trim()
            : typeof rawMessage.message === "string"
              ? rawMessage.message.trim()
              : ""
          : "";

  const rawAttachment = msg?.content?.attachmentUrl;
  const attachment =
    typeof rawAttachment === "string"
      ? rawAttachment.trim()
      : rawAttachment && typeof rawAttachment === "object"
        ? typeof rawAttachment.url === "string"
          ? rawAttachment.url.trim()
          : ""
        : "";
  const hasAttachment =
    Boolean(attachment) &&
    !["null", "undefined"].includes(attachment.toLowerCase());

  const date = msg?.dateTime ? new Date(msg.dateTime) : null;
  const time = date
    ? date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const displayName = senderName ?? (isAdmin ? "You" : "Driver");

  /* ================= STATUS (single = sent, double = delivered & seen) ================= */
  const status = msg?.status ?? 0;
  const fromBackend = status === 1 || status === 2;
  const isLastInChat = isLastMessageInChat !== false;
  const isDeliveredAndSeen = fromBackend || (isAdmin && !isLastInChat);
  const statusIcon = isAdmin
    ? isDeliveredAndSeen
      ? "double"
      : "single"
    : "";
  const statusColor = "text-white/70";

  /* ================= ATTACHMENT TYPE ================= */
  const attachmentMimeType = typeof msg?.content?.attachmentMimeType === "string"
    ? msg.content.attachmentMimeType
    : typeof rawAttachment?.mimeType === "string"
      ? rawAttachment.mimeType
      : typeof rawAttachment?.type === "string"
        ? rawAttachment.type
        : "";

  // MIME type is primary and extension is fallback for robust attachment detection.
  const attachmentKind = hasAttachment
    ? getAttachmentKind({ mimeType: attachmentMimeType, url: attachment })
    : null;
  const isImage = attachmentKind === "image";
  const isVideo = attachmentKind === "video";
  const isPDF = attachmentKind === "pdf";
  const isGenericFile = hasAttachment && isGenericFileAttachment({ mimeType: attachmentMimeType, url: attachment });
  const isHttpUrl = /^https?:\/\//i.test(attachment);
  const isKnownMediaAttachment = hasAttachment && (isImage || isVideo || isPDF);
  // PDF attachments must be checked first so the dedicated preview bubble wins over generic file fallback.
  const showFileAttachmentLink = hasAttachment && !isPDF && isGenericFile && isHttpUrl;
  // Display filename should be derived safely from metadata/url for readable cards.
  const attachmentDisplayName = extractAttachmentDisplayName({
    explicitName: msg?.content?.attachmentName ?? msg?.attachmentName,
    url: attachment,
    fallback: isPDF ? "Document.pdf" : "Attachment",
  });
  const normalizedText = text.toLowerCase();
  const normalizedAttachment = attachment.toLowerCase();
  const textLooksLikeStoragePath =
    normalizedText.includes("chat/uploads/") ||
    normalizedText.includes("firebase") ||
    /\.(pdf|jpg|jpeg|png|gif|webp|mp4|mov|webm)(\?|$)/i.test(text);
  // PDF chat bubbles should show a clean card, not raw storage paths leaked as message text.
  const shouldRenderText =
    Boolean(text) &&
    !(hasAttachment && (
      normalizedText === normalizedAttachment ||
      textLooksLikeStoragePath
    ));

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [pdfPreviewFailed, setPdfPreviewFailed] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState(null);
  const previewErrorLoggedRef = useRef("");

  const logPdfPreviewFailure = useCallback((error) => {
    if (previewErrorLoggedRef.current === attachment) return;
    previewErrorLoggedRef.current = attachment;
    console.error(`PDF preview failed for ${attachment}`, error);
  }, [attachment]);

  useEffect(() => {
    setImageLoaded(false);
    setImageLoadFailed(false);
  }, [attachment]);

  useEffect(() => {
    setPdfPreviewFailed(false);
    setPdfPreviewData(null);
    previewErrorLoggedRef.current = "";

    if (!hasAttachment || !isPDF) {
      return undefined;
    }

    // Loading a Uint8Array for react-pdf is more reliable than handing signed URLs directly.
    // Preview loading stays passive (fetch-only), so chat open never auto-downloads PDFs.
    const controller = new AbortController();
    let isActive = true;

    fetch(attachment, {
      method: "GET",
      signal: controller.signal,
      credentials: "omit",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (!isActive) return;
        setPdfPreviewData(new Uint8Array(buffer));
      })
      .catch((error) => {
        if (!isActive || error?.name === "AbortError") return;
        // Fallback card is intentional when PDF preview fetch/render fails.
        logPdfPreviewFailure(error);
        setPdfPreviewFailed(true);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [attachment, hasAttachment, isPDF, logPdfPreviewFailure]);

  /* ================= STYLES (WhatsApp-like) ================= */
  const containerAlign = isAdmin ? "justify-end" : "justify-start";
  const bubbleAlign = isAdmin ? "items-end" : "items-start";
  // Sent = blue bubble (admin theme), Received = blue-gray bubble
  const bubbleStyle = isAdmin
    ? "bg-[#1f6feb] text-white rounded-br-md"
    : "bg-[#1c2530] text-[#e9edef] rounded-bl-md";
  const bubbleRounding = isAdmin
    ? "rounded-2xl rounded-br-md"
    : "rounded-2xl rounded-bl-md";

  const replyToPreview =
    replyToMessage != null
      ? (typeof replyToMessage.content?.message === "string"
          ? replyToMessage.content.message.trim()
          : replyToMessage.content?.message != null
            ? String(replyToMessage.content.message).trim()
            : "") ||
        (replyToMessage.content?.attachmentUrl ? "Attachment" : "") ||
        "Message"
      : "Message";

  const showReplyTo = msg?.replyTo || replyToMessage;
  const showCopyButton =
    shouldRenderText && !isKnownMediaAttachment && !showFileAttachmentLink;
  const [copied, setCopied] = useState(false);

  const handlePdfDownload = () => {
    if (!attachment) return;
    if (onDownloadMedia) {
      onDownloadMedia(attachment);
      return;
    }
    window.open(attachment, "_blank", "noopener,noreferrer");
  };

  const handleCopyMessage = async () => {
    if (!showCopyButton) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const fallback = document.createElement("textarea");
        fallback.value = text;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "absolute";
        fallback.style.left = "-9999px";
        document.body.appendChild(fallback);
        fallback.select();
        document.execCommand("copy");
        document.body.removeChild(fallback);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const copyButton = showCopyButton ? (
    <button
      type="button"
      onClick={handleCopyMessage}
      className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#8696a0] transition-colors hover:bg-white/10 hover:text-[#e9edef] ${showSenderName ? "mt-5" : "mt-0.5"}`}
      aria-label="Copy message"
      title={copied ? "Copied" : "Copy message"}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  ) : null;

  /* ================= RENDER ================= */
  return (
    <div className={`flex ${containerAlign} mb-2`}>
      <div className={`relative flex flex-col max-w-[65%] ${bubbleAlign}`}>
        {copyButton && (
          <div
            className={`absolute z-10 ${showSenderName ? "top-5" : "top-0.5"} ${isAdmin ? "-left-10" : "-right-10"}`}
          >
            {copyButton}
          </div>
        )}
        {/* Sender name */}
        {showSenderName && (
          <span
            className={`text-xs text-[#8696a0] mb-0.5 px-1 ${
              isAdmin ? "pr-2" : "pl-2"
            }`}
          >
            {displayName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-3 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-sm ${bubbleStyle} ${bubbleRounding}`}
        >
          {/* Replying to */}
          {showReplyTo && (
            <button
              type="button"
              onClick={() => onReplyClick?.(replyTargetId)}
              className={`mb-2 w-full text-left rounded border-l-2 pl-2 py-1 text-xs ${
                isAdmin
                  ? "border-[#1f6feb] bg-white/10 text-white"
                  : "border-gray-500 bg-black/20 text-gray-300"
              } truncate`}
              title={replyToPreview}
            >
              <span className="font-medium opacity-90">Replying to: </span>
              {replyToPreview}
            </button>
          )}

          {/* 🖼 Image */}
          {hasAttachment && isImage && (
            <div className="relative mb-2 w-[280px] max-w-full overflow-hidden rounded-lg bg-black/20">
              {!imageLoaded && !imageLoadFailed && (
                <div className="h-64 w-full animate-pulse bg-white/20" />
              )}
              {imageLoadFailed ? (
                <a
                  href={attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm text-blue-300 underline"
                >
                  Open image
                </a>
              ) : (
                <img
                  src={attachment}
                  alt="attachment"
                  className={`w-full rounded-lg object-cover cursor-pointer hover:opacity-95 ${
                    imageLoaded ? "relative" : "absolute inset-0 h-64 opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoadFailed(true)}
                  onClick={() =>
                    onImageClick
                      ? onImageClick(attachment)
                      : window.open(attachment, "_blank")
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (onImageClick
                      ? onImageClick(attachment)
                      : window.open(attachment, "_blank"))
                  }
                />
              )}
            </div>
          )}

          {/* 📄 PDF */}
          {hasAttachment && isPDF && (
            <div className="mb-2 w-[280px] max-w-full overflow-hidden rounded-lg border border-red-400/30 bg-[#101828]">
              {/* PDF preview must be passive; open/download actions are user-triggered only to avoid auto-download regressions. */}
              {pdfPreviewFailed ? (
                <div className="relative h-44 w-full bg-gradient-to-b from-[#0b1220] to-[#151f33]">
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <FileText className="h-14 w-14 text-red-300/80" />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(248,113,113,0.2),transparent_50%)]" />
                  <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    PDF
                  </span>
                </div>
              ) : pdfPreviewData ? (
                <PdfFirstPagePreview
                  pdfData={pdfPreviewData}
                  onPreviewError={(error) => {
                    logPdfPreviewFailure(error);
                    setPdfPreviewFailed(true);
                  }}
                />
              ) : (
                <div className="relative h-44 w-full bg-gradient-to-b from-[#0b1220] to-[#151f33]">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#0b1220] to-[#151f33]" />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <FileText className="h-12 w-12 text-red-300/70" />
                  </div>
                  <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    PDF
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="rounded-md bg-red-500/20 p-2 text-red-300">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-100">{attachmentDisplayName}</p>
                  <p className="text-xs text-gray-400">PDF document</p>
                </div>
                <div className="flex items-center gap-1">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handlePdfDownload}
                          className="rounded-full p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Download PDF</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Open PDF"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top">Open PDF</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          )}

          {/* 🎥 Video */}
          {hasAttachment && isVideo && (
            <div className="relative mb-2">
              <video
                src={attachment}
                controls
                controlsList="nodownload"
                preload="metadata"
                className="max-h-72 w-full rounded-lg bg-black"
              />
              {/* Video download uses a compact icon action to reduce visual clutter in bubbles. */}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-black/55 p-2 text-white transition-colors hover:bg-black/75"
                      onClick={() => onDownloadMedia?.(attachment)}
                      aria-label="Download video"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left">Download video</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* 📎 Other file */}
          {showFileAttachmentLink && (
            <a
              href={attachment}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 block text-blue-300 underline"
              title={attachmentDisplayName}
            >
              📎 Open {attachmentDisplayName}
            </a>
          )}

          {/* Text */}
          {shouldRenderText && <p className="whitespace-pre-wrap break-words">{text}</p>}

          {/* Meta */}
          <div className="mt-1 flex items-center justify-end gap-1">
            <span
              className={`text-[10px] ${isAdmin ? "text-white/80" : "text-gray-400"}`}
            >
              {time}
            </span>
            {statusIcon && (
              <span className={`inline-flex items-center ${statusColor}`}>
                {statusIcon === "double" ? (
                  <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                ) : (
                  <Check className="h-3.5 w-3.5" strokeWidth={2.2} />
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
