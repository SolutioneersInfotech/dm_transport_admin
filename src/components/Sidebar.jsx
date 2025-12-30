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

import { Link, useLocation } from "react-router-dom";
import {
  Folder,
  MessageCircle,
  Wrench,
  Truck,
  User,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
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

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-lg font-semibold">
          DM
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">DM Transport</span>
          <span className="text-xs text-slate-400">Admin Panel</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
        {menuSections.map((section) => (
          <div key={section.label} className="space-y-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;

                return (
                  <Link
                    to={item.path}
                    key={item.title}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition
                      ${
                        isActive
                          ? "bg-slate-800 text-white"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4 text-slate-400 group-hover:text-white" />
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
            <ShieldCheck className="h-5 w-5 text-slate-200" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Admin Team</p>
            <p className="text-xs text-slate-400">admin@dmtransport.io</p>
          </div>
          <button
            className="rounded-md border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
            type="button"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
