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

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";

const menuSections = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboard, path: "/" },
      { title: "Documents", icon: Folder, path: "/documents" },
      { title: "Chat", icon: MessageCircle, badge: 12, path: "/chat" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        title: "Maintenance Chat",
        icon: Wrench,
        badge: 1,
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
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showMenuIcon, setShowMenuIcon] = useState(false);
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([
    {
      id: "notif-1",
      title: "Chat escalation",
      detail: "3 new escalations need review",
      time: "2m ago",
    },
    {
      id: "notif-2",
      title: "Document upload",
      detail: "12 manifests pending approval",
      time: "18m ago",
    },
    {
      id: "notif-3",
      title: "System update",
      detail: "Nightly sync completed",
      time: "1h ago",
    },
  ]);
  const unreadCount = useMemo(() => notifications.length, [notifications]);

  useEffect(() => {
    const savedUser = localStorage.getItem("adminUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
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

  function handleLogout() {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "/login";
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
        {menuSections.map((section) => (
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
                onClick={() => setNotifications([])}
                className="text-xs font-semibold text-slate-400 transition hover:text-slate-200"
              >
                Clear
              </button>
            </div>

            <div className="space-y-2">
              {notifications.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-800 px-3 py-4 text-xs text-slate-500">
                  You&apos;re all caught up.
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200">
                        {notification.title}
                      </p>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {notification.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div
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
                {user?.name || user?.username || user?.userid || "Admin"}
              </p>
              <p className="text-xs text-slate-400">
                {user?.email || user?.userid || "admin@dmtransport.io"}
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
                {user?.userid || "Admin"}
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
