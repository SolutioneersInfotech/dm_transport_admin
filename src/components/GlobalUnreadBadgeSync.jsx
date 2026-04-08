import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers } from "../store/slices/usersSlice";
import { fetchMaintenanceUsers } from "../store/slices/maintenanceUsersSlice";
import { setUnreadCountForUser } from "../store/slices/chatUnreadSlice";
import { subscribeUnreadCount as subscribeRegularChatUnread } from "../services/chatAPI";
import { subscribeUnreadCount as subscribeMaintenanceChatUnread } from "../services/maintenanceChatAPI";
import useAppResumeSync from "../hooks/useAppResumeSync";

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

function buildChatTargetFromUser(user) {
  const userId = getUserId(user);
  if (!userId) return null;

  return {
    userid: userId,
    userId,
    contactId: user?.contactId ?? user?.contactid ?? null,
    phoneNumber: user?.phoneNumber ?? null,
    phone: user?.phone ?? null,
    mobile: user?.mobile ?? null,
    contact: user?.contact ?? null,
    whatsappNumber: user?.whatsappNumber ?? null,
  };
}

export default function GlobalUnreadBadgeSync() {
  const dispatch = useAppDispatch();
  const { users, loading, limit } = useAppSelector((state) => state.users);
  const {
    users: maintenanceUsers,
    hasLoaded: maintenanceHasLoaded,
    loading: maintenanceLoading,
  } = useAppSelector((state) => state.maintenanceUsers);

  const regularUnsubscribeRefs = useRef({});
  const maintenanceUnsubscribeRefs = useRef({});
  const prevUserCountRef = useRef(0);

  const handleResumeReconcile = useCallback(() => {
    // Keep live listeners, but explicitly reconcile list state after browser resume/network restore.
    if (!loading) {
      dispatch(fetchUsers({ page: 1, limit: -1 }));
    }

    if (!maintenanceLoading) {
      dispatch(fetchMaintenanceUsers({ limit: -1 }));
    }
  }, [dispatch, loading, maintenanceLoading]);

  useAppResumeSync(handleResumeReconcile);

  useEffect(() => {
    if (!maintenanceHasLoaded && !maintenanceLoading) {
      dispatch(fetchMaintenanceUsers({ limit: -1 }));
    }
  }, [dispatch, maintenanceHasLoaded, maintenanceLoading]);

  useEffect(() => {
    // Defer the "load all regular-chat users" call to idle time to avoid
    // competing with critical UI navigation (e.g. opening Chat).
    if (loading || limit === -1) {
      return;
    }

    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      dispatch(fetchUsers({ page: 1, limit: -1 }));
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(run);
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timeoutId =
      typeof window !== "undefined" ? window.setTimeout(run, 0) : setTimeout(run, 0);
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.clearTimeout(timeoutId);
        return;
      }
      clearTimeout(timeoutId);
    };
  }, [dispatch, loading, limit]);

  useEffect(() => {
    if (!users?.length) return;

    // Only do work when the number of users grows.
    // This avoids re-scanning the full list on every minor mutation.
    if (users.length === prevUserCountRef.current) {
      return;
    }
    prevUserCountRef.current = users.length;

    users.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || regularUnsubscribeRefs.current[userId]) return;

      const chatTarget = buildChatTargetFromUser(user);
      if (!chatTarget) return;

      const unsubscribe = subscribeRegularChatUnread(chatTarget, (count) => {
        dispatch(setUnreadCountForUser({ userId, chatType: "regular", count }));
      });

      regularUnsubscribeRefs.current[userId] = unsubscribe;
    });

    // Do NOT aggressively clean up here based on users array,
    // because global unread should be stable across pages.
    // We only need to clean up when the component unmounts.
  }, [users, dispatch]);

  useEffect(() => {
    return () => {
      Object.values(regularUnsubscribeRefs.current).forEach((unsubscribe) => {
        try {
          unsubscribe && unsubscribe();
        } catch {
          // ignore
        }
      });
      regularUnsubscribeRefs.current = {};
    };
  }, []);

  useEffect(() => {
    if (!maintenanceUsers?.length) return;

    maintenanceUsers.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || maintenanceUnsubscribeRefs.current[userId]) return;

      const unsubscribe = subscribeMaintenanceChatUnread(userId, (count) => {
        dispatch(setUnreadCountForUser({ userId, chatType: "maintenance", count }));
      });

      maintenanceUnsubscribeRefs.current[userId] = unsubscribe;
    });

    return () => {
      const currentUserIds = new Set(maintenanceUsers.map(getUserId).filter(Boolean));
      Object.keys(maintenanceUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          maintenanceUnsubscribeRefs.current[userId]?.();
          delete maintenanceUnsubscribeRefs.current[userId];
        }
      });
    };
  }, [maintenanceUsers, dispatch]);

  useEffect(() => {
    return () => {
      Object.values(maintenanceUnsubscribeRefs.current).forEach((unsubscribe) => unsubscribe?.());
      maintenanceUnsubscribeRefs.current = {};
    };
  }, []);

  return null;
}
