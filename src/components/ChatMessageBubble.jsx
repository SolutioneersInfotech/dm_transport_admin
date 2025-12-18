// export default function ChatMessageBubble({ msg }) {
//   const isAdmin = msg.type === 1; // 1 = ADMIN, 0 = DRIVER
//   const text = msg?.content?.message || "";
//   const attachment = msg?.content?.attachmentUrl || "";
  
//   // ⭐ Format date & time
//   const dateObj = msg?.dateTime ? new Date(msg.dateTime) : null;

//   const time = dateObj
//     ? dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
//     : "";

//   const date = dateObj
//     ? dateObj.toLocaleDateString("en-US", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       })
//     : "";

//   return (
//     <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      
//       <div
//         className={`px-4 py-2 max-w-xs rounded-lg text-sm
//         ${isAdmin ? "bg-blue-600 text-white" : "bg-[#1f2937] text-gray-200"}`}
//       >
//         {/* TEXT MESSAGE */}
//         {text && <p>{text}</p>}

//         {/* ATTACHMENT (IMAGE / PDF) */}
//         {attachment && (
//           <a
//             href={attachment}
//             target="_blank"
//             rel="noopener"
//             className="text-blue-300 underline text-xs mt-2 block"
//           >
//             View Attachment
//           </a>
//         )}

//         {/* DATE + TIME */}
//         <p className="text-[10px] text-gray-300 mt-1 text-right">
//           {date} • {time}
//         </p>
//       </div>

//     </div>
//   );
// }

// export default function ChatMessageBubble({ msg }) {
//   const isAdmin = msg.type === 1;
//   const text = msg?.content?.message || "";
//   const attachment = msg?.content?.attachmentUrl || "";

//   const dateObj = new Date(msg.dateTime);

//   const time = dateObj.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit"
//   });

//   // Status ticks
//   const statusIcon =
//     msg.status === 0 ? "✓" : 
//     msg.status === 1 ? "✓✓" : 
//     msg.status === 2 ? "✓✓" : "";

//   const statusColor = msg.status === 2 ? "text-blue-400" : "text-gray-400";

//   return (
//     <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
//       <div
//         className={`px-4 py-2 max-w-[70%] rounded-lg text-sm shadow 
//           ${isAdmin ? "bg-blue-600 text-white" : "bg-[#1f2937] text-gray-200"}`}
//       >
//         {/* TEXT */}
//         {text && <p>{text}</p>}

//         {/* ATTACHMENT */}
//         {attachment && (
//           <a
//             href={attachment}
//             target="_blank"
//             className="text-blue-300 underline block mt-2"
//           >
//             View Attachment
//           </a>
//         )}

//         {/* BOTTOM ROW */}
//         <div className="flex justify-end items-center gap-1 mt-1">
//           <span className="text-[10px] text-gray-300">{time}</span>
//           <span className={`text-[12px] ${statusColor}`}>{statusIcon}</span>
//         </div>
//       </div>
//     </div>
//   );
// }



export default function ChatMessageBubble({ msg }) {
  const isAdmin = msg.type === 1;
  const text = msg?.content?.message || "";
  const attachment = msg?.content?.attachmentUrl || "";

  const dateObj = new Date(msg.dateTime);

  const time = dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Status ticks
  const statusIcon =
    msg.status === 0 ? "✓" :
    msg.status === 1 ? "✓✓" :
    msg.status === 2 ? "✓✓" : "";

  const statusColor = msg.status === 2 ? "text-blue-400" : "text-gray-400";

  // Detect file type
  const isImage =
    attachment &&
    (attachment.endsWith(".jpg") ||
      attachment.endsWith(".jpeg") ||
      attachment.endsWith(".png") ||
      attachment.endsWith(".webp"));

  const isPDF = attachment && attachment.endsWith(".pdf");

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`px-4 py-2 max-w-[70%] rounded-lg text-sm shadow 
          ${isAdmin ? "bg-blue-600 text-white" : "bg-[#1f2937] text-gray-200"}`}
      >
        {/* 📌 IMAGE PREVIEW */}
        {isImage && (
          <img
            src={attachment}
            alt="image"
            className="rounded mb-2 max-w-[200px]"
          />
        )}

        {/* 📌 PDF PREVIEW / DOWNLOAD */}
        {isPDF && (
          <a
            href={attachment}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 bg-gray-800 text-gray-200 rounded mb-2"
          >
            📄 Open PDF (Click to view/download)
          </a>
        )}

        {/* 📌 OTHER FILE TYPES */}
        {!isImage && !isPDF && attachment && (
          <a
            href={attachment}
            target="_blank"
            className="text-blue-300 underline block mt-2"
          >
            📎 Open Attachment
          </a>
        )}

        {/* 📌 TEXT MESSAGE */}
        {text && <p>{text}</p>}

        {/* 📌 TIME + STATUS */}
        <div className="flex justify-end items-center gap-1 mt-1">
          <span className="text-[10px] text-gray-300">{time}</span>
          <span className={`text-[12px] ${statusColor}`}>{statusIcon}</span>
        </div>
      </div>
    </div>
  );
}
