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

import { useEffect, useRef, useState } from "react";
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

/* ================= LAST SEEN FORMATTER ================= */
function formatLastSeen(lastSeen) {
  if (!lastSeen || !lastSeen._seconds) return "Recently";

  const date = new Date(lastSeen._seconds * 1000);

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
  const [text, setText] = useState("");
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

    // Mark messages as seen when chat window opens
    if (markMessagesAsSeen) {
      markMessagesAsSeen(driverId).catch((error) => {
        console.error("Failed to mark messages as seen:", error);
      });
    }

    const unsubscribe = subscribeMessages(driverId, (nextMessages) => {
      console.log(nextMessages);
      setMessages(nextMessages || []);
      setLoading(false);
      scrollToBottom();
      
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

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function toggleSelect(msgId) {
    setSelected((prev) =>
      prev.includes(msgId)
        ? prev.filter((id) => id !== msgId)
        : [...prev, msgId]
    );
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
    scrollToBottom();
    setText("");

    await sendMessage(driverId, text);
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
          <Button
            onClick={handleDeleteSelected}
            disabled={selected.length === 0}
            variant="ghost"
            size="icon"
            className={`text-xl ${
              selected.length
                ? "text-red-500 hover:text-red-600"
                : "text-gray-600"
            }`}
          >
            🗑
          </Button>

          <Button
            onClick={handleDeleteAll}
            variant="destructive"
            size="sm"
          >
            Delete All
          </Button>
        </div>
      </div>

      {/* ================= MESSAGE AREA ================= */}
      <div className="flex-1 overflow-y-auto chat-list-scroll p-4 space-y-6 bg-[#0d1117]">
        {Object.keys(grouped).length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-6">
            No messages yet
          </p>
        )}

        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <div className="text-center text-gray-400 text-xs my-2">{date}</div>

            {grouped[date].map((msg) => (
              <div
                key={msg.msgId}
                className="relative"
                onClick={() => toggleSelect(msg.msgId)}
              >
                {selected.includes(msg.msgId) && (
                  <div className="absolute -left-3 top-3 w-3 h-3 bg-red-500 rounded-full" />
                )}

                <ChatMessageBubble msg={msg} />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ================= INPUT BAR ================= */}
      <div className="p-4 border-t border-gray-700 bg-[#111827] sticky bottom-0 flex gap-2">
        <Button variant="ghost" size="icon" className="text-2xl text-gray-300 hover:text-white">📎</Button>

        <Input
          className="flex-1 bg-[#1f2937]"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
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
