// import { useEffect, useRef, useState } from "react";
// import {
//   fetchMessages,
//   sendMessage,
//   deleteChatHistory,
//   deleteSpecificMessage,
// } from "../services/chatAPI";

// import ChatMessageBubble from "./ChatMessageBubble";
// import { groupMessagesByDate } from "../utils/groupMessages";

// /* ================= LAST SEEN FORMATTER ================= */
// function formatLastSeen(lastSeen) {
//   if (!lastSeen || !lastSeen._seconds) return "Recently";

//   const date = new Date(lastSeen._seconds * 1000);

//   return date.toLocaleString("en-GB", {
//     day: "2-digit",
//     month: "short",
//     hour: "2-digit",
//     minute: "2-digit",
//   });
// }

// export default function ChatWindow({ driver }) {
//   const [messages, setMessages] = useState([]);
//   const [selected, setSelected] = useState([]);
//   const [text, setText] = useState("");

//   const bottomRef = useRef();

//   useEffect(() => {
//     loadMessages();
//   }, [driver]);

//   async function loadMessages() {
//     const res = await fetchMessages(driver.userid);
//     setMessages(res?.messages || []);
//     setSelected([]);
//     scrollToBottom();
//   }

//   function scrollToBottom() {
//     setTimeout(() => {
//       bottomRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, 100);
//   }

//   function toggleSelect(msgId) {
//     setSelected((prev) =>
//       prev.includes(msgId)
//         ? prev.filter((id) => id !== msgId)
//         : [...prev, msgId]
//     );
//   }

//   async function handleSend() {
//     if (!text.trim()) return;

//     const tempMsg = {
//       msgId: Math.random().toString(),
//       type: 1, // admin
//       content: { message: text, attachmentUrl: "" },
//       dateTime: new Date().toISOString(),
//       status: 0,
//     };

//     setMessages((prev) => [...prev, tempMsg]);
//     scrollToBottom();

//     await sendMessage(driver.userid, text);
//     setText("");
//   }

//   async function handleDeleteSelected() {
//     if (selected.length === 0) return;

//     for (let id of selected) {
//       await deleteSpecificMessage(id);
//     }

//     setMessages((prev) => prev.filter((m) => !selected.includes(m.msgId)));
//     setSelected([]);
//   }

//   async function handleDeleteAll() {
//     if (!window.confirm("Delete all messages?")) return;

//     await deleteChatHistory(driver.userid);
//     setMessages([]);
//     setSelected([]);
//   }

//   const grouped = groupMessagesByDate(messages);

//   return (
//     <div className="flex flex-col h-full overflow-hidden">
//       {/* ================= HEADER (STICKY) ================= */}
//       <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] sticky top-0 z-40 flex justify-between items-center">
//         <div className="flex items-center gap-3">
//           <img
//             src={driver.driver_image || "/default-user.png"}
//             className="w-10 h-10 rounded-full"
//           />
//           <div>
//             <p className="font-semibold">{driver.driver_name}</p>

//             {/* ✅ LAST SEEN */}
//             <p className="text-gray-400 text-xs">
//               Last seen: {formatLastSeen(driver.lastSeen)}
//             </p>
//           </div>
//         </div>

//         <div className="flex items-center gap-4">
//           {/* Delete selected */}
//           <button
//             onClick={handleDeleteSelected}
//             disabled={selected.length === 0}
//             className={`text-xl ${
//               selected.length
//                 ? "text-red-500 hover:text-red-600"
//                 : "text-gray-600 cursor-not-allowed"
//             }`}
//           >
//             🗑
//           </button>

//           {/* Delete all */}
//           <button
//             onClick={handleDeleteAll}
//             className="px-3 py-1 border border-red-500 text-red-400 rounded hover:bg-red-600 hover:text-white"
//           >
//             Delete All
//           </button>
//         </div>
//       </div>

//       {/* ================= MESSAGE AREA (SCROLL ONLY THIS) ================= */}
//       {/* <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0d1117]"> */}
//       <div className="flex-1 overflow-y-auto chat-list-scroll p-4 space-y-6 bg-[#0d1117]">
//         {Object.keys(grouped).map((date) => (
//           <div key={date}>
//             <div className="text-center text-gray-400 text-xs my-2">{date}</div>

//             {grouped[date].map((msg) => (
//               <div
//                 key={msg.msgId}
//                 className="relative"
//                 onClick={() => toggleSelect(msg.msgId)}
//               >
//                 {selected.includes(msg.msgId) && (
//                   <div className="absolute -left-3 top-3 w-3 h-3 bg-red-500 rounded-full"></div>
//                 )}

//                 <ChatMessageBubble msg={msg} />
//               </div>
//             ))}
//           </div>
//         ))}
//         <div ref={bottomRef}></div>
//       </div>

//       {/* ================= INPUT BAR (STICKY BOTTOM) ================= */}
//       <div className="p-4 border-t border-gray-700 bg-[#111827] sticky bottom-0 flex gap-2">
//         <button className="text-2xl text-gray-300 hover:text-white">📎</button>

//         <input
//           className="flex-1 bg-[#1f2937] p-2 rounded outline-none"
//           placeholder="Type a message..."
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && handleSend()}
//         />

//         <button
//           className="bg-blue-600 px-4 rounded hover:bg-blue-700"
//           onClick={handleSend}
//         >
//           Send
//         </button>
//       </div>
//     </div>
//   );
// }

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { ChevronDown, Copy, Download, FileText, Image, Mail, Megaphone, Paperclip, Phone, Trash2, Video, X } from "lucide-react";
import {
  fetchMessages as defaultFetchMessages,
  subscribeMessages as defaultSubscribeMessages,
  sendMessage as defaultSendMessage,
  deleteChatHistory as defaultDeleteChatHistory,
  deleteSpecificMessage as defaultDeleteSpecificMessage,
} from "../services/chatAPI";

import ChatMessageBubble from "./ChatMessageBubble";
import ChatComposer from "./ChatComposer";
import FilePreviewModal from "./FilePreviewModal";
import { groupMessagesByDate } from "../utils/groupMessages";
import ConversationListShimmer from "./skeletons/ConversationListShimmer";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch } from "../store/hooks";
import { updateUserLastMessage } from "../store/slices/usersSlice";
import { updateMaintenanceUserLastMessage } from "../store/slices/maintenanceUsersSlice";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";
import { ADMIN_PERMISSION_KEYS, hasAdminPermission } from "../utils/adminPermissions";
import { sendBroadcast } from "../services/broadcastAPI";
import { uploadBroadcastFile } from "../services/broadcastFileUpload";

/* ================= LAST SEEN FORMATTER ================= */
function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Recently";
  const sec = lastSeen._seconds ?? lastSeen.seconds;
  const date = sec != null ? new Date(sec * 1000) : new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseTimestampMs(value) {
  if (!value) return null;

  const sec = value?._seconds ?? value?.seconds;
  if (typeof sec === "number") {
    const ms = sec * 1000;
    return Number.isFinite(ms) ? ms : null;
  }

  const direct = new Date(value).getTime();
  return Number.isNaN(direct) ? null : direct;
}


function resolveReplyTargetId(message) {
  if (!message) return null;

  if (typeof message.replyToId === "string" && message.replyToId.trim()) {
    return message.replyToId;
  }

  if (typeof message.replyTo === "string" && message.replyTo.trim()) {
    return message.replyTo;
  }

  const nestedId = message.replyTo?.id ?? message.replyTo?.msgId ?? null;
  return typeof nestedId === "string" && nestedId.trim() ? nestedId : null;
}

function parseMessageDateTime(value) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function buildOptimisticMessageId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isBroadcastMessage(message) {
  return (
    message?.type === "broadcast" ||
    message?.isBroadcast === true ||
    message?.isbroadcast === true ||
    String(message?.isbroadcast).toLowerCase() === "true" ||
    message?.broadcast === true ||
    String(message?.broadcast).toLowerCase() === "true" ||
    Boolean(message?.recipientType) ||
    Boolean(message?.broadcastId) ||
    message?.source === "broadcast"
  );
}

function sortMessagesByDate(messages) {
  return [...messages].sort((left, right) => {
    return parseMessageDateTime(left?.dateTime) - parseMessageDateTime(right?.dateTime);
  });
}

function isMessageConfirmed(optimisticMessage, confirmedMessage) {
  const optimisticText = String(optimisticMessage?.content?.message ?? "").trim();
  const confirmedText = String(confirmedMessage?.content?.message ?? "").trim();
  const optimisticAttachment = String(optimisticMessage?.content?.attachmentUrl ?? "").trim();
  const confirmedAttachment = String(confirmedMessage?.content?.attachmentUrl ?? "").trim();
  const optimisticSender = String(optimisticMessage?.sendername ?? "").trim();
  const confirmedSender = String(confirmedMessage?.sendername ?? "").trim();
  const optimisticTime = parseMessageDateTime(optimisticMessage?.dateTime);
  const confirmedTime = parseMessageDateTime(confirmedMessage?.dateTime);
  const hasComparableTime = optimisticTime > 0 && confirmedTime > 0;
  const withinTwoMinutes = Math.abs(optimisticTime - confirmedTime) <= 2 * 60 * 1000;

  return (
    optimisticText === confirmedText &&
    optimisticAttachment === confirmedAttachment &&
    optimisticSender === confirmedSender &&
    (!hasComparableTime || withinTwoMinutes)
  );
}

export default function ChatWindow({ driver, chatApi, refreshSignal = 0 }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isMaintenanceChat = location.pathname === "/maintenance-chat";
  const updateLastMessageAction = isMaintenanceChat ? updateMaintenanceUserLastMessage : updateUserLastMessage;

  const adminId = user?.userid || user?.userId || "admin";
  const canDeleteAllMessages = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.deleteMultipleUsersChart),
    [user?.permissions]
  );
  const [messages, setMessages] = useState([]);
  const [optimisticMessages, setOptimisticMessages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState(null);
  const [isDeleteInProgress, setIsDeleteInProgress] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [selectedBroadcastFile, setSelectedBroadcastFile] = useState(null);
  const [showBroadcastFilePreview, setShowBroadcastFilePreview] = useState(false);
  const [showBroadcastAttachmentOptions, setShowBroadcastAttachmentOptions] = useState(false);
  const broadcastFileInputRef = useRef(null);
  const buildChatMediaFileName = useCallback((url, sender, dateTime) => {
    const safeSender = String(sender || "unknown_sender")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_-]/g, "") || "unknown_sender";

    const dt = dateTime ? new Date(dateTime) : new Date();
    const safeDateTime = Number.isNaN(dt.getTime())
      ? new Date().toISOString().replace(/[:.]/g, "-")
      : dt.toISOString().replace(/[:.]/g, "-");

    let extension = "jpg";
    try {
      const pathName = new URL(url).pathname || "";
      const fileName = pathName.split("/").pop() || "";
      const fromPath = fileName.includes(".") ? fileName.split(".").pop() : "";
      if (fromPath) {
        extension = fromPath.toLowerCase();
      }
    } catch {
      const directMatch = String(url || "").match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (directMatch?.[1]) {
        extension = directMatch[1].toLowerCase();
      }
    }

    return `chat_media_${safeSender}_${safeDateTime}.${extension}`;
  }, []);

  const downloadChatMedia = useCallback(async (url, senderName, dateTime) => {
    if (!url) return;

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = buildChatMediaFileName(
        url,
        senderName,
        dateTime
      );
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Failed to download chat media:", error);
    }
  }, [buildChatMediaFileName]);

  const handleLightboxDownload = useCallback(async () => {
    if (!lightboxMedia?.url) return;

    await downloadChatMedia(
      lightboxMedia.url,
      lightboxMedia.senderName,
      lightboxMedia.dateTime
    );
  }, [downloadChatMedia, lightboxMedia]);
  const driverId = (() => {
    const candidate =
      driver?.userid ??
      driver?.userId ??
      driver?.contactId ??
      driver?.contactid ??
      driver?.uid ??
      driver?.id ??
      null;

    if (candidate === "" || candidate === null || candidate === undefined) {
      return null;
    }

    const numericOnly = String(candidate).replace(/\D/g, "");
    return numericOnly || null;
  })();

  const messageSubscriptionTarget = useMemo(() => {
    if (!driverId) return null;

    return {
      userid: driverId,
      phoneNumber: driver?.phoneNumber ?? null,
      phone: driver?.phone ?? null,
      mobile: driver?.mobile ?? null,
      contact: driver?.contact ?? null,
      whatsappNumber: driver?.whatsappNumber ?? null,
    };
  }, [
    driverId,
    driver?.phoneNumber,
    driver?.phone,
    driver?.mobile,
    driver?.contact,
    driver?.whatsappNumber,
  ]);

  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);

  const {
    fetchMessages,
    subscribeMessages,
    sendMessage,
    deleteChatHistory,
    deleteSpecificMessage,
    markMessagesAsSeen,
  } = chatApi || {
    fetchMessages: defaultFetchMessages,
    subscribeMessages: defaultSubscribeMessages,
    sendMessage: defaultSendMessage,
    deleteChatHistory: defaultDeleteChatHistory,
    deleteSpecificMessage: defaultDeleteSpecificMessage,
    markMessagesAsSeen: async () => ({ success: true }),
  };

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!driverId || !messageSubscriptionTarget) {
      setMessages([]);
      setSelected([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessages([]);
    setSelected([]);
    setSelectionMode(false);
    setContextMenu(null);
    setReplyTo(null);
    setIsAtBottom(true);

    // Mark messages as seen when chat window opens
    if (markMessagesAsSeen) {
      markMessagesAsSeen(messageSubscriptionTarget).catch((error) => {
        console.error("Failed to mark messages as seen:", error);
      });
    }

    // Reset scroll flag when driver changes
    shouldScrollToBottomRef.current = true;

    const unsubscribe = subscribeMessages(messageSubscriptionTarget, (nextMessages) => {
      const confirmedMessages = nextMessages || [];
      setOptimisticMessages((prev) =>
        prev.filter(
          (optimisticMessage) =>
            !confirmedMessages.some((confirmedMessage) =>
              isMessageConfirmed(optimisticMessage, confirmedMessage)
            )
        )
      );
      setMessages((prev) => {
        const pendingFromPreviousView = prev.filter((message) =>
          String(message?.msgId || "").startsWith("temp-")
        );
        const stillPending = pendingFromPreviousView.filter(
          (optimisticMessage) =>
            !confirmedMessages.some((confirmedMessage) =>
              isMessageConfirmed(optimisticMessage, confirmedMessage)
            )
        );
        return sortMessagesByDate([...confirmedMessages, ...stillPending]);
      });
      setLoading(false);
      
      // Mark messages as seen after loading
      if (markMessagesAsSeen) {
        markMessagesAsSeen(messageSubscriptionTarget).catch((error) => {
          console.error("Failed to mark messages as seen:", error);
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [driverId, messageSubscriptionTarget, subscribeMessages, markMessagesAsSeen]);

  useEffect(() => {
    if (!driverId || !messageSubscriptionTarget || !refreshSignal) return;

    let isCancelled = false;

    fetchMessages(messageSubscriptionTarget, 200)
      .then((response) => {
        if (isCancelled) return;
        const confirmedMessages = response?.messages || [];
        setMessages((prev) => {
          const pendingFromPreviousView = prev.filter((message) =>
            String(message?.msgId || "").startsWith("temp-")
          );
          const stillPending = pendingFromPreviousView.filter(
            (optimisticMessage) =>
              !confirmedMessages.some((confirmedMessage) =>
                isMessageConfirmed(optimisticMessage, confirmedMessage)
              )
          );
          return sortMessagesByDate([...confirmedMessages, ...stillPending]);
        });
      })
      .catch((error) => {
        console.error("Failed to refetch messages on focus:", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [driverId, messageSubscriptionTarget, fetchMessages, refreshSignal]);

  // Focus input when driver changes
  useEffect(() => {
    if (!driverId) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [driverId]);

  // Robust scroll to bottom function with multiple attempts
  // const scrollToBottom = useCallback((behavior = "auto") => {
  //   // Use multiple attempts to ensure scroll happens after DOM updates
  //   const scroll = () => {
  //     if (bottomRef.current && messagesContainerRef.current) {
  //       const container = messagesContainerRef.current;
  //       const bottom = bottomRef.current;
        
  //       // Method 1: Scroll container to bottom (most reliable)
  //       container.scrollTop = container.scrollHeight;
        
  //       // Method 2: Scroll into view as fallback
  //       setTimeout(() => {
  //         bottom.scrollIntoView({ behavior, block: "end" });
  //       }, 50);
  //     }
  //   };
    
  //   // Try immediately
  //   requestAnimationFrame(() => {
  //     scroll();
  //     // Try again after a short delay to ensure DOM is fully rendered
  //     setTimeout(scroll, 100);
  //     setTimeout(scroll, 300);
  //   });
  // }, []);
  const scrollToBottom = useCallback((behavior = "auto") => {
    if (!messagesContainerRef.current) return;

    requestAnimationFrame(() => {
      const el = messagesContainerRef.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior,
      });
    });
  }, []);

  const updateIsAtBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const threshold = 24;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setIsAtBottom(distanceFromBottom <= threshold);
  }, []);
  

  // Scroll to bottom when messages change (after initial load or new messages)
  useEffect(() => {
    if (!messages.length || !shouldScrollToBottomRef.current) return;
  
    scrollToBottom("auto");
    shouldScrollToBottomRef.current = false;
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      updateIsAtBottom();
    });

    return () => cancelAnimationFrame(frame);
  }, [messages.length, updateIsAtBottom]);
  

  function toggleSelect(msgId) {
    setSelected((prev) =>
      prev.includes(msgId)
        ? prev.filter((id) => id !== msgId)
        : [...prev, msgId]
    );
  }

  function openContextMenu(e, msg) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function handleContextReply() {
    const msg = contextMenu?.msg;
    if (!msg) return;

    const rawMessage = msg.content?.message;
    const messageText =
      typeof rawMessage === "string"
        ? rawMessage.trim()
        : rawMessage != null
          ? String(rawMessage).trim()
          : "";
    const replyMessage = messageText || "Attachment";
    const replySender =
      typeof driver?.driver_name === "string"
        ? driver.driver_name
        : driver?.driver_name != null
          ? String(driver.driver_name)
          : "Driver";

    setReplyTo({
      msgId: msg.msgId,
      senderName: msg.type === 1 ? (msg.sendername ?? "You") : replySender,
      message: replyMessage,
    });

    inputRef.current?.focus();
    closeContextMenu();
  }
  

  function handleContextSelect() {
    if (contextMenu?.msg?.msgId) {
      setSelectionMode(true);
      setSelected((prev) =>
        prev.includes(contextMenu.msg.msgId)
          ? prev
          : [...prev, contextMenu.msg.msgId]
      );
    }
    closeContextMenu();
  }

  useEffect(() => {
    if (!contextMenu) return;
    const onDocClick = () => closeContextMenu();
    const t = setTimeout(() => document.addEventListener("click", onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", onDocClick);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!lightboxMedia?.url) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setLightboxMedia(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [lightboxMedia]);

  /* ================= FILE ATTACHMENT ================= */
  function openFilePicker(accept) {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
    setShowAttachmentOptions(false);
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      console.log("📎 File selected for chat preview:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      setSelectedFile(file);
      setShowFilePreview(true);
    }
    e.target.value = "";
  }

  function handleAttachmentSent(url) {
    const attachmentName = selectedFile?.name || "";
    const attachmentMimeType = selectedFile?.type || "";
    
    console.log("✅ Attachment uploaded successfully:", {
      url,
      name: attachmentName,
      mimeType: attachmentMimeType,
      fileSize: selectedFile?.size,
    });

    const tempMsg = {
      msgId: buildOptimisticMessageId(),
      type: 1,
      content: {
        message: "",
        attachmentUrl: url,
        attachmentName,
        attachmentMimeType,
      },
      dateTime: new Date().toISOString(),
      status: 0,
      sendername: user?.name || user?.userid || "Admin",
    };
    
    console.log("📤 Creating temporary message with attachment:", tempMsg);
    
    setOptimisticMessages((prev) => [...prev, tempMsg]);
    setSelectedFile(null);
    setShowFilePreview(false);
    setReplyTo(null);
    shouldScrollToBottomRef.current = true;
    scrollToBottom("smooth");
    const now = new Date().toISOString();
    dispatch(updateLastMessageAction({ userid: driverId, lastMessage: "Attachment", lastChatTime: now }));
    sendMessage(driver, "", undefined, replyTo?.msgId ?? null, url, {
      attachmentName,
      attachmentMimeType,
    }).catch((err) => {
      console.error("❌ Failed to send attachment message:", err);
    });
  }

  function openBroadcastFilePicker(accept) {
    if (!broadcastFileInputRef.current) return;
    broadcastFileInputRef.current.accept = accept;
    broadcastFileInputRef.current.click();
    setShowBroadcastAttachmentOptions(false);
  }

  function handleBroadcastFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedBroadcastFile(file);
      setShowBroadcastFilePreview(true);
    }
    e.target.value = "";
  }

  function handleBroadcastAttachmentSent(url) {
    console.log("📡 Broadcast attachment uploaded:", { url });
    
    if (!(selectedBroadcastFile instanceof File)) {
      console.warn("⚠️ Broadcast: selectedBroadcastFile is not a File object", selectedBroadcastFile);
      return;
    }

    const broadcastFileObj = {
      file: selectedBroadcastFile,
      url,
      name: selectedBroadcastFile.name || "",
      mimeType: selectedBroadcastFile.type || "",
    };
    
    console.log("✅ Setting broadcast file preview with URL:", broadcastFileObj);
    setSelectedBroadcastFile(broadcastFileObj);
    setShowBroadcastFilePreview(false);
    setShowBroadcastAttachmentOptions(false);
  }

  /* ================= SEND MESSAGE ================= */
  const handleSend = useCallback(async (messageText = "") => {
    if (selectedFile instanceof File) {
      setShowFilePreview(true);
      return;
    }

    const trimmedText = String(messageText).trim();
    if (!trimmedText) return;

    const tempMsg = {
      msgId: buildOptimisticMessageId(),
      type: 1, // ADMIN
      content: { message: trimmedText, attachmentUrl: "" },
      dateTime: new Date().toISOString(),
      status: 0,
      sendername: user?.name || user?.userid || "Admin",
    };

    setOptimisticMessages((prev) => [...prev, tempMsg]);

    const now = new Date().toISOString();
    dispatch(updateLastMessageAction({ userid: driverId, lastMessage: trimmedText, lastChatTime: now }));

    // Refocus input for better UX (allows continuous typing)
    inputRef.current?.focus();

    // Always scroll smoothly when sending a message to show the new message
    shouldScrollToBottomRef.current = true;
    scrollToBottom("smooth");

    await sendMessage(driver, trimmedText, undefined, replyTo?.msgId ?? null);
    setReplyTo(null);
  }, [dispatch, driver, driverId, replyTo?.msgId, scrollToBottom, selectedFile, sendMessage, updateLastMessageAction, user?.name, user?.userid]);

  /* ================= DELETE SELECTED ================= */
  function handleDeleteSelected() {
    if (selected.length === 0) return;
    setDeleteActionType("selected");
    setIsDeleteConfirmOpen(true);
  }

  /* ================= DELETE ALL ================= */
  function handleDeleteAll() {
    setDeleteActionType("all");
    setIsDeleteConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (!deleteActionType || isDeleteInProgress) return;

    setIsDeleteInProgress(true);
    try {
      if (deleteActionType === "selected") {
        const selectedMessageIds = [...selected];
        for (const id of selectedMessageIds) {
          await deleteSpecificMessage(id, driverId);
        }
        setMessages((prev) => prev.filter((m) => !selectedMessageIds.includes(m.msgId)));
        setSelected([]);
      }

      if (deleteActionType === "all") {
        await deleteChatHistory(driverId);
        setMessages([]);
        setSelected([]);
        setSelectionMode(false);
      }

      setIsDeleteConfirmOpen(false);
      setDeleteActionType(null);
    } finally {
      setIsDeleteInProgress(false);
    }
  }

  const deleteConfirmTitle = deleteActionType === "selected" ? "Delete Selected Messages" : "Delete All Messages";
  const deleteConfirmDescription =
    deleteActionType === "selected"
      ? selected.length === 1
        ? "Would you like to delete selected message for everyone?"
        : `Would you like to delete ${selected.length} selected messages for everyone?`
      : "Would you like to delete all messages for everyone?";

  const emailText = driver?.email ? driver.email : "—";
  const phoneText = driver?.phone ? driver.phone : "—";

  const handleCopyField = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  /* ================= BROADCAST MESSAGE HANDLER ================= */
  async function handleSendBroadcast() {
    const attachmentMeta =
      selectedBroadcastFile && !(selectedBroadcastFile instanceof File)
        ? selectedBroadcastFile
        : null;

    if (!broadcastMessage.trim() && !attachmentMeta?.url) {
      toast.error("Please enter a broadcast message or attach a file");
      return;
    }

    setIsBroadcasting(true);
    
    // Create optimistic broadcast message
    const optimisticBroadcastMsg = {
      msgId: buildOptimisticMessageId(),
      type: "broadcast",
      content: {
        message: broadcastMessage.trim(),
        attachmentUrl: attachmentMeta?.url || "",
        attachmentName: attachmentMeta?.name || "",
        attachmentMimeType: attachmentMeta?.mimeType || "",
      },
      dateTime: new Date().toISOString(),
      sendername: adminId,
      status: 0,
    };
    
    // Add to optimistic messages immediately
    setOptimisticMessages((prev) => [...prev, optimisticBroadcastMsg]);
    
    try {
      // Send broadcast to all users
      await sendBroadcast("all", broadcastMessage.trim(), [], [], [], [], {
        attachmentUrl: attachmentMeta?.url || "",
        attachmentName: attachmentMeta?.name || "",
        attachmentMimeType: attachmentMeta?.mimeType || "",
      });
      toast.success("Broadcast message sent successfully!");
      setBroadcastMessage("");
      setSelectedBroadcastFile(null);
      setShowBroadcastAttachmentOptions(false);
      setShowBroadcastDialog(false);
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast message");
      // Remove optimistic message on error
      setOptimisticMessages((prev) => prev.filter((m) => m.msgId !== optimisticBroadcastMsg.msgId));
    } finally {
      setIsBroadcasting(false);
    }
  }

  /* ================= GROUP MESSAGES ================= */
  const allMessages = useMemo(() => {
    const sorted = [...messages, ...optimisticMessages];
    sorted.sort(
      (a, b) =>
        new Date(a.dateTime || a.timestamp) -
        new Date(b.dateTime || b.timestamp)
    );
    return sorted;
  }, [messages, optimisticMessages]);
  const grouped = useMemo(() => groupMessagesByDate(allMessages), [allMessages]);
  const replyMessageMap = useMemo(() => {
    return new Map(messages.map((message) => [message.msgId, message]));
  }, [messages]);
  const handleReplyJump = useCallback((msgId) => {
    if (!msgId) return;
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-blue-500");
    setTimeout(() => el.classList.remove("ring-2", "ring-blue-500"), 1200);
  }, []);
  const handleImageClick = useCallback((url, senderName, dateTime) => {
    setLightboxMedia({
      url,
      senderName,
      dateTime,
    });
  }, []);
  const effectiveLastSeen = useMemo(() => {
    const presenceCandidates = [
      // Live presence metadata should win when available.
      driver?.presence?.lastSeen,
      driver?.presenceLastSeen,
      driver?.lastActiveAt,
      driver?.onlineAt,
    ];

     const messageCandidates = [
  driver?.last_chat_time,
  messages.length
  ? messages[messages.length - 1]?.dateTime
  : null
];

    const fallbackCandidates = [
      // Previous header used only driver.lastSeen, which can be stale.
      driver?.lastSeen,
    ];

    const allCandidates = [
      ...presenceCandidates,
      ...messageCandidates,
      ...fallbackCandidates,
    ]
      .map(parseTimestampMs)
      .filter((ts) => typeof ts === "number" && Number.isFinite(ts));

    if (!allCandidates.length) return null;
    return new Date(Math.max(...allCandidates)).toISOString();
  }, [
    driver?.lastSeen,
    driver?.last_chat_time,
    driver?.lastActiveAt,
    driver?.onlineAt,
    driver?.presence,
    driver?.presenceLastSeen,
    messages,
  ]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#0b141a]">
      {/* ================= HEADER (WhatsApp-like) ================= */}
      <div className="px-4 py-3 border-b border-[#2c3e52] bg-[#1c2530] sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={driver.driver_image || "/default-user.png"}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="pt-1 flex items-center gap-2 min-w-0">
              <span className="font-semibold text-white truncate max-w-[260px]">
                {driver?.driver_name || "Unknown"}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-gray-300 min-w-0 max-w-[320px]">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{emailText}</span>
                {driver?.email ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyField(driver.email, "email")}
                    title="Copy email"
                    aria-label="Copy email"
                    className="h-5 w-5 text-gray-600 hover:text-white"
                  >
                    <Copy className="w-2 h-2" />
                  </Button>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-300 min-w-0 max-w-[220px]">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{phoneText}</span>
                {driver?.phone ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopyField(driver.phone, "phone number")}
                    title="Copy phone number"
                    aria-label="Copy phone number"
                    className="h-5 w-5 text-gray-600 hover:text-white"
                  >
                    <Copy className="w-2 h-2" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="pt-1 text-xs text-gray-400">{formatLastSeen(effectiveLastSeen)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectionMode(false);
                  setSelected([]);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteSelected}
                disabled={selected.length === 0}
                variant="ghost"
                size="icon"
                className={selected.length ? "text-red-500 hover:text-red-600" : "text-gray-600"}
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.8} />
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={handleDeleteSelected}
                disabled={selected.length === 0}
                variant="ghost"
                size="icon"
                className={selected.length ? "text-red-500 hover:text-red-600" : "text-gray-600"}
              >
                <Trash2 className="h-5 w-5" strokeWidth={1.8} />
              </Button>
              {canDeleteAllMessages && (
                <Button onClick={handleDeleteAll} variant="ghost" size="sm" className="bg-red-900 text-red-100 hover:bg-red-600 hover:text-white">
                  Delete All
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Context menu (right-click on message) */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[100] min-w-[140px] rounded-lg border border-gray-700 bg-[#161b22] py-1 shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#1d232a]"
              onClick={handleContextReply}
            >
              Reply
            </button>
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-[#1d232a]"
              onClick={handleContextSelect}
            >
              Select
            </button>
          </div>,
          document.body
        )}

      {/* ================= MESSAGE AREA (fixed header above, fixed footer below) ================= */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {loading ? (
          <ConversationListShimmer />
        ) : (
          <>
            <div
              ref={messagesContainerRef}
              onScroll={updateIsAtBottom}
              className={`flex-1 overflow-y-auto chat-list-scroll space-y-6 bg-[#0b141a] chat-bg-pattern ${selectionMode ? "pl-2 pr-4 pt-4 pb-4" : "p-4"}`}
            >
              {Object.keys(grouped).length === 0 && (
                <p className="text-center text-[#8696a0] text-sm mt-6">
                  No messages yet
                </p>
              )}

              {Object.keys(grouped).map((date) => (
          <div key={date}>
            <div className="text-center text-[#8696a0] text-xs my-2">{date}</div>
            {grouped[date].map((msg, idx) => {
              const isSelected = selected.includes(msg.msgId);
              const lastMsg = messages.length ? messages[messages.length - 1] : null;
              const isLastMessageInChat = lastMsg && msg.msgId === lastMsg.msgId;
              const senderName = msg.type === 1
                ? (msg.sendername ?? "You")
                : (driver?.driver_name ?? msg.sendername ?? "Driver");
              const prevMsg = grouped[date][idx - 1];
              const sameType = prevMsg && prevMsg.type === msg.type;
              const sameAdmin =
                sameType &&
                msg.type === 1 &&
                (prevMsg.sendername ?? "") === (msg.sendername ?? "");
              const showSenderName = !prevMsg || !sameType || !sameAdmin;
              const replyTargetId = resolveReplyTargetId(msg);
              // Prefer resolving the live target from currently loaded thread messages.
              const liveReplyTarget = replyTargetId
                ? replyMessageMap.get(replyTargetId)
                : null;
              // Fall back to legacy/mobile reply snapshot when the target message is not loaded.
              const replyToMessage = liveReplyTarget || msg.replyToSnapshot || null;
              return (
                <div
                  key={msg.msgId}
                  id={`msg-${msg.msgId}`}
                  className={`flex items-start gap-2 rounded-lg transition-colors ${
                    selectionMode
                      ? isSelected
                        ? "bg-[#1f3146]"
                        : "hover:bg-[#162436]"
                      : "relative"
                  }`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelect(msg.msgId);
                    }
                  }}
                  onContextMenu={(e) => openContextMenu(e, msg)}
                >
                  {selectionMode && (
                    <div className="flex-shrink-0 pt-6">
                      <Checkbox
                        checked={selected.includes(msg.msgId)}
                        onCheckedChange={() => toggleSelect(msg.msgId)}
                        onClick={(e) => e.stopPropagation()}
                        className="border-gray-500 data-[state=checked]:bg-[#1f6feb] data-[state=checked]:border-[#1f6feb]"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <ChatMessageBubble
                      msg={msg}
                      isBroadcast={isBroadcastMessage(msg)}
                      senderName={senderName}
                      showSenderName={showSenderName}
                      replyToMessage={replyToMessage}
                      replyTargetId={replyTargetId}
                      isLastMessageInChat={isLastMessageInChat}
                      onReplyClick={handleReplyJump}
                      onImageClick={(url) => handleImageClick(url, senderName, msg?.dateTime)}
                      onDownloadMedia={(url) => downloadChatMedia(url, senderName, msg?.dateTime)}
                    />

                  </div>
                </div>
              );
            })}
          </div>
        ))}
              <div ref={bottomRef} />
            </div>
            {!isAtBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-4 right-5 rounded-full border border-[#1f6feb] bg-transparent p-2.5 text-[#6ca8ff] shadow-lg hover:bg-[#1f6feb]/45 focus:outline-none focus:ring-2 focus:ring-[#1f6feb] focus:ring-offset-2 focus:ring-offset-[#0b141a] z-10"
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>
      {/* ================= INPUT BAR (fixed footer; show shimmer when loading) ================= */}
      {loading ? (
        <div className="p-3 border-t border-[#2c3e52] bg-[#1c2530] sticky bottom-0 flex items-end gap-2">
          <div className="h-9 w-9 rounded-full bg-[#243644] animate-pulse flex-shrink-0" />
          <div className="flex-1 h-12 rounded-full bg-[#243644] animate-pulse max-w-[400px]" />
          <div className="h-11 w-11 rounded-full bg-[#243644] animate-pulse flex-shrink-0" />
        </div>
      ) : (
        <ChatComposer
          disabled={false}
          inputRef={inputRef}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          showAttachmentOptions={showAttachmentOptions}
          setShowAttachmentOptions={setShowAttachmentOptions}
          openFilePicker={openFilePicker}
          onSend={handleSend}
          selectedFile={selectedFile}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onPreviewSelectedFile={() => setShowFilePreview(true)}
          onRemoveSelectedFile={() => {
            setSelectedFile(null);
            setShowFilePreview(false);
          }}
          resetKey={driverId}
        />
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Delete confirmation dialog">
          <div className="w-full max-w-md rounded-lg border border-[#2c3e52] bg-[#1c2530] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{deleteConfirmTitle}</h3>
              <button
                type="button"
                onClick={() => {
                  if (isDeleteInProgress) return;
                  setIsDeleteConfirmOpen(false);
                  setDeleteActionType(null);
                }}
                className="text-gray-400 hover:text-white"
                disabled={isDeleteInProgress}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-300">{deleteConfirmDescription}</p>
            <p className="text-xs text-gray-400">This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-800 hover:bg-[#2c3e52] hover:text-white"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setDeleteActionType(null);
                }}
                disabled={isDeleteInProgress}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleConfirmDelete}
                disabled={isDeleteInProgress}
              >
                {isDeleteInProgress ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BROADCAST MESSAGE DIALOG ================= */}
      {showBroadcastDialog && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Broadcast message dialog">
          <div className="w-full max-w-md rounded-lg border border-[#2c3e52] bg-[#1c2530] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Broadcast Message</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isBroadcasting) return;
                  setShowBroadcastDialog(false);
                  setSelectedBroadcastFile(null);
                  setShowBroadcastAttachmentOptions(false);
                }}
                className="text-gray-400 hover:text-white"
                disabled={isBroadcasting}
                aria-label="Close broadcast dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-300">Send a message to all users at once</p>
            <input
              ref={broadcastFileInputRef}
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={handleBroadcastFileSelect}
              className="hidden"
              aria-label="Attach file to broadcast"
            />
            <div className="flex items-end gap-3">
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Enter your broadcast message..."
                className="h-24 flex-1 rounded-lg border border-[#3d5a80] bg-[#2c3e52] px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                disabled={isBroadcasting}
              />
              <div className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full text-[#8696a0] hover:bg-[#2c3e52] hover:text-[#e9edef]"
                  onClick={() => setShowBroadcastAttachmentOptions((prev) => !prev)}
                  disabled={isBroadcasting}
                  aria-label="Attach file to broadcast"
                  aria-expanded={showBroadcastAttachmentOptions}
                  aria-haspopup="true"
                >
                  <Paperclip className="h-5 w-5" strokeWidth={1.8} />
                </Button>
                {showBroadcastAttachmentOptions && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowBroadcastAttachmentOptions(false)}
                      aria-hidden="true"
                    />
                    <div
                      className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-[#2c3e52] bg-[#1c2530] py-2 shadow-xl"
                      role="menu"
                      aria-label="Choose attachment type"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                        onClick={() => openBroadcastFilePicker("image/*")}
                        role="menuitem"
                      >
                        <Image className="h-5 w-5 text-[#8ab4f8]" aria-hidden="true" />
                        <span className="text-sm">Photo</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                        onClick={() => openBroadcastFilePicker("video/*")}
                        role="menuitem"
                      >
                        <Video className="h-5 w-5 text-[#b5a3ff]" aria-hidden="true" />
                        <span className="text-sm">Video</span>
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                        onClick={() => openBroadcastFilePicker("application/pdf")}
                        role="menuitem"
                      >
                        <FileText className="h-5 w-5 text-[#fca5a5]" aria-hidden="true" />
                        <span className="text-sm">PDF</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {selectedBroadcastFile && !(selectedBroadcastFile instanceof File) && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[#3d5a80] bg-[#243544] px-3 py-2 text-sm text-gray-200">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-gray-400">
                    <Paperclip className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-100">
                      {selectedBroadcastFile.name || "Attachment ready"}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Ready to send with broadcast
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded p-1 text-gray-400 hover:text-white"
                  onClick={() => setSelectedBroadcastFile(null)}
                  disabled={isBroadcasting}
                  aria-label="Remove broadcast attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-800 hover:bg-[#2c3e52] hover:text-white"
                onClick={() => {
                  setShowBroadcastDialog(false);
                  setBroadcastMessage("");
                  setSelectedBroadcastFile(null);
                  setShowBroadcastAttachmentOptions(false);
                }}
                disabled={isBroadcasting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleSendBroadcast}
                disabled={
                  isBroadcasting ||
                  (!broadcastMessage.trim() &&
                    !(selectedBroadcastFile && !(selectedBroadcastFile instanceof File)))
                }
              >
                {isBroadcasting ? "Sending..." : "Send Broadcast"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showFilePreview && selectedFile && driverId && (
        <FilePreviewModal
          file={selectedFile}
          adminId={adminId}
          driverId={driverId}
          onClose={() => {
            setShowFilePreview(false);
          }}
          onSent={handleAttachmentSent}
        />
      )}

      {showBroadcastFilePreview && selectedBroadcastFile instanceof File && (
        <FilePreviewModal
          file={selectedBroadcastFile}
          adminId={adminId}
          uploadContext="all"
          uploadFile={(file, nextAdminId, recipientType, onProgress, onError, onComplete) =>
            uploadBroadcastFile(file, nextAdminId, recipientType, onProgress, onError, onComplete)
          }
          title="Attach to broadcast"
          onClose={() => {
            setShowBroadcastFilePreview(false);
            setShowBroadcastAttachmentOptions(false);
            // DO NOT clear selectedBroadcastFile here - it will be set by handleBroadcastAttachmentSent after successful upload
          }}
          onSent={handleBroadcastAttachmentSent}
        />
      )}

      {/* Image lightbox dialog */}
      {lightboxMedia?.url && (
        <div
          className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxMedia(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="absolute right-38 top-10 flex items-center gap-2">
            <a
              href="#"
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Download image"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLightboxDownload();
              }}
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
              onClick={() => setLightboxMedia(null)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <img
            src={lightboxMedia.url}
            alt="Full size"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
