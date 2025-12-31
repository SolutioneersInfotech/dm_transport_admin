import { useEffect, useState } from "react";
import ChatListItem from "./ChatListItem";
import {
  fetchUsersForChat as defaultFetchUsersForChat,
  fetchMessages as defaultFetchMessages,
} from "../services/chatAPI";
import SkeletonLoader from "./skeletons/Skeleton";

const ChatList = ({ onSelectDriver, chatApi }) => {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetchUsersForChat, fetchMessages } = chatApi || {
    fetchUsersForChat: defaultFetchUsersForChat,
    fetchMessages: defaultFetchMessages,
  };

  function getDriverId(driver) {
    return (
      driver?.userid ||
      driver?.userId ||
      driver?.contactId ||
      driver?.contactid ||
      driver?.id ||
      null
    );
  }

  useEffect(() => {
    loadDrivers();
  }, []);

  async function loadDrivers() {
    try {
      setLoading(true);

      const res = await fetchUsersForChat();

      if (!res?.users?.length) {
        setDrivers([]);
        return;
      }

      // 🔥 Attach last message to each user
      const withLastChat = await Promise.all(
        res.users.map(async (u) => {
          const userId = getDriverId(u);
          if (!userId) {
            return null;
          }

          try {
            const chat = await fetchMessages(userId);
            const msgs = chat?.messages || [];
            const lastMsg = msgs[msgs.length - 1];

            return {
              userid: userId,
              driver_name: u.name || u.driver_name,
              driver_image: u.profilePic || u.image || null,
              lastSeen: u.lastSeen || null,
              last_message: lastMsg?.content?.message || "",
              last_chat_time: lastMsg?.dateTime || null,
            };
          } catch {
            return {
              userid: userId,
              driver_name: u.name || u.driver_name,
              driver_image: u.profilePic || u.image || null,
              last_message: "",
              last_chat_time: null,
            };
          }
        })
      );

      // 🔥 SORT → latest chat first
      const driversWithIds = withLastChat.filter(Boolean);

      driversWithIds.sort((a, b) => {
        if (!a.last_chat_time) return 1;
        if (!b.last_chat_time) return -1;
        return (
          new Date(b.last_chat_time).getTime() -
          new Date(a.last_chat_time).getTime()
        );
      });

      setDrivers(driversWithIds);
    } finally {
      setLoading(false);
    }
  }

  const filtered = drivers.filter((d) =>
    d.driver_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* 🔍 SEARCH BAR (STICKY) */}
      <div className="p-5 border-b border-gray-700 sticky top-0 bg-[#0d1117] z-20">
        <input
          type="text"
          placeholder="Search drivers..."
          className="w-full p-2 bg-[#1f2937] rounded outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 📜 DRIVER LIST (ONLY THIS SCROLLS) */}
      {/* <div className="flex-1 overflow-y-auto"> */}
      <div className="flex-1 overflow-y-auto chat-list-scroll">
        {/* {loading && (
          <p className="text-center text-gray-500 text-sm mt-4">
            Loading chats...
          </p>
        )} */}
        {loading && <SkeletonLoader count={10} />}

        {!loading &&
          filtered.map((driver) => (
            <ChatListItem
              key={driver.userid}
              driver={driver}
              onClick={() => onSelectDriver(driver)}
            />
          ))}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            No drivers found
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatList;
