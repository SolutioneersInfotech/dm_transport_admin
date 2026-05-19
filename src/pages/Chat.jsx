import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ChatList from "../components/ChatList";
import ChatWindow from "../components/ChatWindow";
import * as chatAPI from "../services/chatAPI";
import { useAppSelector } from "../store/hooks";
import { useAuth } from "../context/AuthContext";
import { ADMIN_PERMISSION_KEYS, hasAdminPermission } from "../utils/adminPermissions";
import { Button } from "../components/ui/button";

const Chat = () => {
  const CHAT_LIST_MIN_WIDTH = 260;
  const CHAT_LIST_MAX_WIDTH = 520;
  const CHAT_LIST_DEFAULT_WIDTH = 320;
  const CHAT_LIST_STORAGE_KEY = "chat_list_width";

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDriver, setSelectedDriver] = useState(null);
  const refreshSignal = 0;
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [chatListWidth, setChatListWidth] = useState(CHAT_LIST_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
  const currentWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
  const { users } = useAppSelector((state) => state.users);
  const { user } = useAuth();
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const canDeleteChatPermanently = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.deleteChatPermanently),
    [user?.permissions]
  );
  const canBulkDeleteChatPermanently = useMemo(
    () => hasAdminPermission(user?.permissions, ADMIN_PERMISSION_KEYS.bulkDeleteChatPermanently),
    [user?.permissions]
  );


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
      // Profile-level lastSeen is kept as fallback; ChatWindow derives a fresher effective value.
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

  const clampChatListWidth = useCallback((width, viewportWidth = window.innerWidth) => {
    // Clamp width to preserve chat list usability while keeping room for the chat window.
    const maxAllowed = Math.min(CHAT_LIST_MAX_WIDTH, Math.floor(viewportWidth * 0.45));
    return Math.min(Math.max(width, CHAT_LIST_MIN_WIDTH), maxAllowed);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleBreakpointChange = (event) => {
      setIsDesktopLayout(event.matches);
    };

    setIsDesktopLayout(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleBreakpointChange);

    return () => mediaQuery.removeEventListener("change", handleBreakpointChange);
  }, []);

  useEffect(() => {
    const savedWidth = Number(window.localStorage.getItem(CHAT_LIST_STORAGE_KEY));
    if (!Number.isFinite(savedWidth)) return;
    setChatListWidth(clampChatListWidth(savedWidth));
  }, [clampChatListWidth]);

  useEffect(() => {
    currentWidthRef.current = chatListWidth;
  }, [chatListWidth]);

  useEffect(() => {
    if (!isDesktopLayout) return;
    const handleWindowResize = () => {
      setChatListWidth((prev) => clampChatListWidth(prev));
    };
    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [clampChatListWidth, isDesktopLayout]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (!isDesktopLayout) return;
    // Persist width only when resize ends to avoid blocking localStorage writes during drag.
    window.localStorage.setItem(CHAT_LIST_STORAGE_KEY, String(currentWidthRef.current));
  }, [isDesktopLayout]);

  useEffect(() => {
    if (!isDesktopLayout || !isResizing) return;

    const handleMouseMove = (event) => {
      const deltaX = event.clientX - dragStartXRef.current;
      const nextWidth = dragStartWidthRef.current + deltaX;
      setChatListWidth(clampChatListWidth(nextWidth));
    };

    // Use window listeners so dragging remains smooth even if cursor leaves the divider.
    // Resize must end even if pointer release happens outside the browser window.
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("blur", stopResizing);
    document.addEventListener("mouseleave", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("blur", stopResizing);
      document.removeEventListener("mouseleave", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clampChatListWidth, isDesktopLayout, isResizing, stopResizing]);

  const handleResizeMouseDown = (event) => {
    if (!isDesktopLayout) return;
    event.preventDefault();
    dragStartXRef.current = event.clientX;
    dragStartWidthRef.current = chatListWidth;
    setIsResizing(true);
  };

  const handleBulkPermanentDelete = async () => {
    if (!canBulkDeleteChatPermanently || selectedChatIds.size === 0 || isBulkDeleting) return;

    const selectedDrivers = users.filter((item) => selectedChatIds.has(String(getUserId(item))));
    setIsBulkDeleting(true);
    try {
      await chatAPI.permanentDeleteChatConversations(selectedDrivers);
      setSelectedChatIds(new Set());
      if (selectedDriver && selectedChatIds.has(String(getUserId(selectedDriver)))) {
        setSelectedDriver(null);
        setSearchParams({});
      }
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteModalOpen(false);
    }
  };

  return (
    <div className="flex w-full h-full bg-[#0d1117] text-white overflow-hidden">
      {/* LEFT CHAT LIST: desktop width is resizable; mobile keeps the existing fixed sizing behavior. */}
      <div
        className="w-[320px] min-w-[280px] max-w-[340px] border-r border-gray-700 h-full overflow-hidden shrink-0 lg:min-w-[260px] lg:max-w-none"
        style={isDesktopLayout ? { width: `${chatListWidth}px` } : undefined}
      >
        <ChatList
          onSelectDriver={handleSelectDriver}
          selectedDriver={selectedDriver}
          chatApi={chatAPI}
          canBulkDeleteConversations={canBulkDeleteChatPermanently}
          selectedChatIds={selectedChatIds}
          onSelectedChatIdsChange={setSelectedChatIds}
          onRequestBulkDelete={() => setIsBulkDeleteModalOpen(true)}
          isBulkDeleting={isBulkDeleting}
        />
      </div>

      {/* Divider resizes only the desktop split layout. */}
      {isDesktopLayout && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chat list panel"
          onMouseDown={handleResizeMouseDown}
          className={`hidden lg:flex h-full w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors ${
            isResizing ? "bg-blue-500/40" : "hover:bg-gray-500/35"
          }`}
        >
          <span className="h-12 w-[2px] rounded-full bg-gray-500/70" />
        </div>
      )}

      {/* RIGHT CHAT WINDOW flexes automatically to fill remaining width. */}
      <div className="flex-1 h-full overflow-hidden min-w-0">
        <AnimatePresence mode="wait">
          {selectedDriver ? (
            <div key={selectedDriver.userid ?? selectedDriver.id ?? "chat"} className="h-full">
              <ChatWindow driver={selectedDriver} chatApi={chatAPI} refreshSignal={refreshSignal} canDeleteChatPermanently={canDeleteChatPermanently} />
            </div>
          ) : (
            <div
              key="placeholder"
              className="flex justify-center items-center h-full text-gray-500"
            >
              Select a driver to start chat
            </div>
          )}
        </AnimatePresence>
      </div>

      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-lg border border-[#2c3e52] bg-[#1c2530] p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Permanently Delete Chats</h3>
            <p className="text-sm text-gray-300">
              Permanently delete {selectedChatIds.size} selected chat conversation{selectedChatIds.size === 1 ? "" : "s"}?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-800 hover:bg-[#2c3e52] hover:text-white" onClick={() => setIsBulkDeleteModalOpen(false)} disabled={isBulkDeleting}>
                Cancel
              </Button>
              <Button size="sm" className="bg-red-600 text-white hover:bg-red-700" onClick={handleBulkPermanentDelete} disabled={isBulkDeleting}>
                {isBulkDeleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
