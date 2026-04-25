import { FaBullhorn } from "react-icons/fa";
// import Broadcast from "../pages/Broadcast";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const ENABLE_BACKGROUND_DRIVER_PREFETCH = true;
const BACKGROUND_DRIVER_PREFETCH_DELAY_MS = 600;
const MAX_CHAT_LIST_REALTIME_SUBSCRIPTIONS = 50;

function dedupeUsersById(users, getId) {
  const seen = new Set();
  const deduped = [];

  users.forEach((user) => {
    const id = getId(user);
    if (!id || seen.has(id)) return;
    seen.add(id);
    deduped.push(user);
  });

  return deduped;
}

const ChatList = ({ onSelectDriver, selectedDriver, chatApi }) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isMaintenanceChat = location.pathname === "/maintenance-chat";

  const usersState = useAppSelector((state) => state.users);
  const maintenanceUsersState = useAppSelector((state) => state.maintenanceUsers);

  const users = isMaintenanceChat ? maintenanceUsersState.users : usersState.users;
  const loading = isMaintenanceChat ? maintenanceUsersState.loading : usersState.loading;
  const loadingMore = isMaintenanceChat ? false : usersState.loadingMore;
  const hasMore = isMaintenanceChat ? false : usersState.hasMore;
  const page = usersState.page;
  const limit = usersState.limit;
  // Ensure we never use an invalid or cached -1 limit for pagination.
  // Fallback to a sane default page size (e.g. 25) when limit is <= 0 or falsy.
  const DEFAULT_PAGE_SIZE = 25;
  const pageSize =
    typeof limit === "number" && limit > 0 ? limit : DEFAULT_PAGE_SIZE;
  const hasLoaded = isMaintenanceChat ? maintenanceUsersState.hasLoaded : usersState.hasLoaded;

  const updateLastMessageAction = isMaintenanceChat ? updateMaintenanceUserLastMessage : updateUserLastMessage;
  // console.log(users);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]); // Array of selected categories: ["F", "D", "C"]
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "seen" | "unseen"
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const observerTarget = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden
  );
  const unsubscribeUnreadRefs = useRef({});
  const unsubscribeLastMessageRefs = useRef({});
  const unsubscribeSummaryRefs = useRef({});
  const idleCallbackRef = useRef(null);
  const prefetchTimeoutRef = useRef(null);

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

  const selectedDriverId = getDriverId(selectedDriver);
  const hasActiveFilters =
    Boolean(search?.trim()) ||
    categoryFilter.length > 0 ||
    statusFilter !== "all";
  const subscriptionUsers = useMemo(() => {
    if (!users?.length) return [];
    if (isMaintenanceChat) return users;

    const topUsers = users.slice(0, MAX_CHAT_LIST_REALTIME_SUBSCRIPTIONS);
    const selectedUser = users.find((u) => getDriverId(u) === selectedDriverId);
    return dedupeUsersById(selectedUser ? [...topUsers, selectedUser] : topUsers, getDriverId);
  }, [users, isMaintenanceChat, selectedDriverId]);

  // Initial fetch: maintenance chat uses fetchMaintenanceUsers (GET /admin/fetchmaintenanceusers), regular chat uses fetchUsers.
  useEffect(() => {
    if (isMaintenanceChat) {
      if (!hasLoaded && !loading) {
        dispatch(fetchMaintenanceUsers({ limit: -1 }));
      }
    } else {
      if (!hasLoaded && !loading) {
        // Fetch a single, paginated first page using the safe pageSize.
        dispatch(fetchUsers({ page: 1, limit: pageSize }));
      }
    }
  }, [dispatch, isMaintenanceChat, hasLoaded, loading, pageSize]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Background prefetch: load remaining regular-chat pages slowly when idle.
  useEffect(() => {
    if (!ENABLE_BACKGROUND_DRIVER_PREFETCH) return undefined;
    if (isMaintenanceChat) return undefined;
    if (!hasLoaded || loading || loadingMore || !hasMore) return undefined;
    if (!isDocumentVisible || hasActiveFilters) return undefined;

    const scheduleFetch = () => {
      const runFetch = () => {
        if (document.hidden) return;
        if (loading || loadingMore || !hasMore || isLoadingRef.current) return;

        const nextPage = page + 1;
        isLoadingRef.current = true;
        dispatch(fetchMoreUsers({ page: nextPage, limit: pageSize }))
          .catch((error) => {
            console.error("Background prefetch failed:", error);
          })
          .finally(() => {
            isLoadingRef.current = false;
          });
      };

      if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
        idleCallbackRef.current = window.requestIdleCallback(
          () => {
            prefetchTimeoutRef.current = window.setTimeout(
              runFetch,
              BACKGROUND_DRIVER_PREFETCH_DELAY_MS
            );
          },
          { timeout: BACKGROUND_DRIVER_PREFETCH_DELAY_MS * 2 }
        );
      } else {
        prefetchTimeoutRef.current = window.setTimeout(
          runFetch,
          BACKGROUND_DRIVER_PREFETCH_DELAY_MS
        );
      }
    };

    scheduleFetch();

    return () => {
      if (typeof window !== "undefined" && typeof window.cancelIdleCallback === "function" && idleCallbackRef.current != null) {
        window.cancelIdleCallback(idleCallbackRef.current);
      }
      if (prefetchTimeoutRef.current != null) {
        window.clearTimeout(prefetchTimeoutRef.current);
      }
      idleCallbackRef.current = null;
      prefetchTimeoutRef.current = null;
    };
  }, [
    dispatch,
    hasActiveFilters,
    hasLoaded,
    hasMore,
    isDocumentVisible,
    isMaintenanceChat,
    loading,
    loadingMore,
    page,
    pageSize,
  ]);

  // Infinite scroll observer - prevent duplicate calls
  const isLoadingRef = useRef(false);
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !isLoadingRef.current) {
      isLoadingRef.current = true;
      const nextPage = page + 1;
      dispatch(fetchMoreUsers({ page: nextPage, limit: pageSize })).finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [dispatch, hasMore, loadingMore, loading, page, pageSize]);

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
    if (!subscribeChatSummary || !subscriptionUsers?.length) return;

    subscriptionUsers.forEach((u) => {
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
        subscriptionUsers.map((u) => getDriverId(u)).filter(Boolean)
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
  }, [subscriptionUsers, subscribeChatSummary, dispatch, updateLastMessageAction]);

  // Subscribe to latest-message updates so ordering refreshes for both driver and admin sends
  useEffect(() => {
    // If we have subscribeChatSummary, we skip this path.
    if (subscribeChatSummary) return;
    if (!subscribeLastMessage || !subscriptionUsers?.length) return;

    subscriptionUsers.forEach((u) => {
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
        subscriptionUsers.map((u) => getDriverId(u)).filter(Boolean)
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
  }, [subscriptionUsers, subscribeLastMessage, dispatch, updateLastMessageAction, subscribeChatSummary]);

  const showInitialLoader = loading && !hasLoaded && users.length === 0;

  // Subscribe to unread counts for all users
  useEffect(() => {
    // If we have subscribeChatSummary, it already provides unreadCount.
    if (subscribeChatSummary) return;
    if (!subscribeUnreadCount || !subscriptionUsers?.length) return;

    // Subscribe to unread counts for each user
    subscriptionUsers.forEach((u) => {
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
      const currentUserIds = new Set(subscriptionUsers.map((u) => getDriverId(u)).filter(Boolean));

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
  }, [subscriptionUsers, subscribeUnreadCount, subscribeChatSummary]);

  // Transform users from Redux to drivers format
  // Redux already preserves all users, so we use it directly
  // const drivers = useMemo(() => {
  //   if (!users?.length) return [];
  
  //   if (!threads?.length) return [];

  //   return threads
  //     .map((thread) => {
  //       const userId = thread?.driverId ?? thread?.userid ?? thread?.userId ?? thread?.id ?? null;
  //       if (!userId) {
  //         return null;
  //       }
        
  //       // console.log(u.last_chat_time);

  //       const lastMessage = thread?.lastMessage || {};
  //       return {
  //         userid: userId,
  //         driver_name: u.name || u.driver_name,
  //         email: u.email || null,
  //         phone: u.phone || null,
  //         driver_image: u.profilePic || u.image || null,
  //         lastSeen: u.lastSeen || null,
  //         last_message: u.last_message || "",
  //         last_chat_time: u.last_chat_time || null,
  //         unreadCount: unreadCounts[userId] || 0,
  //         category: u.category || null, // Include category field
  //       };
  //     })
  //     .filter(Boolean);

  //   // SORT by last MESSAGE time only (last_chat_time). Do NOT use lastSeen.
  //   const driversWithIds = withLastChat.filter(Boolean);
  //   driversWithIds.sort((a, b) => {
  //     const timeA = a.last_chat_time ? new Date(a.last_chat_time).getTime() : 0;
  //     const timeB = b.last_chat_time ? new Date(b.last_chat_time).getTime() : 0;
  //     if (timeB !== timeA) return timeB - timeA; // newest message first
  //     return (a.userid || "").localeCompare(b.userid || ""); // stable order when same time
  //   });
   

  //   return driversWithIds;
  // }, [users, unreadCounts]);
  //         driver_name: thread?.name || thread?.driver_name,
  //         driver_image: thread?.avatarUrl || thread?.driver_image || null,
  //         phone: thread?.phone ?? null,
  //         lastSeen: thread?.lastSeen || null,
  //         last_message: lastMessage?.text || "",
  //         last_chat_time: normalizeTimestamp(lastMessage?.dateTime ?? lastMessage?.datetime ?? null),
  //         unreadCount: typeof thread?.unreadCount === "number" ? thread.unreadCount : 0,
  //         lastReadAt: thread?.lastReadAt ?? null,
  //       };
  //     })
  //     .filter(Boolean);
  // }, [threads]);

  const drivers = useMemo(() => {
  if (!users?.length) return [];

  const mapped = users
    .map((u) => {
      const userId = getDriverId(u);
      if (!userId) return null;

      return {
        userid: userId,
        driver_name: u.name || u.driver_name,
        email: u.email || null,
        phone: u.phone || null,
        driver_image: u.profilePic || u.image || null,
        lastSeen: u.lastSeen || null,
        last_message: u.last_message || "",
        last_chat_time: u.last_chat_time || null,
        unreadCount:
          unreadCounts[userId] ??
          u.unreadCount ??
          u.unread_count ??
          u.unseenCount ??
          0,
        category: u.category || null,
      };
    })
    .filter(Boolean);

  mapped.sort((a, b) => {
    const timeA = a.last_chat_time
      ? new Date(a.last_chat_time).getTime()
      : 0;
    const timeB = b.last_chat_time
      ? new Date(b.last_chat_time).getTime()
      : 0;

    if (timeB !== timeA) return timeB - timeA;
    return (a.userid || "").localeCompare(b.userid || "");
  });

  return mapped;
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

const handleSelectDriver = (driver) => {
  if (!driver) return;
  onSelectDriver(driver);
};

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

            <Button
              onClick={() => {
                // Navigate to broadcast page
                // window.location.href = '/broadcast';
                navigate("/broadcast");
              }}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full border border-transparent hover:border-white/10 hover:bg-white/5 text-blue-400"
              aria-label="Send broadcast"
              title="Send broadcast message"
            >
              <FaBullhorn className="h-4 w-4" />
            </Button>
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
                onClick={() => handleSelectDriver(driver)}
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
