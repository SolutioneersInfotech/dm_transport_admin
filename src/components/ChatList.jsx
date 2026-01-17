import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers, fetchMoreUsers, updateUserLastMessage } from "../store/slices/usersSlice";
import ChatListItem from "./ChatListItem";
import SkeletonLoader from "./skeletons/Skeleton";
import { Input } from "./ui/input";
import { fetchMessages as defaultFetchMessages } from "../services/chatAPI";

const ChatList = ({ onSelectDriver, selectedDriver, chatApi }) => {
  const dispatch = useAppDispatch();
  const { users, loading, loadingMore, lastFetched, hasMore, page, limit, lastSearch } = useAppSelector(
    (state) => state.users
  );
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const observerTarget = useRef(null);
  const hasInitiallyFetched = useRef(false);
  const [fetchingMessages, setFetchingMessages] = useState(new Set());
  const fetchedUsersRef = useRef(new Set()); // Track users we've already fetched messages for
  const [unreadCounts, setUnreadCounts] = useState({}); // Track unread counts per user
  const unsubscribeUnreadRefs = useRef({}); // Track unsubscribe functions for unread counts
  
  const fetchMessages = chatApi?.fetchMessages || defaultFetchMessages;
  const subscribeUnreadCount = chatApi?.subscribeUnreadCount;

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

    return candidate;
  }

  function normalizeTimestamp(value) {
    if (!value) return null;

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof value === "object") {
      const seconds = value?._seconds ?? value?.seconds;
      const nanoseconds = value?._nanoseconds ?? value?.nanoseconds ?? 0;
      if (typeof seconds === "number") {
        return seconds * 1000 + Math.floor(nanoseconds / 1e6);
      }
    }

    return null;
  }

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Initial fetch on mount
  useEffect(() => {
    if (!hasInitiallyFetched.current && !loading) {
      hasInitiallyFetched.current = true;
      dispatch(fetchUsers({ page: 1, limit }));
    }
  }, [dispatch, limit, loading]);

  // Refetch when search changes
  useEffect(() => {
    // Only refetch if search actually changed (using strict comparison)
    const searchValue = searchDebounced.trim() || undefined;
    const lastSearchValue = lastSearch !== undefined ? lastSearch : undefined;
    
    if (searchValue !== lastSearchValue && !loading && hasInitiallyFetched.current) {
      // Clear fetched users cache when search changes to allow refetching
      fetchedUsersRef.current.clear();
      dispatch(fetchUsers({ page: 1, limit, search: searchValue }));
    }
  }, [dispatch, limit, searchDebounced, lastSearch, loading]);

  // Infinite scroll observer - prevent duplicate calls
  const isLoadingRef = useRef(false);
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !isLoadingRef.current) {
      isLoadingRef.current = true;
      const nextPage = page + 1;
      const searchValue = searchDebounced.trim() || undefined;
      dispatch(fetchMoreUsers({ page: nextPage, limit, search: searchValue })).finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [dispatch, hasMore, loadingMore, loading, page, limit, searchDebounced]);

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

  // Fetch last message for users that don't have one
  useEffect(() => {
    if (!users?.length || !fetchMessages) return;

    const fetchLastMessages = async () => {
      const usersToFetch = users.filter((u) => {
        const userId = getDriverId(u);
        if (!userId) return false;
        // Only fetch if:
        // 1. User doesn't have last_message from API
        // 2. We haven't already fetched for this user
        // 3. We're not currently fetching for this user
        return (
          !u.last_message &&
          !fetchedUsersRef.current.has(userId) &&
          !fetchingMessages.has(userId)
        );
      });

      if (usersToFetch.length === 0) return;

      // Mark users as being fetched
      const newFetchingSet = new Set(fetchingMessages);
      usersToFetch.forEach((u) => {
        const userId = getDriverId(u);
        if (userId) {
          newFetchingSet.add(userId);
          fetchedUsersRef.current.add(userId);
        }
      });
      setFetchingMessages(newFetchingSet);

      // Fetch messages for all users in parallel (with a limit to avoid too many requests)
      const fetchPromises = usersToFetch.slice(0, 10).map(async (u) => {
        const userId = getDriverId(u);
        if (!userId) return null;

        try {
          const { messages } = await fetchMessages(userId);
          if (messages && messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const lastMessageText = lastMessage?.content?.message || "";
            const lastChatTime = lastMessage?.dateTime || null;

            // Update Redux store with last message
            dispatch(
              updateUserLastMessage({
                userid: userId,
                lastMessage: lastMessageText,
                lastChatTime: lastChatTime,
              })
            );
          } else {
            // Even if no messages, mark as fetched to avoid refetching
            dispatch(
              updateUserLastMessage({
                userid: userId,
                lastMessage: "",
                lastChatTime: null,
              })
            );
          }
        } catch (error) {
          console.error(`Failed to fetch messages for user ${userId}:`, error);
          // On error, still mark as fetched to avoid infinite retries
          fetchedUsersRef.current.add(userId);
        } finally {
          // Remove from fetching set
          setFetchingMessages((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        }
      });

      await Promise.all(fetchPromises);
    };

    fetchLastMessages();
  }, [users, fetchMessages, dispatch, fetchingMessages]);

  // Subscribe to unread counts for all users
  useEffect(() => {
    if (!subscribeUnreadCount || !users?.length) return;

    // Subscribe to unread counts for each user
    users.forEach((u) => {
      const userId = getDriverId(u);
      if (!userId) return;

      // If already subscribed, skip
      if (unsubscribeUnreadRefs.current[userId]) return;

      // Subscribe to unread count changes
      const unsubscribe = subscribeUnreadCount(userId, (count) => {
        setUnreadCounts((prev) => ({
          ...prev,
          [userId]: count,
        }));
      });

      unsubscribeUnreadRefs.current[userId] = unsubscribe;
    });

    // Cleanup: unsubscribe from users that are no longer in the list
    return () => {
      const currentUserIds = new Set(users.map((u) => getDriverId(u)).filter(Boolean));
      Object.keys(unsubscribeUnreadRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          const unsubscribe = unsubscribeUnreadRefs.current[userId];
          if (unsubscribe) {
            unsubscribe();
            delete unsubscribeUnreadRefs.current[userId];
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
  }, [users, subscribeUnreadCount]);

  // Transform users from Redux to drivers format
  const drivers = useMemo(() => {
    if (!users?.length) return [];

    const withLastChat = users
      .map((u) => {
        const userId = getDriverId(u);
        if (!userId) {
          return null;
        }

        return {
          userid: userId,
          driver_name: u.name || u.driver_name,
          driver_image: u.profilePic || u.image || null,
          lastSeen: u.lastSeen || null,
          last_message: u.last_message || "",
          last_chat_time: normalizeTimestamp(
            u.last_chat_time ??
              u.lastMessageTimeStamp ??
              u.lastMessageTimestamp ??
              null
          ),
          last_seen_time: normalizeTimestamp(u.lastSeen ?? u.last_seen ?? null),
          unreadCount: unreadCounts[userId] ?? 0,
        };
      })
      .filter(Boolean);

    // 🔥 SORT → latest chat first, but prioritize unread messages
    const driversWithIds = withLastChat.filter(Boolean);

    const sortedDrivers = driversWithIds.sort((a, b) => {
      const left = a?.last_chat_time ?? 0;
      const right = b?.last_chat_time ?? 0;
      return right - left;
    });
    
    return sortedDrivers.map((driver) => {
      const lastChatTime = driver.last_chat_time ?? 0;
      const lastSeenTime = driver.last_seen_time ?? 0;
      const fallbackUnread = lastChatTime > lastSeenTime ? 1 : 0;
      const unreadCount = driver.unreadCount > 0 ? driver.unreadCount : fallbackUnread;

      return {
        ...driver,
        unreadCount,
      };
    });
  }, [users, unreadCounts]);

  // No client-side filtering - API handles search
  const filtered = drivers;
  const selectedDriverId = getDriverId(selectedDriver);

  return (
    <div className="h-full flex flex-col">
      {/* 🔍 SEARCH BAR (STICKY) */}
      <div className="p-5 border-b border-gray-700 sticky top-0 bg-[#0d1117] z-20">
        <Input
          type="text"
          placeholder="Search drivers..."
          className="w-full bg-[#1f2937]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 📜 DRIVER LIST (ONLY THIS SCROLLS) */}
      <div className="flex-1 overflow-y-auto chat-list-scroll">
        {/* Initial loading skeleton - only show on first load */}
        {loading && users.length === 0 && <SkeletonLoader count={10} />}

        {/* Show list items - even when loading more */}
        {!loading && filtered.length > 0 && (
          <>
            {filtered.map((driver) => (
              <ChatListItem
                key={driver.userid}
                driver={driver}
                isSelected={selectedDriverId === driver.userid}
                onClick={() => onSelectDriver(driver)}
              />
            ))}
          </>
        )}

        {/* Show existing items while loading more */}
        {loading && users.length > 0 && (
          <>
            {filtered.map((driver) => (
              <ChatListItem
                key={driver.userid}
                driver={driver}
                isSelected={selectedDriverId === driver.userid}
                onClick={() => onSelectDriver(driver)}
              />
            ))}
          </>
        )}

        {/* Infinite scroll trigger - only show when hasMore */}
        {hasMore && !loading && (
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
        {!loading && users.length === 0 && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            No drivers found
          </p>
        )}

        {/* No more to load */}
        {!hasMore && !loading && !loadingMore && filtered.length > 0 && (
          <p className="text-center text-gray-500 text-xs mt-2 py-2">
            All drivers loaded
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatList;
