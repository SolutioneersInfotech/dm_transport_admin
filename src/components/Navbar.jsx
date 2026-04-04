import { useState } from "react";
import { Settings, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotesNotifications from "./NotesNotifications";
import { Button } from "./ui/button";

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
        {/* Broadcast Icon */}
        <div className="cursor-pointer hover:opacity-80 transition" onClick={() => navigate("/broadcast")} title="Broadcast Messages">
          <Megaphone className="w-5 h-5" />
        </div>
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

            <Button
              variant="ghost"
              className="w-full justify-start px-4 py-2 text-gray-300"
            >
              Change Password
            </Button>

            <Button
              onClick={handleLogout}
              variant="destructive"
              className="w-full justify-start px-4 py-2"
            >
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
