// const ChatListItem = ({ driver, onClick }) => {
//   return (
//     <div
//       onClick={onClick}
//       className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1b222c]"
//     >
//       <img
//         src={driver.driver_image || "/default-user.png"}
//         alt="profile"
//         className="w-10 h-10 rounded-full"
//       />

//       <div className="flex-1">
//         <p className="font-semibold text-sm">{driver.driver_name}</p>
//         <p className="text-gray-400 text-xs truncate">
//           {driver.last_message || "No messages yet"}
//         </p>
//       </div>

//       <span className="text-[10px] text-gray-500">
//         {driver.last_chat_time || ""}
//       </span>
//     </div>
//   );
// };

// export default ChatListItem;

import { motion } from "framer-motion";

function formatLastChatTime(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (msgDate.getTime() === today.getTime()) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const ChatListItem = ({ driver, onClick, isSelected }) => {
  const time = formatLastChatTime(driver.last_chat_time);

  const unreadCount = driver.unreadCount || 0;
  const itemStateClass = isSelected
    ? "bg-[#253243] ring-1 ring-inset ring-[#4c8dff]"
    : unreadCount > 0
    ? "bg-[#1d232a]"
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
      }}
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors hover:bg-[#1b222c] ${itemStateClass}`}
    >
      <div className="relative">
      <img
        src={driver.driver_image || "/default-user.png"}
        alt="profile"
        className="w-10 h-10 rounded-full"
      />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#1f6feb] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 border-2 border-[#0d1117]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`font-semibold text-sm truncate ${
            unreadCount > 0 ? "text-white font-bold" : ""
          }`}>
          {driver.driver_name}
        </p>
        </div>
        <p className={`text-xs truncate ${
          unreadCount > 0 ? "text-gray-300 font-medium" : "text-gray-400"
        }`}>
          {driver.last_message && driver.last_message.trim() !== ""
            ? driver.last_message
            : "—"}
        </p>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <span className="text-[10px] text-gray-500 whitespace-nowrap">
          {time}
        </span>
        {unreadCount > 0 && (
          <div className="w-2 h-2 bg-[#1f6feb] rounded-full mt-0.5"></div>
        )}
      </div>
    </motion.div>
  );
};

export default ChatListItem;
