import { useEffect, useRef, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers } from "../store/slices/usersSlice";
import { fetchMaintenanceUsers } from "../store/slices/maintenanceUsersSlice";
import { setUnreadCountForUser, removeUserUnreadCounts } from "../store/slices/chatUnreadSlice";
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
    // For global unread counts, we want ALL regular-chat users exactly once.
    // If limit is not -1, it means we have not yet loaded the full list.
    if (!loading && limit !== -1) {
      dispatch(fetchUsers({ page: 1, limit: -1 }));
    }

    if (!maintenanceHasLoaded && !maintenanceLoading) {
      dispatch(fetchMaintenanceUsers({ limit: -1 }));
    }
  }, [dispatch, loading, limit, maintenanceHasLoaded, maintenanceLoading]);

  useEffect(() => {
    if (!users?.length) return;

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

    return () => {
      const currentUserIds = new Set(users.map(getUserId).filter(Boolean));
      Object.keys(regularUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          regularUnsubscribeRefs.current[userId]?.();
          delete regularUnsubscribeRefs.current[userId];
          dispatch(removeUserUnreadCounts(userId));
        }
      });
    };
  }, [users, dispatch]);

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
      Object.values(regularUnsubscribeRefs.current).forEach((unsubscribe) => unsubscribe?.());
      Object.values(maintenanceUnsubscribeRefs.current).forEach((unsubscribe) => unsubscribe?.());
      regularUnsubscribeRefs.current = {};
      maintenanceUnsubscribeRefs.current = {};
    };
  }, []);

  return null;
}
