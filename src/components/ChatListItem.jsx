const ChatListItem = ({ driver, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#1b222c]"
    >
      <img
        src={driver.driver_image || "/default-user.png"}
        alt="profile"
        className="w-10 h-10 rounded-full"
      />

      <div className="flex-1">
        <p className="font-semibold text-sm">{driver.driver_name}</p>
        <p className="text-gray-400 text-xs truncate">
          {driver.last_message || "No messages yet"}
        </p>
      </div>

      <span className="text-[10px] text-gray-500">
        {driver.last_chat_time || ""}
      </span>
    </div>
  );
};

export default ChatListItem;

