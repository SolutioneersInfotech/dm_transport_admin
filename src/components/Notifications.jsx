import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  subscribeBroadcastNotifications,
  subscribeDocumentUploadNotifications,
  formatNotificationRelativeTime,
} from "../services/notificationsAPI";
import {
  subscribeChatNotifications,
  subscribeMaintenanceChatNotifications,
} from "../services/chatAPI";

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Subscribe to all notification types
    const unsubscribers = [];

    unsubscribers.push(subscribeChatNotifications((chatNotifs) => {
      setNotifications((prev) => {
        // Remove old chat notifications and add new ones
        const filtered = prev.filter((n) => !n.id.startsWith("chat:"));
        return mergeNotifications([...filtered, ...chatNotifs]);
      });
    }));

    unsubscribers.push(subscribeMaintenanceChatNotifications((maintenanceNotifs) => {
      setNotifications((prev) => {
        // Remove old maintenance notifications and add new ones
        const filtered = prev.filter((n) => !n.id.startsWith("maintenance:"));
        return mergeNotifications([...filtered, ...maintenanceNotifs]);
      });
    }));

    unsubscribers.push(subscribeBroadcastNotifications((broadcastNotifs) => {
      setNotifications((prev) => {
        // Remove old broadcast notifications and add new ones
        const filtered = prev.filter((n) => !n.id.startsWith("broadcast:"));
        return mergeNotifications([...filtered, ...broadcastNotifs]);
      });
    }));

    unsubscribers.push(subscribeDocumentUploadNotifications((documentNotifs) => {
      setNotifications((prev) => {
        // Remove old document notifications and add new ones
        const filtered = prev.filter((n) => !n.id.startsWith("document:"));
        return mergeNotifications([...filtered, ...documentNotifs]);
      });
    }));

    return () => unsubscribers.forEach((unsub) => unsub());
  }, []);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const mergeNotifications = (notifs) => {
    // Sort by timestamp descending and remove duplicates
    const map = new Map();
    notifs.forEach((n) => {
      if (!map.has(n.id) || n.timestampMs > map.get(n.id).timestampMs) {
        map.set(n.id, n);
      }
    });
    return Array.from(map.values()).sort((a, b) => b.timestampMs - a.timestampMs);
  };

  const getFilteredNotifications = () => {
    if (activeTab === "all") return notifications;
    return notifications.filter((n) => n.type === activeTab);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "chat":
        return "💬";
      case "maintenance":
        return "🔧";
      case "broadcast":
        return "📢";
      case "document":
        return "📄";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "chat":
        return "border-l-blue-500";
      case "maintenance":
        return "border-l-orange-500";
      case "broadcast":
        return "border-l-purple-500";
      case "document":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.route) {
      navigate(notification.route);
      setOpen(false);
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const tabCounts = {
    all: notifications.length,
    chat: notifications.filter((n) => n.type === "chat").length,
    maintenance: notifications.filter((n) => n.type === "maintenance").length,
    broadcast: notifications.filter((n) => n.type === "broadcast").length,
    document: notifications.filter((n) => n.type === "document").length,
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-200 hover:bg-[#2a313a]"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-96 rounded-lg border border-gray-700 bg-[#1f242d] shadow-xl z-50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <span className="text-sm font-semibold text-gray-100">Notifications</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 px-2 py-2 gap-1 overflow-x-auto">
            {["all", "chat", "maintenance", "broadcast", "document"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-medium whitespace-nowrap rounded transition ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-200 hover:bg-gray-600"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tabCounts[tab] > 0 && (
                  <span className="ml-1.5 text-[10px] font-semibold">
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                {activeTab === "all"
                  ? "No notifications"
                  : `No ${activeTab} notifications`}
              </p>
            ) : (
              <div className="divide-y divide-gray-700">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`border-l-4 ${getNotificationColor(
                      notification.type
                    )} bg-gray-800 p-3 hover:bg-gray-700 cursor-pointer transition`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <p className="text-sm font-medium text-gray-200">
                            {notification.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          {notification.detail}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {formatNotificationRelativeTime(
                            notification.timestampMs
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {filteredNotifications.length > 0 && (
            <div className="border-t border-gray-700 px-4 py-2 text-center">
              <p className="text-[10px] text-gray-500">
                Showing {filteredNotifications.length} notification
                {filteredNotifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
