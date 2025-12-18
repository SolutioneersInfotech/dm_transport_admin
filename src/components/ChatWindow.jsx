// import { useEffect, useState } from "react";
// import { fetchMessages, sendMessage } from "../services/chatAPI";
// import ChatMessageBubble from "./ChatMessageBubble";

// export default function ChatWindow({ driver }) {
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   useEffect(() => {
//     load();
//   }, [driver]);

//   async function load() {
//     const res = await fetchMessages(driver.userid);
//     setMessages(res?.messages || []);
//   }

//   async function handleSend() {
//     if (!text.trim()) return;

//     const newMsg = await sendMessage(driver.userid, text);
//     setMessages((prev) => [...prev, newMsg]);
//     setText("");
//   }

//   return (
//     <div className="flex flex-col h-full">

//       {/* HEADER */}
//       <div className="p-4 border-b border-gray-700 flex items-center gap-3">
//         <img
//           src={driver.driver_image || "/default-user.png"}
//           className="w-10 h-10 rounded-full"
//         />
//         <div>
//           <p className="font-semibold">{driver.driver_name}</p>
//           <p className="text-gray-400 text-xs">
//             Last seen: {driver.last_seen || "Recently"}
//           </p>
//         </div>
//       </div>

//       {/* CHAT HISTORY */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, index) => (
//           <ChatMessageBubble key={index} msg={msg} />
//         ))}
//       </div>

//       {/* INPUT */}
//       <div className="p-4 border-t border-gray-700 flex gap-2">
//         <input
//           className="flex-1 p-2 rounded bg-[#1f2937] outline-none"
//           value={text}
//           placeholder="Type a message..."
//           onChange={(e) => setText(e.target.value)}
//         />
//         <button
//           onClick={handleSend}
//           className="bg-blue-600 px-4 rounded hover:bg-blue-700"
//         >
//           Send
//         </button>
//       </div>

//     </div>
//   );
// }


// import { useEffect, useState } from "react";
// import { fetchMessages, sendMessage } from "../services/chatAPI";
// import ChatMessageBubble from "./ChatMessageBubble";

// export default function ChatWindow({ driver }) {
//   const [messages, setMessages] = useState([]);
//   const [text, setText] = useState("");

//   useEffect(() => {
//     loadMessages();
//   }, [driver]);

//   async function loadMessages() {
//     const res = await fetchMessages(driver.userid);
//     setMessages(res?.messages || []);
//   }

//   async function handleSend() {
//     if (!text.trim()) return;

//     const newMsg = {
//       type: 1, // ADMIN
//       content: { message: text, attachmentUrl: "" },
//       dateTime: new Date().toISOString(),
//     };

//     setMessages((prev) => [...prev, newMsg]);

//     await sendMessage(driver.userid, text);
//     setText("");
//   }

//   return (
//     <div className="flex flex-col h-full">

//       {/* HEADER */}
//       <div className="p-4 border-b border-gray-700 flex items-center gap-3">
//         <img
//           src={driver.image || "/default-user.png"}
//           className="w-10 h-10 rounded-full"
//         />
//         <div>
//           <p className="font-semibold">{driver.name}</p>
//           <p className="text-gray-400 text-xs">
//             Last seen: {driver.lastSeen || "Recently"}
//           </p>
//         </div>
//       </div>

//       {/* CHAT AREA */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-3">
//         {messages.map((msg, i) => (
//           <ChatMessageBubble key={i} msg={msg} />
//         ))}
//       </div>

//       {/* INPUT BOX */}
//       <div className="p-4 border-t border-gray-700 flex gap-2">
//         <input
//           className="flex-1 p-2 rounded bg-[#1f2937] outline-none"
//           placeholder="Type a message..."
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//         />
//         <button
//           onClick={handleSend}
//           className="bg-blue-600 px-4 rounded hover:bg-blue-700"
//         >
//           Send
//         </button>
//       </div>

//     </div>
//   );
// }


// import { useEffect, useRef, useState } from "react";
// import {
//   fetchMessages,
//   sendMessage,
//   deleteChatHistory,
//   deleteSpecificMessage,
// } from "../services/chatAPI";

// import ChatMessageBubble from "./ChatMessageBubble";
// import { groupMessagesByDate } from "../utils/groupMessages";

// export default function ChatWindow({ driver }) {
//   const [messages, setMessages] = useState([]);
//   const [selected, setSelected] = useState([]); // <-- selected for delete
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
//       prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
//     );
//   }

//   async function handleSend() {
//     if (!text.trim()) return;

//     const tempMsg = {
//       msgId: Math.random().toString(),
//       type: 1,
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

//     // API delete
//     for (let msgId of selected) {
//       await deleteSpecificMessage(msgId);
//     }

//     // Local delete
//     setMessages((prev) => prev.filter((m) => !selected.includes(m.msgId)));
//     setSelected([]);
//   }

//   async function handleDeleteAll() {
//     const ok = window.confirm("Delete all messages?");
//     if (!ok) return;

//     await deleteChatHistory(driver.userid);
//     setMessages([]);
//     setSelected([]);
//   }

//   const grouped = groupMessagesByDate(messages);

//   return (
//     <div className="flex flex-col h-full">

//       {/* HEADER BAR with Delete Buttons */}
//       <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] flex justify-between items-center">

//         {/* LEFT: Driver Info */}
//         <div className="flex items-center gap-3">
//           <img
//             src={driver.image || "/default-user.png"}
//             className="w-10 h-10 rounded-full"
//           />
//           <div>
//             <p className="font-semibold">{driver.name}</p>
//             <p className="text-gray-400 text-xs">Last seen: Recently</p>
//           </div>
//         </div>

//         {/* RIGHT: Delete Buttons */}
//         <div className="flex items-center gap-3">

//           {/* Delete Selected */}
//           <button
//             onClick={handleDeleteSelected}
//             disabled={selected.length === 0}
//             className={`px-3 py-1 rounded text-sm border 
//               ${
//                 selected.length > 0
//                   ? "border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
//                   : "border-gray-600 text-gray-500 cursor-not-allowed"
//               }
//             `}
//           >
//             Delete
//           </button>

//           {/* Delete All */}
//           <button
//             onClick={handleDeleteAll}
//             className="px-3 py-1 rounded text-sm border border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
//           >
//             Delete All
//           </button>
//         </div>
//       </div>

//       {/* CHAT BODY */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0d1117]">

//         {Object.keys(grouped).map((dateLabel) => (
//           <div key={dateLabel}>
//             <div className="text-center text-gray-400 text-xs my-2">
//               {dateLabel}
//             </div>

//             {grouped[dateLabel].map((msg) => (
//               <div
//                 key={msg.msgId}
//                 className="relative"
//                 onClick={() => toggleSelect(msg.msgId)}
//               >
//                 {/* SELECT DOT / HIGHLIGHT */}
//                 {selected.includes(msg.msgId) && (
//                   <div className="absolute -left-3 top-3 w-3 h-3 rounded-full bg-red-500"></div>
//                 )}

//                 <ChatMessageBubble msg={msg} />
//               </div>
//             ))}
//           </div>
//         ))}

//         <div ref={bottomRef}></div>
//       </div>

//       {/* INPUT BOX */}
//       <div className="p-4 border-t border-gray-700 flex gap-2 bg-[#111827]">
//         <input
//           className="flex-1 p-2 rounded bg-[#1f2937] outline-none"
//           placeholder="Type a message..."
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && handleSend()}
//         />
//         <button
//           onClick={handleSend}
//           className="bg-blue-600 px-4 rounded hover:bg-blue-700"
//         >
//           Send
//         </button>
//       </div>

//     </div>
//   );
// }


// import { useEffect, useRef, useState } from "react";
// import {
//   fetchMessages,
//   sendMessage,
//   deleteChatHistory,
//   deleteSpecificMessage,
// } from "../services/chatAPI";

// import ChatMessageBubble from "./ChatMessageBubble";
// import { groupMessagesByDate } from "../utils/groupMessages";

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
//       prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
//     );
//   }

//   async function handleSend() {
//     if (!text.trim()) return;

//     const tempMsg = {
//       msgId: Math.random().toString(),
//       type: 1,
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

//     for (let msgId of selected) {
//       await deleteSpecificMessage(msgId);
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
//     <div className="flex flex-col h-full">

//       {/* ================= HEADER BAR ================= */}
//       <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] flex justify-between items-center sticky top-0 z-40">

//         {/* Driver Info */}
//         <div className="flex items-center gap-3">
//           <img
//             src={driver.image || "/default-user.png"}
//             className="w-10 h-10 rounded-full"
//           />
//           <div>
//             <p className="font-semibold">{driver.name}</p>
//             <p className="text-gray-400 text-xs">Last seen: Recently</p>
//           </div>
//         </div>

//         {/* Right Side Icons */}
//         <div className="flex items-center gap-4">

//           {/* Delete Selected Icon */}
//           <button
//             onClick={handleDeleteSelected}
//             disabled={selected.length === 0}
//             className={`text-xl ${
//               selected.length > 0
//                 ? "text-red-500 hover:text-red-600"
//                 : "text-gray-600 cursor-not-allowed"
//             }`}
//           >
//             🗑
//           </button>

//           {/* Delete All Button */}
//           <button
//             onClick={handleDeleteAll}
//             className="px-3 py-1 rounded text-sm border border-red-500 text-red-400 hover:bg-red-600 hover:text-white"
//           >
//             Delete All
//           </button>

//         </div>
//       </div>

//       {/* ================= CHAT MESSAGES AREA ================= */}
//       <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0d1117]">

//         {Object.keys(grouped).map((dateLabel) => (
//           <div key={dateLabel}>
//             <div className="text-center text-gray-400 text-xs my-2">
//               {dateLabel}
//             </div>

//             {grouped[dateLabel].map((msg) => (
//               <div
//                 key={msg.msgId}
//                 className="relative"
//                 onClick={() => toggleSelect(msg.msgId)}
//               >

//                 {/* Red Dot for Selected Message */}
//                 {selected.includes(msg.msgId) && (
//                   <div className="absolute -left-3 top-3 w-3 h-3 rounded-full bg-red-500"></div>
//                 )}

//                 <ChatMessageBubble msg={msg} />
//               </div>
//             ))}
//           </div>
//         ))}

//         <div ref={bottomRef}></div>
//       </div>

//       {/* ================= INPUT BAR ================= */}
//       <div className="p-4 border-t border-gray-700 flex gap-2 bg-[#111827] sticky bottom-0">

//         {/* WhatsApp style attach icon */}
//         <button className="text-2xl text-gray-300 hover:text-white">
//           📎
//         </button>

//         {/* Input Box */}
//         <input
//           className="flex-1 p-2 rounded bg-[#1f2937] outline-none"
//           placeholder="Type a message..."
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && handleSend()}
//         />

//         {/* SEND BUTTON */}
//         <button
//           onClick={handleSend}
//           className="bg-blue-600 px-4 rounded hover:bg-blue-700"
//         >
//           Send
//         </button>
//       </div>

//     </div>
//   );
// }

import { useEffect, useRef, useState } from "react";
import {
  fetchMessages,
  sendMessage,
  deleteChatHistory,
  deleteSpecificMessage,
} from "../services/chatAPI";

import ChatMessageBubble from "./ChatMessageBubble";
import { groupMessagesByDate } from "../utils/groupMessages";

export default function ChatWindow({ driver }) {
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState([]);
  const [text, setText] = useState("");

  const bottomRef = useRef();

  useEffect(() => {
    loadMessages();
  }, [driver]);

  async function loadMessages() {
    const res = await fetchMessages(driver.userid);
    setMessages(res?.messages || []);
    setSelected([]);
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function toggleSelect(msgId) {
    setSelected((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  }

  async function handleSend() {
    if (!text.trim()) return;

    const tempMsg = {
      msgId: Math.random().toString(),
      type: 1,
      content: { message: text, attachmentUrl: "" },
      dateTime: new Date().toISOString(),
      status: 0,
    };

    setMessages((prev) => [...prev, tempMsg]);
    scrollToBottom();

    await sendMessage(driver.userid, text);
    setText("");
  }

  async function handleDeleteSelected() {
    for (let id of selected) await deleteSpecificMessage(id);
    setMessages((prev) => prev.filter((m) => !selected.includes(m.msgId)));
    setSelected([]);
  }

  async function handleDeleteAll() {
    if (!window.confirm("Delete all messages?")) return;
    await deleteChatHistory(driver.userid);
    setMessages([]);
    setSelected([]);
  }

  const grouped = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* HEADER (STICKY) */}
      <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={driver.driver_image || "/default-user.png"} className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-semibold">{driver.driver_name}</p>
            <p className="text-gray-400 text-xs">Last seen: Recently</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDeleteSelected}
            disabled={selected.length === 0}
            className={`text-xl ${selected.length ? "text-red-500" : "text-gray-600 cursor-not-allowed"}`}
          >
            🗑
          </button>

          <button
            onClick={handleDeleteAll}
            className="px-3 py-1 border border-red-500 text-red-400 rounded hover:bg-red-600 hover:text-white"
          >
            Delete All
          </button>
        </div>
      </div>

      {/* MESSAGE AREA — ONLY THIS SCROLLS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#0d1117]">
        {Object.keys(grouped).map((date) => (
          <div key={date}>
            <div className="text-center text-gray-400 text-xs my-2">{date}</div>

            {grouped[date].map((msg) => (
              <div key={msg.msgId} className="relative" onClick={() => toggleSelect(msg.msgId)}>
                {selected.includes(msg.msgId) && (
                  <div className="absolute -left-3 top-3 w-3 h-3 bg-red-500 rounded-full"></div>
                )}
                <ChatMessageBubble msg={msg} />
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef}></div>
      </div>

      {/* INPUT BAR (STICKY BOTTOM) */}
      <div className="p-4 border-t border-gray-700 bg-[#111827] sticky bottom-0 flex gap-2">
        <button className="text-2xl text-gray-300 hover:text-white">📎</button>

        <input
          className="flex-1 bg-[#1f2937] p-2 rounded outline-none"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        <button className="bg-blue-600 px-4 rounded hover:bg-blue-700" onClick={handleSend}>
          Send
        </button>
      </div>

    </div>
  );
}
