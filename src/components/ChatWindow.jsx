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

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Mail, Paperclip, Phone, Trash2, X } from "lucide-react";
import {
  subscribeMessages as defaultSubscribeMessages,
  sendMessage as defaultSendMessage,
  deleteChatHistory as defaultDeleteChatHistory,
  deleteSpecificMessage as defaultDeleteSpecificMessage,
} from "../services/chatAPI";

import ChatMessageBubble from "./ChatMessageBubble";
import FilePreviewModal from "./FilePreviewModal";
import { groupMessagesByDate } from "../utils/groupMessages";
import ChatWindowSkeleton from "./skeletons/ChatWindowSkeleton";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

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

export default function ChatWindow({ driver, chatApi }) {
  const { user } = useAuth();
  const adminId = user?.userid || user?.userId || "admin";
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
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

    return candidate;
  })();

  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const shouldScrollToBottomRef = useRef(true);

  const {
    subscribeMessages,
    sendMessage,
    deleteChatHistory,
    deleteSpecificMessage,
    markMessagesAsSeen,
  } = chatApi || {
    subscribeMessages: defaultSubscribeMessages,
    sendMessage: defaultSendMessage,
    deleteChatHistory: defaultDeleteChatHistory,
    deleteSpecificMessage: defaultDeleteSpecificMessage,
    markMessagesAsSeen: async () => ({ success: true }),
  };

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!driverId) {
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

    // Mark messages as seen when chat window opens
    if (markMessagesAsSeen) {
      markMessagesAsSeen(driverId).catch((error) => {
        console.error("Failed to mark messages as seen:", error);
      });
    }

    // Reset scroll flag when driver changes
    shouldScrollToBottomRef.current = true;

    const unsubscribe = subscribeMessages(driverId, (nextMessages) => {
      setMessages(nextMessages || []);
      setLoading(false);
      
      // Mark messages as seen after loading
      if (markMessagesAsSeen) {
        markMessagesAsSeen(driverId).catch((error) => {
          console.error("Failed to mark messages as seen:", error);
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [driverId, subscribeMessages, markMessagesAsSeen]);

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
  

  // Scroll to bottom when messages change (after initial load or new messages)
  useEffect(() => {
    if (!messages.length || !shouldScrollToBottomRef.current) return;
  
    scrollToBottom("auto");
    shouldScrollToBottomRef.current = false;
  }, [messages.length, scrollToBottom]);
  

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
      setSelectedFile(file);
      setShowFilePreview(true);
    }
    e.target.value = "";
  }

  function handleAttachmentSent(url) {
    const tempMsg = {
      msgId: Math.random().toString(),
      type: 1,
      content: { message: "", attachmentUrl: url },
      dateTime: new Date().toISOString(),
      status: 0,
      sendername: user?.name || user?.userid || "Admin",
    };
    setMessages((prev) => [...prev, tempMsg]);
    setSelectedFile(null);
    setShowFilePreview(false);
    setReplyTo(null);
    shouldScrollToBottomRef.current = true;
    scrollToBottom("smooth");
    sendMessage(driverId, "", undefined, replyTo?.msgId ?? null, url).catch((err) => {
      console.error("Failed to send attachment message:", err);
    });
  }

  /* ================= SEND MESSAGE ================= */
  async function handleSend() {
    if (!text.trim()) return;

    const tempMsg = {
      msgId: Math.random().toString(),
      type: 1, // ADMIN
      content: { message: text, attachmentUrl: "" },
      dateTime: new Date().toISOString(),
      status: 0,
    };

    setMessages((prev) => [...prev, tempMsg]);
    setText("");
    
    // Refocus input for better UX (allows continuous typing)
    inputRef.current?.focus();
    
    // Always scroll smoothly when sending a message to show the new message
    shouldScrollToBottomRef.current = true;
    scrollToBottom("smooth");

    await sendMessage(driverId, text, undefined, replyTo?.msgId ?? null);
    setReplyTo(null);
  }

  /* ================= DELETE SELECTED ================= */
  async function handleDeleteSelected() {
    if (selected.length === 0) return;

    for (let id of selected) {
      await deleteSpecificMessage(id, driverId);
    }

    setMessages((prev) => prev.filter((m) => !selected.includes(m.msgId)));
    setSelected([]);
  }

  /* ================= DELETE ALL ================= */
  async function handleDeleteAll() {
    if (!window.confirm("Delete all messages?")) return;

    await deleteChatHistory(driverId);
    setMessages([]);
    setSelected([]);
  }

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

  const handleCopyMessageText = useCallback(async (messageText) => {
    if (!messageText) return;

    try {
      await navigator.clipboard.writeText(String(messageText));
      toast.success("Message copied");
    } catch {
      toast.error("Failed to copy message");
    }
  }, []);

  const handleCopyMediaToClipboard = useCallback(async (url) => {
    if (!url) return;

    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }

      const blob = await response.blob();
      if (navigator.clipboard?.write && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type || "application/octet-stream"]: blob,
          }),
        ]);
        toast.success("Media copied");
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Media link copied");
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Media link copied");
      } catch {
        toast.error("Failed to copy media");
      }
    }
  }, []);

  /* ================= GROUP MESSAGES ================= */
  const grouped = groupMessagesByDate(messages);

  /* ================= LOADER ================= */
  if (loading) {
    return <ChatWindowSkeleton />;
  }

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
            <div className="pt-1 text-xs text-gray-400">{formatLastSeen(driver?.lastSeen)}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
              <Button onClick={handleDeleteAll} variant="destructive" size="sm">
                Delete All
              </Button>
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

      {/* ================= MESSAGE AREA (WhatsApp-like bg) ================= */}
      <div
        ref={messagesContainerRef}
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
              const senderName = msg.type === 1
                ? (msg.sendername ?? "You")
                : (driver?.driver_name ?? msg.sendername ?? "Driver");
              const prevMsg = grouped[date][idx - 1];
              const showSenderName = !prevMsg || prevMsg.type !== msg.type;
              const replyToMessage = msg.replyTo
                ? messages.find((m) => m.msgId === msg.replyTo)
                : null;
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
                      senderName={senderName}
                      showSenderName={showSenderName}
                      replyToMessage={replyToMessage}
                      onReplyClick={(msgId) => {
                        const el = document.getElementById(`msg-${msgId}`);
                        el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        el?.classList.add("ring-2", "ring-blue-500");
                        setTimeout(() => el?.classList.remove("ring-2", "ring-blue-500"), 1200);
                      }}
                      onImageClick={(url) =>
                        setLightboxMedia({
                          url,
                          senderName,
                          dateTime: msg?.dateTime,
                        })
                      }
                      onDownloadMedia={(url) =>
                        downloadChatMedia(url, senderName, msg?.dateTime)
                      }
                      onCopyMessage={handleCopyMessageText}
                      onCopyMedia={handleCopyMediaToClipboard}
                    />

                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {replyTo && (
  <div className="px-4 py-2 border-t border-[#2c3e52] bg-[#1c2530] flex items-center justify-between">
    <div className="border-l-4 border-[#1f6feb] pl-3">
      <p className="text-xs font-semibold text-[#1f6feb]">
        Replying to {replyTo.senderName}
      </p>
      <p className="text-xs text-[#8696a0] truncate max-w-[260px]">
        {typeof replyTo.message === "string"
          ? replyTo.message
          : replyTo.message != null
            ? String(replyTo.message)
            : ""}
      </p>
    </div>
    <button
      className="text-[#8696a0] hover:text-[#e9edef] p-1"
      onClick={() => setReplyTo(null)}
      aria-label="Cancel reply"
    >
      ✕
    </button>
  </div>
)}

      {/* ================= INPUT BAR (WhatsApp-like) ================= */}
      <div className="p-3 border-t border-[#2c3e52] bg-[#1c2530] sticky bottom-0 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Attach file"
        />
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full text-[#8696a0] hover:bg-[#2c3e52] hover:text-[#e9edef]"
            onClick={() => setShowAttachmentOptions((prev) => !prev)}
            aria-label="Attach file"
            aria-expanded={showAttachmentOptions}
            aria-haspopup="true"
          >
            <Paperclip className="h-5 w-5" strokeWidth={1.8} />
          </Button>
          {showAttachmentOptions && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAttachmentOptions(false)}
                aria-hidden="true"
              />
              <div
                className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-[#2c3e52] bg-[#1c2530] py-2 shadow-xl"
                role="menu"
                aria-label="Choose attachment type"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                  onClick={() => openFilePicker("image/*,video/*")}
                  role="menuitem"
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-sm">Photo / Video</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                  onClick={() => openFilePicker("application/pdf")}
                  role="menuitem"
                >
                  <span className="text-2xl">📄</span>
                  <span className="text-sm">PDF</span>
                </button>
              </div>
            </>
          )}
        </div>

        <Input
          className="flex-1 rounded-full bg-[#2c3e52] border-0 text-[#e9edef] placeholder:text-[#8696a0] py-5 px-4 focus-visible:ring-[#1f6feb]"
          placeholder="Type a message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          ref={inputRef}
        />

        <Button
          onClick={handleSend}
          size="icon"
          className="rounded-full bg-[#1f6feb] hover:bg-[#1a5fd4] text-white h-11 w-11 flex-shrink-0"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </Button>
      </div>

      {showFilePreview && selectedFile && driverId && (
        <FilePreviewModal
          file={selectedFile}
          adminId={adminId}
          driverId={driverId}
          onClose={() => {
            setShowFilePreview(false);
            setSelectedFile(null);
          }}
          onSent={handleAttachmentSent}
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
          <div className="absolute right-4 top-4 flex items-center gap-2">
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
