import { useEffect, useRef, useState } from "react";
import { StickyNote, X } from "lucide-react";
import {
  deleteAllNotesNotifications,
  deleteNotesNotificationByTimestamp,
  subscribeNotesNotifications,
} from "../services/notesNotificationsAPI";

export default function NotesNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeNotesNotifications(setItems);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeleteAll = async () => {
    if (items.length === 0) {
      return;
    }

    const confirmed = window.confirm("Delete all notes notifications?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteAllNotesNotifications();
    } catch (error) {
      console.error("Failed to delete all notes notifications.", error);
    }
  };

  const handleDeleteOne = async (timestamp) => {
    if (timestamp == null) {
      console.warn("Notes notification timestamp is missing.");
      return;
    }

    const confirmed = window.confirm("Delete this note notification?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteNotesNotificationByTimestamp(timestamp);
    } catch (error) {
      console.error("Failed to delete note notification.", error);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-gray-200 hover:bg-[#2a313a]"
        aria-label="Notes notifications"
      >
        <StickyNote className="h-5 w-5" />
        {items.length > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-semibold text-white">
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 max-w-[20rem] rounded-lg border border-gray-700 bg-[#1f242d] shadow-xl z-50">
          <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
            <span className="text-sm font-semibold text-gray-100">Notes</span>
            <button
              type="button"
              onClick={handleDeleteAll}
              disabled={items.length === 0}
              className="text-xs font-medium text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:text-gray-500"
            >
              Delete All
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                No notes
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.docId}
                  className="flex items-center gap-3 border-b border-gray-700 px-4 py-3 text-sm text-gray-200 last:border-b-0 hover:bg-[#2a313a]"
                >
                  <p className="flex-1 truncate" title={item.message}>
                    {item.message || "(No message)"}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(item.timestamp)}
                    disabled={item.timestamp == null}
                    className="rounded p-1 text-gray-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:text-gray-600"
                    aria-label="Delete notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
