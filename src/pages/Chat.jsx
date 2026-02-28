import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import * as chatAPI from "../services/chatAPI";
import { useChatListQuery, useChatMessagesQuery } from "../services/chatQueries";
import { useAppSelector } from "../store/hooks";

const Chat = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const { users } = useAppSelector((state) => state.users);
  const activeChatId = selectedDriver ? getUserId(selectedDriver) : null;

  const { refetch: refetchChatList } = useChatListQuery();
  const { refetch: refetchChatMessages } = useChatMessagesQuery(selectedDriver, {
    enabled: Boolean(activeChatId),
  });

  // Helper function to get user ID from various possible fields
  function getUserId(user) {
    return (
      user?.userid ??
      user?.userId ??
      user?.contactId ??
      user?.contactid ??
      user?.uid ??
      user?.id ??
      null
    );
  }

  // Helper function to find driver by userid
  function findDriverByUserId(userId) {
    if (!userId || !users?.length) return null;

    const user = users.find((u) => {
      const id = getUserId(u);
      return id === userId;
    });

    if (!user) return null;

    return {
      userid: getUserId(user),
      driver_name: user.name || user.driver_name,
      email: user.email || null,
      phone: user.phone || null,
      driver_image: user.profilePic || user.image || null,
      lastSeen: user.lastSeen || null,
      last_message: user.last_message || "",
      last_chat_time: user.last_chat_time || null,
    };
  }

  // Handle driver selection - update URL
  const handleSelectDriver = (driver) => {
    setSelectedDriver(driver);
    if (driver?.userid) {
      setSearchParams({ userid: driver.userid });
    } else {
      setSearchParams({});
    }
  };

  // Auto-open chat if userid is in URL
  useEffect(() => {
    const userIdFromUrl = searchParams.get("userid");
    const currentDriverId = selectedDriver ? getUserId(selectedDriver) : null;
    
    // Only update if URL param differs from current selection
    if (userIdFromUrl !== currentDriverId) {
      if (userIdFromUrl && users?.length > 0) {
        const driver = findDriverByUserId(userIdFromUrl);
        if (driver) {
          setSelectedDriver(driver);
        } else {
          // If userid in URL but driver not found, clear the param
          setSearchParams({});
        }
      } else if (!userIdFromUrl) {
        // If URL param is cleared, clear selection
        setSelectedDriver(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, users]);

  useEffect(() => {
    function refreshActiveChat() {
      refetchChatList();
      if (activeChatId) {
        refetchChatMessages();
      }
      setRefreshSignal((prev) => prev + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshActiveChat();
      }
    }

    function handleFocus() {
      refreshActiveChat();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetchChatList, refetchChatMessages, activeChatId]);

  return (
    <div className="flex w-full h-full bg-[#0d1117] text-white overflow-hidden">
      {/* LEFT CHAT LIST (FIXED WIDTH + STICKY) */}
      <div className="w-[320px] min-w-[280px] max-w-[340px] border-r border-gray-700 h-full overflow-hidden">
        <ChatList
          onSelectDriver={handleSelectDriver}
          selectedDriver={selectedDriver}
          chatApi={chatAPI}
        />
      </div>

      {/* RIGHT CHAT WINDOW (TAKES REST SPACE) */}
      <div className="flex-1 h-full overflow-hidden min-w-0">
        <AnimatePresence mode="wait">
          {selectedDriver ? (
            <div key={selectedDriver.userid ?? selectedDriver.id ?? "chat"} className="h-full">
              <ChatWindow driver={selectedDriver} chatApi={chatAPI} refreshSignal={refreshSignal} />
            </div>
          ) : (
            <motion.div
              key="placeholder"
              className="flex justify-center items-center h-full text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              Select a driver to start chat
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;
