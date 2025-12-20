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
  Home,
  Folder,
  MessageCircle,
  Wrench,
  Truck,
  User,
  FileText,
} from "lucide-react";

const menuItems = [
  { title: "Home", icon: Home, path: "/" },
  { title: "Documents", icon: Folder, path: "/documents" },
  { title: "Chat", icon: MessageCircle, badge: 12, path: "/chat" },
  {
    title: "Maintenance Chat",
    icon: Wrench,
    badge: 1,
    path: "/maintenance-chat",
  },
  { title: "Drivers", icon: Truck, path: "/drivers" },
  { title: "Admins", icon: User, path: "/admins" },
  { title: "Note", icon: FileText, path: "/note" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-20 bg-[#161b22] p-4 flex flex-col items-center gap-6 border-r border-gray-700">
      <h1 className="text-lg font-bold text-center">DM</h1>

      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (
          <Link
            to={item.path}
            key={item.title}
            className={`relative text-center cursor-pointer p-2 rounded-lg transition
              ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}
            `}
          >
            {/* ICON */}
            <Icon className="w-6 h-6 mx-auto" />

            {/* BADGE */}
            {item.badge && (
              <span className="absolute -top-1 -right-1 text-xs bg-red-500 px-1 rounded-full">
                {item.badge}
              </span>
            )}

            {/* LABEL */}
            <p className="text-[10px] mt-1 opacity-80">{item.title}</p>
          </Link>
        );
      })}
    </div>
  );
}
