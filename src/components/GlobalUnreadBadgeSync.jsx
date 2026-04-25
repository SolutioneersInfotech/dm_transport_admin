import { useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setUnreadCountForUser, removeUserUnreadCounts } from "../store/slices/chatUnreadSlice";
import { subscribeUnreadCount as subscribeRegularChatUnread } from "../services/chatAPI";
import { subscribeUnreadCount as subscribeMaintenanceChatUnread } from "../services/maintenanceChatAPI";

const MAX_GLOBAL_UNREAD_SUBSCRIPTIONS = 75;

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

function getBackendUnreadCount(user) {
  return Number(
    user?.unreadCount ??
      user?.unread_count ??
      user?.unseenCount ??
      user?.unseen_count ??
      0
  ) || 0;
}

export default function GlobalUnreadBadgeSync() {
  const dispatch = useAppDispatch();
  const { users } = useAppSelector((state) => state.users);
  const { users: maintenanceUsers } = useAppSelector((state) => state.maintenanceUsers);

  const regularUnsubscribeRefs = useRef({});
  const maintenanceUnsubscribeRefs = useRef({});
  const previousRegularUserIdsRef = useRef(new Set());
  // Limit client-side realtime unread listeners; a true global unread counter should come
  // from a backend aggregate endpoint rather than N Firebase subscriptions on the client.
  const regularSubscriptionUsers = useMemo(
    () => users.slice(0, MAX_GLOBAL_UNREAD_SUBSCRIPTIONS),
    [users]
  );

  useEffect(() => {
    if (!users?.length) return;

    users.forEach((user) => {
      const userId = getUserId(user);
      if (!userId) return;

      dispatch(
        setUnreadCountForUser({
          userId,
          chatType: "regular",
          count: getBackendUnreadCount(user),
        })
      );
    });
  }, [users, dispatch]);

  useEffect(() => {
    if (!regularSubscriptionUsers?.length) return;

    regularSubscriptionUsers.forEach((user) => {
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
      const currentUserIds = new Set(regularSubscriptionUsers.map(getUserId).filter(Boolean));
      Object.keys(regularUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          regularUnsubscribeRefs.current[userId]?.();
          delete regularUnsubscribeRefs.current[userId];
        }
      });
    };
  }, [regularSubscriptionUsers, dispatch]);

  useEffect(() => {
    const currentUserIds = new Set(users.map(getUserId).filter(Boolean));

    previousRegularUserIdsRef.current.forEach((userId) => {
      if (!currentUserIds.has(userId)) {
        dispatch(removeUserUnreadCounts(userId));
      }
    });

    previousRegularUserIdsRef.current = currentUserIds;

    Object.keys(regularUnsubscribeRefs.current).forEach((userId) => {
      if (!currentUserIds.has(userId)) {
        regularUnsubscribeRefs.current[userId]?.();
        delete regularUnsubscribeRefs.current[userId];
      }
    });
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
