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
import {
  subscribeMessages as defaultSubscribeMessages,
  sendMessage as defaultSendMessage,
  deleteChatHistory as defaultDeleteChatHistory,
  deleteSpecificMessage as defaultDeleteSpecificMessage,
} from "../services/chatAPI";

import ChatMessageBubble from "./ChatMessageBubble";
import { groupMessagesByDate } from "../utils/groupMessages";
import ChatWindowSkeleton from "./skeletons/ChatWindowSkeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";

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
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
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
      console.log(nextMessages);
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
      senderName: msg.type === 1 ? "You" : replySender,
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

  /* ================= GROUP MESSAGES ================= */
  const grouped = groupMessagesByDate(messages);

  /* ================= LOADER ================= */
  if (loading) {
    return <ChatWindowSkeleton />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={driver.driver_image || "/default-user.png"}
            className="w-10 h-10 rounded-full"
          />

          <div>
            <p className="font-semibold">{driver.driver_name}</p>
            <p className="text-gray-400 text-xs">
              Last seen: {formatLastSeen(driver.lastSeen)}
            </p>
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
                🗑
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
                🗑
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

      {/* ================= MESSAGE AREA ================= */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto chat-list-scroll space-y-6 bg-[#0d1117] ${selectionMode ? "pl-2 pr-4 pt-4 pb-4" : "p-4"}`}
      >
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-6">
            No messages yet
          </p>
        )}

        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <div className="text-center text-gray-400 text-xs my-2">{date}</div>

            {grouped[date].map((msg, idx) => {
              const senderName = msg.type === 1 ? "You" : (driver?.driver_name ?? "Driver");
              const prevMsg = grouped[date][idx - 1];
              const showSenderName = !prevMsg || prevMsg.type !== msg.type;
              const replyToMessage = msg.replyTo
                ? messages.find((m) => m.msgId === msg.replyTo)
                : null;
              return (
                <div
                  key={msg.msgId}
                  id={`msg-${msg.msgId}`}
                  className={`flex items-start gap-2 ${selectionMode ? "" : "relative"}`}
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
  <div className="px-4 py-2 border-t border-gray-700 bg-[#0f172a] flex items-center justify-between">
    <div className="border-l-4 border-blue-500 pl-3">
      <p className="text-xs font-semibold text-blue-400">
        Replying to {replyTo.senderName}
      </p>
      <p className="text-xs text-gray-300 truncate max-w-[260px]">
        {typeof replyTo.message === "string"
          ? replyTo.message
          : replyTo.message != null
            ? String(replyTo.message)
            : ""}
      </p>
    </div>

    <button
      className="text-gray-400 hover:text-white"
      onClick={() => setReplyTo(null)}
    >
      ✕
    </button>
  </div>
)}

      {/* ================= INPUT BAR ================= */}
      <div className="p-4 border-t border-gray-700 bg-[#111827] sticky bottom-0 flex gap-2">
        <Button variant="ghost" size="icon" className="text-2xl text-gray-300 hover:text-white">📎</Button>

        <Input
          className="flex-1 bg-[#1f2937]"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          ref={inputRef}
        />

        <Button
          onClick={handleSend}
          size="sm"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
