



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


import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, X } from "lucide-react";

export default function ChatMessageBubble({
  msg,
  senderName,
  showSenderName = true,
  replyToMessage = null,
  onReplyClick,
}) {
  /* ================= DATA ================= */
  const isAdmin = msg?.type === 1;

  const text = String(msg?.content?.message ?? "").trim() || "";
  const attachmentData = msg?.content?.attachment ?? null;
  const attachmentUrl =
    typeof attachmentData?.url === "string"
      ? attachmentData.url
      : typeof msg?.content?.attachmentUrl === "string"
        ? msg.content.attachmentUrl
        : msg?.content?.attachmentUrl != null
          ? String(msg.content.attachmentUrl)
          : "";

  const date = msg?.dateTime ? new Date(msg.dateTime) : null;
  const time = date
    ? date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const displayName = senderName ?? (isAdmin ? "You" : "Driver");

  /* ================= STATUS ================= */
  const statusMap = {
    0: "✓",
    1: "✓✓",
    2: "✓✓",
  };

  const statusIcon = statusMap[msg?.status] ?? "";
  const statusColor =
    msg?.status === 2 ? "text-blue-400" : "text-gray-400";

  /* ================= ATTACHMENT TYPE ================= */
  const attachmentKind = useMemo(() => {
    if (attachmentData?.kind) return attachmentData.kind;
    if (attachmentData?.mime?.startsWith("image/")) return "image";
    if (attachmentData?.mime?.startsWith("video/")) return "video";
    if (attachmentData?.mime?.startsWith("audio/")) return "audio";
    if (attachmentData?.mime === "application/pdf") return "pdf";

    const lowerUrl = attachmentUrl ? String(attachmentUrl).toLowerCase() : "";
    if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(lowerUrl)) return "image";
    if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(lowerUrl)) return "video";
    if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(lowerUrl)) return "audio";
    if (/\.pdf(\?|$)/i.test(lowerUrl)) return "pdf";
    return attachmentUrl ? "file" : null;
  }, [attachmentData, attachmentUrl]);

  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  /* ================= STYLES ================= */
  const containerAlign = isAdmin ? "justify-end" : "justify-start";
  const bubbleAlign = isAdmin ? "items-end" : "items-start";

  const bubbleStyle = isAdmin
    ? "bg-blue-600 text-white"
    : "bg-[#1f2937] text-gray-200";

  const replyToPreview =
    replyToMessage != null
      ? (typeof replyToMessage.content?.message === "string"
          ? replyToMessage.content.message.trim()
          : replyToMessage.content?.message != null
            ? String(replyToMessage.content.message).trim()
            : "")
        || (replyToMessage.content?.attachmentUrl ? "Attachment" : "")
        || "Message"
      : "Message";

  const showReplyTo = msg?.replyTo;

  /* ================= RENDER ================= */
  return (
    <div className={`flex ${containerAlign} mb-2`}>
      <div className={`flex flex-col max-w-[65%] ${bubbleAlign}`}>
        {/* Sender name */}
        {showSenderName && (
          <span
            className={`text-xs text-gray-400 mb-0.5 px-1 ${
              isAdmin ? "pr-2" : "pl-2"
            }`}
          >
            {displayName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`group relative px-3 py-2 rounded-lg shadow text-sm ${bubbleStyle}`}
        >
          {text && (
            <button
              type="button"
              onClick={async () => {
                if (!navigator?.clipboard?.writeText) return;
                await navigator.clipboard.writeText(text);
                setCopied(true);
              }}
              className={`absolute -top-2 right-2 rounded bg-black/40 px-2 py-1 text-[10px] opacity-0 transition ${
                isAdmin ? "text-blue-100" : "text-gray-200"
              } group-hover:opacity-100`}
              aria-label="Copy message"
            >
              {copied ? "Copied" : <Copy className="h-3 w-3" />}
            </button>
          )}
          {/* Replying to */}
          {showReplyTo && (
            <button
              type="button"
              onClick={() => onReplyClick?.(msg.replyTo)}
              className={`mb-2 w-full text-left rounded border-l-2 pl-2 py-1 text-xs ${
                isAdmin
                  ? "border-blue-400 bg-blue-500/30 text-blue-100"
                  : "border-gray-500 bg-black/20 text-gray-300"
              } truncate`}
              title={replyToPreview}
            >
              <span className="font-medium opacity-90">Replying to: </span>
              {replyToPreview}
            </button>
          )}

          {/* 🖼 Image */}
          {attachmentUrl && attachmentKind === "image" && (
            <img
              src={attachmentUrl}
              alt={attachmentData?.name || "attachment"}
              className="mb-2 max-h-64 rounded-lg object-cover cursor-pointer"
              onClick={() => setModal({ kind: "image", url: attachmentUrl })}
            />
          )}

          {/* 🎥 Video */}
          {attachmentUrl && attachmentKind === "video" && (
            <video
              src={attachmentUrl}
              controls
              className="mb-2 max-h-64 w-full rounded-lg"
            />
          )}

          {/* 🎵 Audio */}
          {attachmentUrl && attachmentKind === "audio" && (
            <audio
              src={attachmentUrl}
              controls
              className="mb-2 w-full"
            />
          )}

          {/* 📄 PDF */}
          {attachmentUrl && attachmentKind === "pdf" && (
            <button
              type="button"
              onClick={() => setModal({ kind: "pdf", url: attachmentUrl })}
              className="mb-2 flex items-center gap-2 rounded bg-black/30 px-3 py-2 text-sm hover:bg-black/40"
            >
              📄 <span className="underline">View PDF</span>
            </button>
          )}

          {/* 📎 Other file */}
          {attachmentUrl && attachmentKind === "file" && (
            <div className="mb-2 flex flex-col gap-1 rounded bg-black/20 px-3 py-2 text-xs">
              <span className="text-gray-200">
                {attachmentData?.name || "Attachment"}
              </span>
              <a
                href={attachmentUrl}
                download
                className="text-blue-200 underline"
              >
                Download file
              </a>
            </div>
          )}

          {/* Text */}
          {text && (
            <p className="whitespace-pre-wrap break-words">
              {text}
            </p>
          )}

          {/* Meta */}
          <div className="mt-1 flex items-center justify-end gap-1">
            <span className="text-[10px] text-gray-300">
              {time}
            </span>
            {statusIcon && (
              <span className={`text-[11px] ${statusColor}`}>
                {statusIcon}
              </span>
            )}
          </div>
        </div>
      </div>
      {modal &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
            <div className="relative max-h-full w-full max-w-4xl rounded-lg bg-[#0d1117] p-4 shadow-xl">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="absolute right-3 top-3 rounded bg-black/40 p-1 text-gray-200 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
              {modal.kind === "image" && (
                <img
                  src={modal.url}
                  alt="Attachment preview"
                  className="max-h-[80vh] w-full object-contain"
                />
              )}
              {modal.kind === "pdf" && (
                <iframe
                  src={modal.url}
                  title="PDF preview"
                  className="h-[80vh] w-full rounded"
                />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
