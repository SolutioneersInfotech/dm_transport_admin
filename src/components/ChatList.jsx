import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchChatThreads, fetchMoreChatThreads, markThreadReadOptimistic } from "../store/slices/chatThreadsSlice";
import ChatListItem from "./ChatListItem";
import SkeletonLoader from "./skeletons/Skeleton";
import { Input } from "./ui/input";
import { markThreadRead as defaultMarkThreadRead } from "../services/chatAPI";

const ChatList = ({ onSelectDriver, selectedDriver, chatApi }) => {
  const dispatch = useAppDispatch();
  const { threads, loading, loadingMore, hasMore, page, limit, lastSearch } = useAppSelector(
    (state) => state.chatThreads
  );
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const observerTarget = useRef(null);
  const hasInitiallyFetched = useRef(false);
  const threadType = chatApi?.chatType ?? "general";
  const markThreadRead = chatApi?.markThreadRead || defaultMarkThreadRead;

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
      dispatch(fetchChatThreads({ page: 1, limit, type: threadType }));
    }
  }, [dispatch, limit, loading, threadType]);

  // Refetch when search changes
  useEffect(() => {
    // Only refetch if search actually changed (using strict comparison)
    const searchValue = searchDebounced.trim() || undefined;
    const lastSearchValue = lastSearch !== undefined ? lastSearch : undefined;
    
    if (searchValue !== lastSearchValue && !loading && hasInitiallyFetched.current) {
      dispatch(fetchChatThreads({ page: 1, limit, search: searchValue, type: threadType }));
    }
  }, [dispatch, limit, searchDebounced, lastSearch, loading, threadType]);

  // Infinite scroll observer - prevent duplicate calls
  const isLoadingRef = useRef(false);
  
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading && !isLoadingRef.current) {
      isLoadingRef.current = true;
      const nextPage = page + 1;
      const searchValue = searchDebounced.trim() || undefined;
      dispatch(fetchMoreChatThreads({ page: nextPage, limit, search: searchValue, type: threadType })).finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [dispatch, hasMore, loadingMore, loading, page, limit, searchDebounced, threadType]);

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

  // Transform users from Redux to drivers format
  const drivers = useMemo(() => {
    if (!threads?.length) return [];

    return threads
      .map((thread) => {
        const userId = thread?.driverId ?? thread?.userid ?? thread?.userId ?? thread?.id ?? null;
        if (!userId) {
          return null;
        }

        const lastMessage = thread?.lastMessage || {};
        return {
          userid: userId,
          driver_name: thread?.name || thread?.driver_name,
          driver_image: thread?.avatarUrl || thread?.driver_image || null,
          phone: thread?.phone ?? null,
          lastSeen: thread?.lastSeen || null,
          last_message: lastMessage?.text || "",
          last_chat_time: normalizeTimestamp(lastMessage?.dateTime ?? lastMessage?.datetime ?? null),
          unreadCount: typeof thread?.unreadCount === "number" ? thread.unreadCount : 0,
          lastReadAt: thread?.lastReadAt ?? null,
        };
      })
      .filter(Boolean);
  }, [threads]);

  // No client-side filtering - API handles search
  const filtered = drivers;
  const selectedDriverId = getDriverId(selectedDriver);

  const handleSelectDriver = async (driver) => {
    const driverId = getDriverId(driver);
    onSelectDriver(driver);

    if (!driverId) return;
    dispatch(markThreadReadOptimistic(driverId));

    try {
      await markThreadRead(driverId, { lastReadAt: Date.now(), type: threadType });
    } catch (error) {
      console.error("Failed to mark thread as read:", error);
      const searchValue = searchDebounced.trim() || undefined;
      dispatch(fetchChatThreads({ page: 1, limit, search: searchValue, type: threadType }));
    }
  };

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
        {loading && drivers.length === 0 && <SkeletonLoader count={10} />}

        {/* Show list items - even when loading more */}
        {!loading && filtered.length > 0 && (
          <>
            {filtered.map((driver) => (
              <ChatListItem
                key={driver.userid}
                driver={driver}
                isSelected={selectedDriverId === driver.userid}
                onClick={() => handleSelectDriver(driver)}
              />
            ))}
          </>
        )}

        {/* Show existing items while loading more */}
        {loading && drivers.length > 0 && (
          <>
            {filtered.map((driver) => (
              <ChatListItem
                key={driver.userid}
                driver={driver}
                isSelected={selectedDriverId === driver.userid}
                onClick={() => handleSelectDriver(driver)}
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
        {!loading && drivers.length === 0 && filtered.length === 0 && (
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
