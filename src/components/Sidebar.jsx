// import { Link, useLocation } from "react-router-dom";

// const menuItems = [
//   { title: "Home", icon: "🏠", path: "/" },
//   { title: "Documents", icon: "📁", path: "/documents" },
//   { title: "Chat", icon: "💬", badge: 12, path: "/chat" },
//   { title: "Maintenance Chat", icon: "🛠", badge: 1, path: "/maintenance-chat" },
//   { title: "Drivers", icon: "🚚", path: "/drivers" },
//   { title: "Admins", icon: "👤", path: "/admins" },
//   { title: "Note", icon: "📄", path: "/note" },
// ];

// export default function Sidebar() {
//   const location = useLocation();

//   return (
//     <div className="w-20 bg-[#161b22] p-4 flex flex-col items-center gap-6 border-r border-gray-700">
//       <h1 className="text-lg font-bold text-center">DM</h1>

//       {menuItems.map((item) => {
//         const isActive = location.pathname === item.path;

//         return (
//           <Link
//             to={item.path}
//             key={item.title}
//             className={`relative text-center cursor-pointer p-2 rounded-lg transition
//               ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}
//             `}
//           >
//             <span className="text-2xl">{item.icon}</span>

//             {item.badge && (
//               <span className="absolute -top-1 -right-1 text-xs bg-red-500 px-1 rounded-full">
//                 {item.badge}
//               </span>
//             )}

//             <p className="text-[10px] mt-1 opacity-80">{item.title}</p>
//           </Link>
//         );
//       })}
//     </div>
//   );
// }

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "../store/hooks";
import { useAuth } from "../context/AuthContext";
import { usePersonalization } from "../context/PersonalizationContext";
import { hasDocumentAccess } from "../utils/documentPermissions";
import { ADMIN_PERMISSION_KEYS, hasAdminPermission } from "../utils/adminPermissions";
import {
  formatNotificationRelativeTime,
  subscribeBroadcastNotifications,
  subscribeDocumentUploadNotifications,
} from "../services/notificationsAPI";
import {
  Bell,
  Folder,
  MessageCircle,
  Wrench,
  Truck,
  User,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  ChevronLeft,
  Menu,
  Megaphone,
  Upload,
  X,
} from "lucide-react";

const DISMISSED_NOTIFICATIONS_STORAGE_KEY = "sidebar_dismissed_notifications_v1";

const menuSections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      { title: "Documents", icon: Folder, path: "/documents" },
      { title: "Chat", icon: MessageCircle, badge: null, path: "/chat" }, // badge will be set dynamically
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Maintenance Chat",
        icon: Wrench,
        badge: null, // badge will be set dynamically
        path: "/maintenance-chat",
      },
      { title: "Drivers", icon: Truck, path: "/drivers" },
      { title: "Admins", icon: User, path: "/admins" },
      { title: "Notes", icon: FileText, path: "/note" },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    personalization,
    isReady: isPersonalizationReady,
    updatePersonalization,
  } = usePersonalization();
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMenuIcon, setShowMenuIcon] = useState(false);
  const userMenuRef = useRef(null);
  const [storedUser, setStoredUser] = useState(null);
  const [broadcastNotifications, setBroadcastNotifications] = useState([]);
  const [documentNotifications, setDocumentNotifications] = useState([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);
  const [notificationNow, setNotificationNow] = useState(() => Date.now());
  const hasHydratedSidebarPersonalization = useRef(false);

  // Get unread data from Redux - badge shows number of users with unseen messages, not total messages
  const { unreadCountsByUser } = useAppSelector((state) => state.chatUnread);
  const { users } = useAppSelector((state) => state.users);
  const { users: maintenanceUsers } = useAppSelector((state) => state.maintenanceUsers);

  // Count how many users have at least one unread (regular vs maintenance)
  const regularChatUnreadUserCount = useMemo(() => {
    return Object.values(unreadCountsByUser || {}).filter((c) => (c?.regular || 0) > 0).length;
  }, [unreadCountsByUser]);
  const maintenanceChatUnreadUserCount = useMemo(() => {
    return Object.values(unreadCountsByUser || {}).filter((c) => (c?.maintenance || 0) > 0).length;
  }, [unreadCountsByUser]);

  const currentUser = user || storedUser;
  const displayName = currentUser?.name || currentUser?.username || currentUser?.userid || "Admin";
  const userRole = currentUser?.role || currentUser?.userType || currentUser?.designation || "Admin";
  const displaySubtitle =
    currentUser?.email && currentUser.email !== displayName && currentUser.email !== currentUser?.userid
      ? currentUser.email
      : userRole;
  const canAccessDocuments = useMemo(
    () => hasDocumentAccess(currentUser?.permissions),
    [currentUser?.permissions]
  );
  const canAccessChat = useMemo(
    () => hasAdminPermission(currentUser?.permissions, ADMIN_PERMISSION_KEYS.chat),
    [currentUser?.permissions]
  );
  const canAccessMaintenanceChat = useMemo(
    () => hasAdminPermission(currentUser?.permissions, ADMIN_PERMISSION_KEYS.maintenanceChat),
    [currentUser?.permissions]
  );
  const canAccessDrivers = useMemo(
    () => hasAdminPermission(currentUser?.permissions, ADMIN_PERMISSION_KEYS.viewDrivers),
    [currentUser?.permissions]
  );
  const canAccessAdmins = useMemo(
    () => hasAdminPermission(currentUser?.permissions, ADMIN_PERMISSION_KEYS.viewAdmin),
    [currentUser?.permissions]
  );

  const getUserDisplayName = (item) =>
    item?.name || item?.driver_name || item?.username || item?.userid || item?.id || "User";

  const getComparableUserId = (item) =>
    item?.userid ??
    item?.userId ??
    item?.contactId ??
    item?.contactid ??
    item?.uid ??
    item?.id ??
    null;

  const getChatNotificationTimestampMs = (item) => {
    const raw = item?.last_chat_time;
    if (!raw) return 0;

    const sec = raw?._seconds ?? raw?.seconds;
    if (typeof sec === "number") {
      return sec * 1000;
    }

    const parsed = new Date(raw).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const getChatNotificationDetail = useCallback((item, unreadCount, isMaintenance = false) => {
    const preview = String(item?.last_message || "").trim();
    const displayName = getUserDisplayName(item);
    const countLabel = unreadCount > 1 ? `${unreadCount} unread messages` : "1 unread message";

    if (preview) {
      return `${displayName}: ${preview}`;
    }

    return isMaintenance
      ? `${displayName} has ${countLabel} in maintenance chat`
      : `${displayName} has ${countLabel}`;
  }, []);

  const chatNotifications = useMemo(() => {
    const regularItems = (users || [])
      .map((item) => {
        const userId = getComparableUserId(item);
        const unreadCount = unreadCountsByUser?.[userId]?.regular || 0;
        if (!userId || unreadCount <= 0) return null;

        const timestampMs = getChatNotificationTimestampMs(item);
        return {
          id: `chat:${userId}:${timestampMs || 0}:${unreadCount}`,
          type: "chat",
          title: unreadCount > 1 ? "New chat messages" : "New chat message",
          detail: getChatNotificationDetail(item, unreadCount, false),
          timestampMs,
          route: `/chat?userid=${encodeURIComponent(userId)}`,
        };
      })
      .filter(Boolean);

    const maintenanceItems = (maintenanceUsers || [])
      .map((item) => {
        const userId = getComparableUserId(item);
        const unreadCount = unreadCountsByUser?.[userId]?.maintenance || 0;
        if (!userId || unreadCount <= 0) return null;

        const timestampMs = getChatNotificationTimestampMs(item);
        return {
          id: `maintenance-chat:${userId}:${timestampMs || 0}:${unreadCount}`,
          type: "maintenance-chat",
          title: unreadCount > 1 ? "Maintenance chat updates" : "Maintenance chat update",
          detail: getChatNotificationDetail(item, unreadCount, true),
          timestampMs,
          route: "/maintenance-chat",
        };
      })
      .filter(Boolean);

    return [...regularItems, ...maintenanceItems];
  }, [getChatNotificationDetail, maintenanceUsers, unreadCountsByUser, users]);

  const notifications = useMemo(() => {
    const dismissedIds = new Set(dismissedNotificationIds);

    return [...chatNotifications, ...broadcastNotifications, ...documentNotifications]
      .filter((item) => item?.id && !dismissedIds.has(item.id))
      .sort((left, right) => right.timestampMs - left.timestampMs);
  }, [broadcastNotifications, chatNotifications, dismissedNotificationIds, documentNotifications]);

  const unreadCount = notifications.length;

  useEffect(() => {
    if (!isPersonalizationReady || hasHydratedSidebarPersonalization.current) {
      return;
    }

    const personalizationSidebar = personalization?.sidebar;
    const personalizationNotifications = personalization?.notifications;

    if (typeof personalizationSidebar?.isCollapsed === "boolean") {
      setIsCollapsed(personalizationSidebar.isCollapsed);
    }

    if (Array.isArray(personalizationNotifications?.dismissedSidebarNotificationIds)) {
      setDismissedNotificationIds(
        personalizationNotifications.dismissedSidebarNotificationIds.filter(Boolean)
      );
    } else {
      try {
        const saved = window.localStorage.getItem(DISMISSED_NOTIFICATIONS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setDismissedNotificationIds(parsed);
          }
        }
      } catch (error) {
        console.error("Failed to read dismissed notifications:", error);
      }
    }

    hasHydratedSidebarPersonalization.current = true;
  }, [isPersonalizationReady, personalization]);

  useEffect(() => {
    if (!hasHydratedSidebarPersonalization.current) {
      return;
    }

    updatePersonalization((current) => ({
      ...current,
      sidebar: {
        ...(current?.sidebar || {}),
        isCollapsed,
      },
    }));
  }, [isCollapsed, updatePersonalization]);

  const persistDismissedNotificationIds = useCallback((nextIds) => {
    setDismissedNotificationIds(nextIds);
    window.localStorage.setItem(
      DISMISSED_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(nextIds)
    );
    if (!hasHydratedSidebarPersonalization.current) {
      return;
    }

    updatePersonalization((current) => ({
      ...current,
      notifications: {
        ...(current?.notifications || {}),
        dismissedSidebarNotificationIds: nextIds,
      },
    }));
  }, [updatePersonalization]);

  // Create menu sections with dynamic badges (number of users with unseen, not total unseen)
  const menuSectionsWithBadges = useMemo(() => {
    return menuSections.map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.path !== "/documents" || canAccessDocuments)
        .filter((item) => item.path !== "/chat" || canAccessChat)
        .filter((item) => item.path !== "/maintenance-chat" || canAccessMaintenanceChat)
        .filter((item) => item.path !== "/drivers" || canAccessDrivers)
        .filter((item) => item.path !== "/admins" || canAccessAdmins)
        .map((item) => {
        if (item.path === "/chat") {
          return { ...item, badge: regularChatUnreadUserCount > 0 ? regularChatUnreadUserCount : null };
        }
        if (item.path === "/maintenance-chat") {
          return { ...item, badge: maintenanceChatUnreadUserCount > 0 ? maintenanceChatUnreadUserCount : null };
        }
        return item;
      }),
    }));
  }, [
    canAccessDocuments,
    canAccessChat,
    canAccessMaintenanceChat,
    canAccessDrivers,
    canAccessAdmins,
    regularChatUnreadUserCount,
    maintenanceChatUnreadUserCount,
  ]);

  useEffect(() => {
    const savedUser = localStorage.getItem("adminUser");
    if (savedUser) {
      setStoredUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const unsubscribeBroadcasts = subscribeBroadcastNotifications(setBroadcastNotifications);
    const unsubscribeDocuments = subscribeDocumentUploadNotifications(setDocumentNotifications);

    return () => {
      unsubscribeBroadcasts?.();
      unsubscribeDocuments?.();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNotificationNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isCollapsed) {
      setShowMenuIcon(false);
      return undefined;
    }

    const interval = setInterval(() => {
      setShowMenuIcon((prev) => !prev);
    }, 2000);

    return () => clearInterval(interval);
  }, [isCollapsed]);

  useEffect(() => {
    if (isCollapsed) {
      setOpen(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/login";
  }

  function handleClearNotifications() {
    persistDismissedNotificationIds([
      ...new Set([...dismissedNotificationIds, ...notifications.map((item) => item.id)]),
    ]);
  }

  function handleDismissNotification(notificationId) {
    persistDismissedNotificationIds([...new Set([...dismissedNotificationIds, notificationId])]);
  }

  function handleNotificationClick(notification) {
    if (!notification?.route) return;
    navigate(notification.route);
  }

  function getNotificationAccent(notificationType) {
    if (notificationType === "broadcast") return "text-amber-300";
    if (notificationType === "document") return "text-emerald-300";
    return "text-sky-300";
  }

  function renderNotificationIcon(notificationType) {
    if (notificationType === "broadcast") {
      return <Megaphone className={`h-4 w-4 ${getNotificationAccent(notificationType)}`} />;
    }

    if (notificationType === "document") {
      return <Upload className={`h-4 w-4 ${getNotificationAccent(notificationType)}`} />;
    }

    return <MessageCircle className={`h-4 w-4 ${getNotificationAccent(notificationType)}`} />;
  }

  return (
    <aside
      className={`flex h-screen flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-all duration-200 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className="relative flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold transition-opacity duration-[2000ms] ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}
            >
              DM
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className={`absolute inset-0 flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-100 shadow-sm transition-all duration-[2000ms] ${
                isCollapsed
                  ? "scale-100 opacity-100"
                  : "scale-90 opacity-0 pointer-events-none"
              }`}
              aria-label="Expand sidebar"
            >
              {showMenuIcon ? (
                <Menu className="h-5 w-5" />
              ) : (
                <span className="text-base">DM</span>
              )}
            </button>
          </div>
          <div className={`${isCollapsed ? "hidden" : "flex"} flex-col`}>
            <span className="text-sm font-semibold">DM Transport</span>
            <span className="text-xs text-slate-400">Admin Panel</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={`rounded-md border border-slate-800 p-1.5 text-slate-300 transition-all duration-[2000ms] hover:border-slate-600 hover:text-white ${
            isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div
        className={`sidebar-scroll flex flex-1 flex-col gap-6 overflow-y-auto ${
          isCollapsed ? "px-2 py-4" : "px-4 py-6"
        }`}
      >
        {menuSectionsWithBadges.map((section) => (
          <div key={section.label} className="space-y-3">
            {!isCollapsed && (
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {section.label}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                  to={item.path}
                  key={item.title}
                  className={`group relative flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isCollapsed ? "justify-center" : "gap-3"
                  }
                    ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }
                  `}
                  >
                  <Icon className={`text-slate-400 group-hover:text-white ${
                    isCollapsed ? "h-7 w-8" : "h-5 w-5"
                  }`} />
                  <span className={isCollapsed ? "sr-only" : "flex-1"}>
                    {item.title}
                  </span>
                  {item.badge && !isCollapsed && (
                    <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                    {item.badge}
                    </span>
                  )}
                  {item.badge && isCollapsed && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-200">
                    {item.badge}
                    </span>
                  )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {!isCollapsed && (
          <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Bell className="h-4 w-4 text-slate-400" />
                Notifications
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearNotifications}
                className="text-xs font-semibold text-slate-400 transition hover:text-slate-200"
              >
                Clear
              </button>
            </div>

            <div className="max-h-[26.5rem] space-y-2 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-xs text-slate-500">
                  You&apos;re all caught up.
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="w-full cursor-pointer rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-700 hover:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className="mt-0.5 shrink-0">
                          {renderNotificationIcon(notification.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-xs font-semibold text-slate-200">
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-500">
                              {formatNotificationRelativeTime(notification.timestampMs, notificationNow)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                            {notification.detail}
                          </p>
                        </div>
                      </div>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label="Dismiss notification"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDismissNotification(notification.id);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDismissNotification(notification.id);
                          }
                        }}
                        className="rounded p-1 text-slate-500 transition hover:text-slate-200"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div
          ref={userMenuRef}
          className={`relative flex items-center rounded-lg bg-slate-900 px-3 py-3 ${
            isCollapsed ? "justify-center" : "gap-3"
          }`}
        >
          {!isCollapsed && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <ShieldCheck className="h-5 w-5 text-slate-200" />
          </div>
          )}
          {!isCollapsed && (
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {displayName}
              </p>
              <p className="text-xs text-slate-400">
                {displaySubtitle}
              </p>
            </div>
          )}
          <button
            className="rounded-md border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            type="button"
            onClick={() => setOpen((prev) => !prev)}
          >
            <Settings className="h-4 w-4" />
          </button>
          {open && (
            <div className="absolute bottom-16 right-0 w-56 rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-xl">
              <p className="px-3 pb-2 text-xs text-slate-400">Logged in as</p>
              <p className="px-3 pb-2 text-sm font-semibold text-slate-100">
                {currentUser?.userid || "Admin"}
              </p>
              <button className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-900 hover:text-white">
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="w-full rounded-md px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-200"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
