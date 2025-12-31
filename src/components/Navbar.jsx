import { useState } from "react";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotesNotifications from "./NotesNotifications";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 🔥 Logout function
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative flex justify-end items-center p-4 bg-[#161b22] border-b border-gray-700">
      <div className="flex items-center gap-6">
        <NotesNotifications />
        {/* Settings Icon */}
        <div className="cursor-pointer" onClick={() => setOpen(!open)}>
          <Settings className="w-5 h-5" />
        </div>

        {/* 🔥 Dropdown */}
        {open && (
          <div className="absolute top-16 right-4 w-56 bg-[#1f242d] border border-gray-700 rounded-lg shadow-xl py-3 z-50">
            <p className="px-4 pb-2 text-gray-300 text-sm">Logged in as:</p>

            {/* 🎉 Real Admin Name */}
            <p className="px-4 font-semibold text-white mb-3">
              {user?.userid || "Admin"}
            </p>

            <button className="w-full text-left px-4 py-2 hover:bg-[#2a313a] text-gray-300">
              Change Password
            </button>

            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white text-red-400"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
