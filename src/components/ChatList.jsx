import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers, fetchMoreUsers, updateUserLastMessage } from "../store/slices/usersSlice";
import { fetchMaintenanceUsers, updateMaintenanceUserLastMessage } from "../store/slices/maintenanceUsersSlice";
import ChatListItem from "./ChatListItem";
import SkeletonLoader from "./skeletons/Skeleton";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  subscribeLastMessage as defaultSubscribeLastMessage,
} from "../services/chatAPI";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "seen", label: "Seen" },
  { value: "unseen", label: "Unseen" },
];

const statusColorClass = {
  all: "text-muted-foreground",
  seen: "text-emerald-400",
  unseen: "text-amber-400",
};

const ChatList = ({ onSelectDriver, selectedDriver, chatApi }) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isMaintenanceChat = location.pathname === "/maintenance-chat";

  const usersState = useAppSelector((state) => state.users);
  const maintenanceUsersState = useAppSelector((state) => state.maintenanceUsers);

  const users = isMaintenanceChat ? maintenanceUsersState.users : usersState.users;
  const loading = isMaintenanceChat ? maintenanceUsersState.loading : usersState.loading;
  const loadingMore = isMaintenanceChat ? false : usersState.loadingMore;
  const hasMore = isMaintenanceChat ? false : usersState.hasMore;
  const page = usersState.page;
  const limit = usersState.limit;
  const hasLoaded = isMaintenanceChat ? maintenanceUsersState.hasLoaded : usersState.hasLoaded;

  const updateLastMessageAction = isMaintenanceChat ? updateMaintenanceUserLastMessage : updateUserLastMessage;
  // console.log(users);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]); // Array of selected categories: ["F", "D", "C"]
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "seen" | "unseen"
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const observerTarget = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const unsubscribeUnreadRefs = useRef({});
  const unsubscribeLastMessageRefs = useRef({});
  const unsubscribeSummaryRefs = useRef({});

  const subscribeUnreadCount = chatApi?.subscribeUnreadCount;
  const subscribeLastMessage =
    chatApi?.subscribeLastMessage || defaultSubscribeLastMessage;
  const subscribeChatSummary = chatApi?.subscribeChatSummary;

  function getDriverId(driver) {
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

    const normalizedId = String(candidate).trim();
    return normalizedId || null;
  }

  // Initial fetch: maintenance chat uses fetchMaintenanceUsers (GET /admin/fetchmaintenanceusers), regular chat uses fetchUsers.
  useEffect(() => {
    if (isMaintenanceChat) {
      if (!hasLoaded && !loading) {
        dispatch(fetchMaintenanceUsers({ limit: -1 }));
      }
    } else {
      if (!hasLoaded && !loading) {
        dispatch(fetchUsers({ page: 1, limit }));
      }
    }
  }, [dispatch, isMaintenanceChat, hasLoaded, loading, limit]);

  // Auto-load remaining regular-chat pages in the background so that
  // ordering becomes globally correct without requiring manual scroll.
  useEffect(() => {
    // Only apply this to regular chat, not maintenance.
    if (isMaintenanceChat) return;

    // Don't start auto-loading until the initial page has loaded.
    if (!hasLoaded || loading) return;

    // If there are no more pages, nothing to do.
    if (!hasMore) return;

    let cancelled = false;

    const loadAllPagesSequentially = async () => {
      // Use a local page tracker so we don't depend on stale `page` values
      // across async calls.
      let currentPage = page;
      // Safety guard: hard cap on number of pages to prevent infinite loops
      const MAX_EXTRA_PAGES = 50;
      let pagesLoaded = 0;

      while (!cancelled && hasMore && pagesLoaded < MAX_EXTRA_PAGES) {
        const nextPage = currentPage + 1;

        try {
          // Trigger the next page load
          await dispatch(fetchMoreUsers({ page: nextPage, limit })).unwrap();
        } catch (error) {
          console.error("Background fetchMoreUsers failed:", error);
          break;
        }

        // Update local state trackers
        currentPage = nextPage;
        pagesLoaded += 1;

        // Small delay to avoid blocking the main thread with a tight loop
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    };

    loadAllPagesSequentially();

    return () => {
      cancelled = true;
    };
  }, [dispatch, isMaintenanceChat, hasLoaded, loading, hasMore, page, limit]);

  // Infinite scroll observer - prevent duplicate calls
  const isLoadingRef = useRef(false);
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !isLoadingRef.current) {
      isLoadingRef.current = true;
      const nextPage = page + 1;
      dispatch(fetchMoreUsers({ page: nextPage, limit })).finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [dispatch, hasMore, loadingMore, loading, page, limit]);

  useEffect(() => {
    // Only set up observer if we have more to load and not currently loading
    if (!hasMore || loadingMore || loading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Trigger 50px before the element is visible
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleLoadMore, hasMore, loadingMore, loading]);


  useEffect(() => {
    // If chatApi doesn't provide subscribeChatSummary, skip this effect.
    if (!subscribeChatSummary || !users?.length) return;

    users.forEach((u) => {
      const userId = getDriverId(u);
      if (!userId) return;

      if (unsubscribeSummaryRefs.current[userId]) return;

      const unsubscribe = subscribeChatSummary(u, (summary) => {
        const lastMessage = summary?.lastMessage || null;
        const unreadCount = summary?.unreadCount ?? 0;

        let lastMessageText =
          lastMessage?.content?.message ||
          lastMessage?.message ||
          (lastMessage?.content ? "" : "");

        if (!lastMessageText || lastMessageText.trim() === "") {
          const attachmentUrl =
            lastMessage?.content?.attachmentUrl ||
            lastMessage?.attachmentUrl ||
            "";
          if (attachmentUrl && attachmentUrl.trim() !== "") {
            lastMessageText = "Attachment";
          }
        }

        const lastChatTime = lastMessage?.dateTime || null;

        dispatch(
          updateLastMessageAction({
            userid: userId,
            lastMessage: lastMessageText || "",
            lastChatTime,
          })
        );

        setUnreadCounts((prev) => ({
          ...prev,
          [userId]: unreadCount,
        }));
      });

      unsubscribeSummaryRefs.current[userId] = unsubscribe;
    });

    return () => {
      const currentUserIds = new Set(
        users.map((u) => getDriverId(u)).filter(Boolean)
      );

      Object.keys(unsubscribeSummaryRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          const unsubscribe = unsubscribeSummaryRefs.current[userId];
          if (typeof unsubscribe === "function") {
            unsubscribe();
          }
          delete unsubscribeSummaryRefs.current[userId];

          setUnreadCounts((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      });
    };
  }, [users, subscribeChatSummary, dispatch, updateLastMessageAction]);

  // Subscribe to latest-message updates so ordering refreshes for both driver and admin sends
  useEffect(() => {
    // If we have subscribeChatSummary, we skip this path.
    if (subscribeChatSummary) return;
    if (!subscribeLastMessage || !users?.length) return;

    users.forEach((u) => {
      const userId = getDriverId(u);
      if (!userId) return;
      if (unsubscribeLastMessageRefs.current[userId]) return;

      const unsubscribe = subscribeLastMessage(u, (lastMessage) => {
        let lastMessageText =
          lastMessage?.content?.message ||
          lastMessage?.message ||
          (lastMessage?.content ? "" : "");

        if (!lastMessageText || lastMessageText.trim() === "") {
          const attachmentUrl =
            lastMessage?.content?.attachmentUrl ||
            lastMessage?.attachmentUrl ||
            "";
          if (attachmentUrl && attachmentUrl.trim() !== "") {
            lastMessageText = "Attachment";
          }
        }

        const lastChatTime = lastMessage?.dateTime || null;

        dispatch(
          updateLastMessageAction({
            userid: userId,
            lastMessage: lastMessageText || "",
            lastChatTime: lastChatTime,
          })
        );
      });

      unsubscribeLastMessageRefs.current[userId] = unsubscribe;
    });

    const subscriptionsRef = unsubscribeLastMessageRefs.current;

    return () => {
      const currentUserIds = new Set(
        users.map((u) => getDriverId(u)).filter(Boolean)
      );
      Object.keys(subscriptionsRef).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          const unsubscribe = subscriptionsRef[userId];
          if (unsubscribe) {
            unsubscribe();
            delete subscriptionsRef[userId];
          }
        }
      });
    };
  }, [users, subscribeLastMessage, dispatch, updateLastMessageAction, subscribeChatSummary]);

  const showInitialLoader = loading && !hasLoaded && users.length === 0;

  // Subscribe to unread counts for all users
  useEffect(() => {
    // If we have subscribeChatSummary, it already provides unreadCount.
    if (subscribeChatSummary) return;
    if (!subscribeUnreadCount || !users?.length) return;

    // Subscribe to unread counts for each user
    users.forEach((u) => {
      const userId = getDriverId(u);
      if (!userId) return;

      // If already subscribed, skip
      if (unsubscribeUnreadRefs.current[userId]) return;

      // Subscribe to unread count changes
      const unsubscribe = subscribeUnreadCount(u, (count) => {
        setUnreadCounts((prev) => ({
          ...prev,
          [userId]: count,
        }));
      });

      unsubscribeUnreadRefs.current[userId] = unsubscribe;
    });

    // Cleanup: unsubscribe from users that are no longer in the list
    const subscriptionsRef = unsubscribeUnreadRefs.current;

    return () => {
      const currentUserIds = new Set(users.map((u) => getDriverId(u)).filter(Boolean));

      Object.keys(subscriptionsRef).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          const unsubscribe = subscriptionsRef[userId];
          if (unsubscribe) {
            unsubscribe();
            delete subscriptionsRef[userId];
          }
          // Remove from unread counts
          setUnreadCounts((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        }
      });
    };
  }, [users, subscribeUnreadCount, subscribeChatSummary]);


  // Transform users from Redux to drivers format
  // Redux already preserves all users, so we use it directly
  const drivers = useMemo(() => {
    if (!users?.length) return [];
   

    const withLastChat = users
      .map((u) => {
        const userId = getDriverId(u);
        if (!userId) {
          return null;
        }
        
        // console.log(u.last_chat_time);

        return {
          userid: userId,
          driver_name: u.name || u.driver_name,
          email: u.email || null,
          phone: u.phone || null,
          driver_image: u.profilePic || u.image || null,
          lastSeen: u.lastSeen || null,
          last_message: u.last_message || "",
          last_chat_time: u.last_chat_time || null,
          unreadCount: unreadCounts[userId] || 0,
          category: u.category || null, // Include category field
        };
      })
      .filter(Boolean);

    // SORT by last MESSAGE time only (last_chat_time). Do NOT use lastSeen.
    const driversWithIds = withLastChat.filter(Boolean);
    driversWithIds.sort((a, b) => {
      const timeA = a.last_chat_time ? new Date(a.last_chat_time).getTime() : 0;
      const timeB = b.last_chat_time ? new Date(b.last_chat_time).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA; // newest message first
      return (a.userid || "").localeCompare(b.userid || ""); // stable order when same time
    });
   

    return driversWithIds;
  }, [users, unreadCounts]);

  // Client-side filtering - filter by search, category, and seen/unseen
  const filtered = useMemo(() => {
    // Create a copy of the drivers array to avoid mutating the original
    let driversCopy = [...drivers];

    // Filter by seen/unseen status
    if (statusFilter === "seen") {
      driversCopy = driversCopy.filter((driver) => (driver.unreadCount || 0) === 0);
    } else if (statusFilter === "unseen") {
      driversCopy = driversCopy.filter((driver) => (driver.unreadCount || 0) > 0);
    }

    // Filter by category (multiple categories allowed)
    if (categoryFilter.length > 0) {
      driversCopy = driversCopy.filter((driver) => {
        return categoryFilter.includes(driver.category);
      });
    }

    // Then filter by search term (case-insensitive)
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      driversCopy = driversCopy.filter((driver) => {
        const driverName = (driver.driver_name || "").toLowerCase();
        return driverName.includes(searchTerm);
      });
    }

    return driversCopy;
  }, [drivers, search, categoryFilter, statusFilter]);
  
  const selectedDriverId = getDriverId(selectedDriver);

  useEffect(() => {
    if (!isMaintenanceChat) return;
    if (selectedDriverId) return;
    if (!drivers.length) return;

    onSelectDriver(drivers[0]);
  }, [drivers, isMaintenanceChat, onSelectDriver, selectedDriverId]);

  return (
    <div className="h-full flex flex-col">
      {/* 🔍 SEARCH BAR (STICKY) */}
      <div className="p-5 border-b border-gray-700 sticky top-0 bg-[#0d1117] z-20 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <Input
            type="text"
            placeholder="Search drivers..."
            className="flex-1 max-w-md bg-[#1f2937]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Category Filters */}
          <div className="flex items-center gap-2">
            {["C", "D", "F"].map((cat) => {
              const isSelected = categoryFilter.includes(cat);
              return (
                <Button
                  key={cat}
                  onClick={() => {
                    if (isSelected) {
                      // Remove category from filter
                      setCategoryFilter(categoryFilter.filter((c) => c !== cat));
                    } else {
                      // Add category to filter
                      setCategoryFilter([...categoryFilter, cat]);
                    }
                  }}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={`min-w-[36px] h-8 text-xs border-0 ${
                    isSelected
                      ? "bg-[#0066ff50] text-white hover:bg-[#1a5ed45c]"
                      : "bg-[#161b22] text-gray-300 hover:bg-[#1d232a]"
                  }`}
                >
                  {cat}
                </Button>
              );
            })}

            <Popover open={isStatusPopoverOpen} onOpenChange={setIsStatusPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5",
                    statusColorClass[statusFilter]
                  )}
                  aria-label={`Status filter: ${statusFilter}`}
                  title={`Status: ${statusFilter}`}
                >
                  <span className="relative">
                    <Eye className="h-4 w-4" />
                    {statusFilter !== "all" && (
                      <span
                        className={cn(
                          "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                          statusFilter === "seen" ? "bg-emerald-400" : "bg-amber-400"
                        )}
                      />
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                className="w-36 p-1 bg-[#0b1220] border border-white/10 text-white shadow-xl"
              >
                {STATUS_OPTIONS.map((opt) => {
                  const isActive = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-2 py-2 rounded-md text-sm flex items-center justify-between",
                        "hover:bg-white/5",
                        isActive && "bg-white/10"
                      )}
                    >
                      <span>{opt.label}</span>
                      {isActive && (
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            opt.value === "all"
                              ? "bg-slate-400"
                              : opt.value === "seen"
                              ? "bg-emerald-400"
                              : "bg-amber-400"
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* 📜 DRIVER LIST (ONLY THIS SCROLLS) */}
      <div className="flex-1 overflow-y-auto chat-list-scroll">
        {/* Show loading skeleton only during the very first users fetch */}
        {showInitialLoader && (
          <SkeletonLoader count={10} />
        )}

        {/* Show list immediately after users are loaded; message preview hydration runs in background */}
        {!showInitialLoader && filtered.length > 0 && (
          <motion.div layout className="flex flex-col">
            {filtered.map((driver) => (
              <ChatListItem
                key={driver.userid}
                driver={driver}
                isSelected={selectedDriverId === driver.userid}
                onClick={() => onSelectDriver(driver)}
              />
            ))}
          </motion.div>
        )}

        {/* Infinite scroll trigger - only show when hasMore (disabled since we fetch all) */}
        {hasMore && !showInitialLoader && (
          <div 
            ref={observerTarget} 
            className="h-16 flex items-center justify-center py-2"
          >
            {loadingMore ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-[#1f6feb] rounded-full animate-spin"></div>
                <p className="text-gray-500 text-xs">Loading more...</p>
              </div>
            ) : (
              <p className="text-gray-500 text-xs">Scroll for more...</p>
            )}
          </div>
        )}

        {/* Empty state */}
        {!showInitialLoader && users.length === 0 && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            No drivers found
          </p>
        )}
        {!showInitialLoader && users.length > 0 && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            {statusFilter === "seen" && "No seen chats"}
            {statusFilter === "unseen" && "No unseen chats"}
            {statusFilter === "all" && "No matching chats"}
          </p>
        )}

        {/* No more to load */}
        {!hasMore && !showInitialLoader && !loadingMore && filtered.length > 0 && (
          <p className="text-center text-gray-500 text-xs mt-2 py-2">
            All drivers loaded
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatList;
