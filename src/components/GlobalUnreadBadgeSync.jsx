import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchUsers, updateUserLastMessage } from "../store/slices/usersSlice";
import {
  fetchMaintenanceUsers,
  updateMaintenanceUserLastMessage,
} from "../store/slices/maintenanceUsersSlice";
import {
  setUnreadCountForUser,
  removeUserUnreadCounts,
} from "../store/slices/chatUnreadSlice";
import {
  fetchMessages as fetchRegularMessages,
  subscribeLastMessage as subscribeRegularLastMessage,
  subscribeUnreadCount as subscribeRegularChatUnread,
} from "../services/chatAPI";
import {
  fetchMessages as fetchMaintenanceMessages,
  subscribeLastMessage as subscribeMaintenanceLastMessage,
  subscribeUnreadCount as subscribeMaintenanceChatUnread,
} from "../services/maintenanceChatAPI";

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

function getLastMessagePayload(lastMessage) {
  let lastMessageText =
    lastMessage?.content?.message || lastMessage?.message || (lastMessage?.content ? "" : "");

  if (!lastMessageText || lastMessageText.trim() === "") {
    const attachmentUrl =
      lastMessage?.content?.attachmentUrl || lastMessage?.attachmentUrl || "";

    if (attachmentUrl && attachmentUrl.trim() !== "") {
      lastMessageText = "Attachment";
    }
  }

  return {
    lastMessage: lastMessageText || "",
    lastChatTime: lastMessage?.dateTime || null,
  };
}

export default function GlobalUnreadBadgeSync() {
  const dispatch = useAppDispatch();
  const { users, hasLoaded, loading } = useAppSelector((state) => state.users);
  const {
    users: maintenanceUsers,
    hasLoaded: maintenanceHasLoaded,
    loading: maintenanceLoading,
  } = useAppSelector((state) => state.maintenanceUsers);

  const regularUnreadUnsubscribeRefs = useRef({});
  const maintenanceUnreadUnsubscribeRefs = useRef({});
  const regularMessageUnsubscribeRefs = useRef({});
  const maintenanceMessageUnsubscribeRefs = useRef({});

  const pendingRegularMessageUpdates = useRef(new Map());
  const pendingMaintenanceMessageUpdates = useRef(new Map());
  const rafRegularRef = useRef(null);
  const rafMaintenanceRef = useRef(null);

  const hydratedRegularIds = useRef(new Set());
  const hydratedMaintenanceIds = useRef(new Set());

  useEffect(() => {
    if (!hasLoaded && !loading) {
      dispatch(fetchUsers({ page: 1, limit: -1 }));
    }

    if (!maintenanceHasLoaded && !maintenanceLoading) {
      dispatch(fetchMaintenanceUsers({ limit: -1 }));
    }
  }, [dispatch, hasLoaded, loading, maintenanceHasLoaded, maintenanceLoading]);

  useEffect(() => {
    if (!users?.length) return;

    users.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || regularUnreadUnsubscribeRefs.current[userId]) return;

      regularUnreadUnsubscribeRefs.current[userId] = subscribeRegularChatUnread(user, (count) => {
        dispatch(setUnreadCountForUser({ userId, chatType: "regular", count }));
      });
    });

    return () => {
      const currentUserIds = new Set(users.map(getUserId).filter(Boolean));
      Object.keys(regularUnreadUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          regularUnreadUnsubscribeRefs.current[userId]?.();
          delete regularUnreadUnsubscribeRefs.current[userId];
          dispatch(removeUserUnreadCounts(userId));
        }
      });
    };
  }, [users, dispatch]);

  useEffect(() => {
    if (!maintenanceUsers?.length) return;

    maintenanceUsers.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || maintenanceUnreadUnsubscribeRefs.current[userId]) return;

      maintenanceUnreadUnsubscribeRefs.current[userId] = subscribeMaintenanceChatUnread(
        user,
        (count) => {
          dispatch(setUnreadCountForUser({ userId, chatType: "maintenance", count }));
        }
      );
    });

    return () => {
      const currentUserIds = new Set(maintenanceUsers.map(getUserId).filter(Boolean));
      Object.keys(maintenanceUnreadUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          maintenanceUnreadUnsubscribeRefs.current[userId]?.();
          delete maintenanceUnreadUnsubscribeRefs.current[userId];
        }
      });
    };
  }, [maintenanceUsers, dispatch]);

  useEffect(() => {
    if (!users?.length) return;

    const flushRegularUpdates = () => {
      pendingRegularMessageUpdates.current.forEach((payload, userId) => {
        dispatch(updateUserLastMessage({ userid: userId, ...payload }));
      });
      pendingRegularMessageUpdates.current.clear();
      rafRegularRef.current = null;
    };

    users.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || regularMessageUnsubscribeRefs.current[userId]) return;

      if (!hydratedRegularIds.current.has(userId)) {
        hydratedRegularIds.current.add(userId);
        fetchRegularMessages(user, 1)
          .then(({ messages }) => {
            const lastMessage = messages?.[messages.length - 1] ?? null;
            pendingRegularMessageUpdates.current.set(userId, getLastMessagePayload(lastMessage));
            if (!rafRegularRef.current) {
              rafRegularRef.current = requestAnimationFrame(flushRegularUpdates);
            }
          })
          .catch(() => {
            pendingRegularMessageUpdates.current.set(userId, {
              lastMessage: "",
              lastChatTime: null,
            });
            if (!rafRegularRef.current) {
              rafRegularRef.current = requestAnimationFrame(flushRegularUpdates);
            }
          });
      }

      regularMessageUnsubscribeRefs.current[userId] = subscribeRegularLastMessage(
        user,
        (lastMessage) => {
          pendingRegularMessageUpdates.current.set(userId, getLastMessagePayload(lastMessage));
          if (!rafRegularRef.current) {
            rafRegularRef.current = requestAnimationFrame(flushRegularUpdates);
          }
        }
      );
    });

    return () => {
      const currentUserIds = new Set(users.map(getUserId).filter(Boolean));
      Object.keys(regularMessageUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          regularMessageUnsubscribeRefs.current[userId]?.();
          delete regularMessageUnsubscribeRefs.current[userId];
          hydratedRegularIds.current.delete(userId);
        }
      });
    };
  }, [users, dispatch]);

  useEffect(() => {
    if (!maintenanceUsers?.length) return;

    const flushMaintenanceUpdates = () => {
      pendingMaintenanceMessageUpdates.current.forEach((payload, userId) => {
        dispatch(updateMaintenanceUserLastMessage({ userid: userId, ...payload }));
      });
      pendingMaintenanceMessageUpdates.current.clear();
      rafMaintenanceRef.current = null;
    };

    maintenanceUsers.forEach((user) => {
      const userId = getUserId(user);
      if (!userId || maintenanceMessageUnsubscribeRefs.current[userId]) return;

      if (!hydratedMaintenanceIds.current.has(userId)) {
        hydratedMaintenanceIds.current.add(userId);
        fetchMaintenanceMessages(user, 1)
          .then(({ messages }) => {
            const lastMessage = messages?.[messages.length - 1] ?? null;
            pendingMaintenanceMessageUpdates.current.set(userId, getLastMessagePayload(lastMessage));
            if (!rafMaintenanceRef.current) {
              rafMaintenanceRef.current = requestAnimationFrame(flushMaintenanceUpdates);
            }
          })
          .catch(() => {
            pendingMaintenanceMessageUpdates.current.set(userId, {
              lastMessage: "",
              lastChatTime: null,
            });
            if (!rafMaintenanceRef.current) {
              rafMaintenanceRef.current = requestAnimationFrame(flushMaintenanceUpdates);
            }
          });
      }

      maintenanceMessageUnsubscribeRefs.current[userId] = subscribeMaintenanceLastMessage(
        user,
        (lastMessage) => {
          pendingMaintenanceMessageUpdates.current.set(userId, getLastMessagePayload(lastMessage));
          if (!rafMaintenanceRef.current) {
            rafMaintenanceRef.current = requestAnimationFrame(flushMaintenanceUpdates);
          }
        }
      );
    });

    return () => {
      const currentUserIds = new Set(maintenanceUsers.map(getUserId).filter(Boolean));
      Object.keys(maintenanceMessageUnsubscribeRefs.current).forEach((userId) => {
        if (!currentUserIds.has(userId)) {
          maintenanceMessageUnsubscribeRefs.current[userId]?.();
          delete maintenanceMessageUnsubscribeRefs.current[userId];
          hydratedMaintenanceIds.current.delete(userId);
        }
      });
    };
  }, [maintenanceUsers, dispatch]);

  useEffect(() => {
    return () => {
      Object.values(regularUnreadUnsubscribeRefs.current).forEach((unsubscribe) => unsubscribe?.());
      Object.values(maintenanceUnreadUnsubscribeRefs.current).forEach((unsubscribe) =>
        unsubscribe?.()
      );
      Object.values(regularMessageUnsubscribeRefs.current).forEach((unsubscribe) => unsubscribe?.());
      Object.values(maintenanceMessageUnsubscribeRefs.current).forEach((unsubscribe) =>
        unsubscribe?.()
      );

      if (rafRegularRef.current) cancelAnimationFrame(rafRegularRef.current);
      if (rafMaintenanceRef.current) cancelAnimationFrame(rafMaintenanceRef.current);

      regularUnreadUnsubscribeRefs.current = {};
      maintenanceUnreadUnsubscribeRefs.current = {};
      regularMessageUnsubscribeRefs.current = {};
      maintenanceMessageUnsubscribeRefs.current = {};
    };
  }, []);

  return null;
}
