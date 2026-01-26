import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers, fetchMoreUsers, updateUserLastMessage } from "../store/slices/usersSlice";
import ChatListItem from "./ChatListItem";
import SkeletonLoader from "./skeletons/Skeleton";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { fetchMessages as defaultFetchMessages } from "../services/chatAPI";

const ChatList = ({ onSelectDriver, selectedDriver, chatApi }) => {
  const dispatch = useAppDispatch();
  const { users, loading, loadingMore, hasMore, page, limit } = useAppSelector(
    (state) => state.users
  );
  // console.log(users);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]); // Array of selected categories: ["F", "D", "C"]
  const observerTarget = useRef(null);
  const hasInitiallyFetched = useRef(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);
  const fetchedUsersRef = useRef(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const unsubscribeUnreadRefs = useRef({});
  
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

  // Clear cache on mount
  useEffect(() => {
    fetchedUsersRef.current.clear();
  }, []);

  // Initial fetch on mount - fetch all users with limit=-1
  useEffect(() => {
    if (!hasInitiallyFetched.current && !loading) {
      hasInitiallyFetched.current = true;
      dispatch(fetchUsers({ page: 1, limit: -1 }));
    }
  }, [dispatch, loading]);

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

  // Fetch last message for ALL users, then show sorted list (prevents reordering UX issue)
  useEffect(() => {
    if (!users?.length || !fetchMessages || loading) return;

    const fetchAllLastMessages = async () => {
      // Don't fetch if we're already fetching
      if (isFetchingMessages) return;

      // Find all users that need message fetching
      // FIX: Always fetch from Firebase to get actual message text, even if backend has timestamp
      // Backend might have timestamp but not message text, so we need to fetch to show proper message
      const usersToFetch = users.filter((u) => {
        const userId = getDriverId(u);
        if (!userId) return false;
        
        // FIX: Always fetch if message text is missing, even if we've fetched before
        // This handles the case where backend has timestamp but not message text
        const hasMessageText = u.last_message !== undefined && 
                              u.last_message !== null && 
                              u.last_message.trim() !== "";
        
        // If we've already fetched AND have message text, skip
        if (fetchedUsersRef.current.has(userId) && hasMessageText) {
          return false;
        }
        
        // Fetch if:
        // 1. We haven't fetched yet, OR
        // 2. We've fetched but message text is missing (need to get it from Firebase)
        return true;
      });

      if (usersToFetch.length === 0) {
        // All users already have messages (from backend or cached), no need to show loading
        return;
      }

      // Set loading state - this will hide the list until sorting is complete
      setIsFetchingMessages(true);

      try {
        // Fetch messages for ALL users in parallel - only fetch 1 message to get lastMessageTime
        const fetchPromises = usersToFetch.map(async (u) => {
          const userId = getDriverId(u);
          if (!userId) return null;

          try {
            // Fetch only 1 message (just to get last message time) - fastest!
            // FIX: fetchMessages now fetches 20 messages, sorts by timestamp, and returns the most recent
            const { messages } = await fetchMessages(userId, 1);
            if (messages && messages.length > 0) {
              // Messages are already sorted ascending by fetchMessages, so last element is most recent
              const lastMessage = messages[messages.length - 1];
              
              // Get actual message text - check both content.message and message fields
              let lastMessageText = lastMessage?.content?.message || 
                                  lastMessage?.message || 
                                  (lastMessage?.content ? "" : "");
              
              // If message is empty but there's an attachment, show "Attachment"
              if (!lastMessageText || lastMessageText.trim() === "") {
                const attachmentUrl = lastMessage?.content?.attachmentUrl || 
                                     lastMessage?.attachmentUrl || 
                                     "";
                if (attachmentUrl && attachmentUrl.trim() !== "") {
                  lastMessageText = "Attachment";
                }
              }
              
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
              // Even if no messages, mark as fetched
              dispatch(
                updateUserLastMessage({
                  userid: userId,
                  lastMessage: "",
                  lastChatTime: null,
                })
              );
            }
            fetchedUsersRef.current.add(userId);
          } catch (error) {
            console.error(`Failed to fetch messages for user ${userId}:`, error);
            // On error, still mark as fetched to avoid infinite retries
            fetchedUsersRef.current.add(userId);
            // Set empty values on error
            dispatch(
              updateUserLastMessage({
                userid: userId,
                lastMessage: "",
                lastChatTime: null,
              })
            );
          }
        });

        // Wait for ALL messages to be fetched
        await Promise.all(fetchPromises);
      } finally {
        // All messages fetched and sorted - now show the list
        setIsFetchingMessages(false);
      }
    };

    fetchAllLastMessages();
  }, [users, fetchMessages, dispatch, loading, isFetchingMessages]);

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
          driver_image: u.profilePic || u.image || null,
          lastSeen: u.lastSeen || null,
          last_message: u.last_message || "",
          last_chat_time: u.last_chat_time || null,
          unreadCount: unreadCounts[userId] || 0,
          category: u.category || null, // Include category field
        };
      })
      .filter(Boolean);

    // 🔥 SORT → latest chat first (by timestamp only, no unread priority)
    const driversWithIds = withLastChat.filter(Boolean);
    driversWithIds.sort((a, b) => {
      // Sort only by last chat time (newest first)
      if (!a.last_chat_time) return 1;
      if (!b.last_chat_time) return -1;
      return (
        new Date(b.last_chat_time).getTime() -
        new Date(a.last_chat_time).getTime()
      );
    });
   

    return driversWithIds;
  }, [users, unreadCounts]);

  // Client-side filtering - filter by search and category
  const filtered = useMemo(() => {
    // Create a copy of the drivers array to avoid mutating the original
    let driversCopy = [...drivers];
    
    // Filter by category first (multiple categories allowed)
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
  }, [drivers, search, categoryFilter]);
  
  const selectedDriverId = getDriverId(selectedDriver);

  return (
    <div className="h-full flex flex-col">
      {/* 🔍 SEARCH BAR (STICKY) */}
      <div className="p-5 border-b border-gray-700 sticky top-0 bg-[#0d1117] z-20">
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
          </div>
        </div>
      </div>

      {/* 📜 DRIVER LIST (ONLY THIS SCROLLS) */}
      <div className="flex-1 overflow-y-auto chat-list-scroll">
        {/* Show loading skeleton while fetching users OR fetching messages for sorting */}
        {(loading || isFetchingMessages) && (
          <SkeletonLoader count={10} />
        )}

        {/* Show sorted list ONLY after messages are fetched and sorted (prevents reordering UX issue) */}
        {!loading && !isFetchingMessages && filtered.length > 0 && (
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

        {/* Infinite scroll trigger - only show when hasMore (disabled since we fetch all) */}
        {hasMore && !loading && !isFetchingMessages && (
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
        {!loading && !isFetchingMessages && users.length === 0 && filtered.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            No drivers found
          </p>
        )}

        {/* No more to load */}
        {!hasMore && !loading && !loadingMore && !isFetchingMessages && filtered.length > 0 && (
          <p className="text-center text-gray-500 text-xs mt-2 py-2">
            All drivers loaded
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatList;
