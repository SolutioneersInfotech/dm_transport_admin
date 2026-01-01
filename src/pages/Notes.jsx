import { useEffect, useState } from "react";
import {
  deleteAllNotesNotifications,
  deleteNotesNotificationByTimestamp,
  subscribeNotesNotifications,
} from "../services/notesNotificationsAPI";

export default function Notes() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeNotesNotifications(setItems);
    return () => unsubscribe();
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
    <div className="min-h-screen bg-[#101418] px-6 py-8 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Notes</h1>
            <p className="text-sm text-gray-400">
              Review and clear notes notifications in real time.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={items.length === 0}
            className="rounded-md border border-red-500/60 px-4 py-2 text-sm font-medium text-red-300 transition hover:border-red-400 hover:text-red-200 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
          >
            Delete All
          </button>
        </div>

        <div className="rounded-xl border border-gray-700 bg-[#161b22]">
          {items.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-400">
              No notes
            </p>
          ) : (
            <ul className="divide-y divide-gray-800">
              {items.map((item) => (
                <li
                  key={item.docId}
                  className="flex items-center justify-between gap-4 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-100">
                      {item.message || "(No message)"}
                    </p>
                    {item.userid && (
                      <p className="text-xs text-gray-500">
                        User: {item.userid}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOne(item.timestamp)}
                    disabled={item.timestamp == null}
                    className="text-xs font-semibold text-gray-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:text-gray-600"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
