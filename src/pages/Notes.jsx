import { useEffect, useMemo, useRef, useState } from "react";
import {
  addReaction,
  deleteNotesMessage,
  sendNotesMessage,
  subscribeNotesMessages,
  updateNotesMessagePriority,
  uploadNotesAttachment,
} from "../services/notesChatAPI";

const EMOJI_CHOICES = ["😀", "👍", "❤️", "😂", "😡"];
const PRIORITY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];
const PRIORITY_COLORS = {
  3: "bg-[#8A0A00]",
  2: "bg-[#8B4D05]",
  1: "bg-[#02409C]",
  0: "bg-[#161b22]",
};

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem("adminUser"));
  } catch {
    return null;
  }
}

function formatTime(date) {
  if (!date) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getDateLabel(date) {
  if (!date) {
    return "Unknown";
  }

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) {
    return "Today";
  }

  if (isSameDay(date, yesterday)) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getInitials(name) {
  if (!name) {
    return "?";
  }

  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getReactionCount(reactions) {
  if (!reactions) {
    return 0;
  }

  return Object.values(reactions).reduce((total, users) => {
    if (Array.isArray(users)) {
      return total + users.length;
    }
    return total;
  }, 0);
}

export default function Notes() {
  const [messages, setMessages] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeEmojiMenu, setActiveEmojiMenu] = useState(null);
  const [activePriorityMenu, setActivePriorityMenu] = useState(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachmentType, setAttachmentType] = useState("photo");
  const [modalContent, setModalContent] = useState(null);

  const listRef = useRef(null);
  const fileInputRef = useRef(null);
  const isNearBottomRef = useRef(true);

  const adminUser = useMemo(() => getAdminUser(), []);

  useEffect(() => {
    const unsubscribe = subscribeNotesMessages({
      onChange: setMessages,
      onError: (error) => console.error("Notes subscription error", error),
      priorityFilter,
    });

    return () => unsubscribe();
  }, [priorityFilter]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }

    if (isNearBottomRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const groupedMessages = useMemo(() => {
    const groups = [];
    messages.forEach((message) => {
      const label = getDateLabel(message.timestamp);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.label !== label) {
        groups.push({ label, items: [message] });
      } else {
        lastGroup.items.push(message);
      }
    });
    return groups;
  }, [messages]);

  const handleScroll = () => {
    if (!listRef.current) {
      return;
    }

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    isNearBottomRef.current = isNearBottom;
  };

  const handleSend = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isUploading) {
      return;
    }

    setInputValue("");

    try {
      await sendNotesMessage({ text: trimmed, type: "text", adminUser });
    } catch (error) {
      console.error("Failed to send note", error);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  const handleAttachmentClick = (type) => {
    const input = fileInputRef.current;
    if (!input) {
      return;
    }

    setAttachmentType(type);
    input.value = "";

    if (type === "photo") {
      input.accept = "image/*";
    } else if (type === "video") {
      input.accept = "video/*";
    } else {
      input.accept = "*/*";
    }

    input.click();
    setAttachmentMenuOpen(false);
  };

  const handleAttachmentChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const type =
      attachmentType === "photo"
        ? "image"
        : attachmentType === "video"
        ? "video"
        : "document";

    setIsUploading(true);
    try {
      const downloadURL = await uploadNotesAttachment(file, type);
      await sendNotesMessage({
        type,
        contentOverride: downloadURL,
        text: inputValue.trim(),
        adminUser,
      });
    } catch (error) {
      console.error("Failed to upload attachment", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    const userId = adminUser?.userid;
    if (!userId) {
      return;
    }

    try {
      await addReaction({ messageId, emoji, userId });
    } catch (error) {
      console.error("Failed to add reaction", error);
    }
  };

  const handleDelete = async (messageId) => {
    const confirmed = window.confirm("Delete this note message?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteNotesMessage(messageId);
    } catch (error) {
      console.error("Failed to delete note message", error);
    }
  };

  const handlePriorityChange = async (messageId, value) => {
    try {
      await updateNotesMessagePriority(messageId, value);
      setActivePriorityMenu(null);
    } catch (error) {
      console.error("Failed to update priority", error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117] text-white">
      <div className="border-b border-gray-800 px-3 py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Note</h1>
            <p className="text-xs text-gray-400">
              Send updates, attachments, and priorities in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300">Priority</label>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-md border border-gray-700 bg-[#161b22] px-3 py-2 text-sm text-white"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-hidden px-0 pb-6 pt-3">
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="notes-scroll flex-1 max-h-[73vh] overflow-y-auto rounded-2xl border border-gray-800 bg-[#0f131a] px-4 py-6"
        >
          {groupedMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              No notes yet.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {groupedMessages.map((group) => (
                <div key={group.label} className="flex flex-col gap-4">
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-[#161b22] px-4 py-1 text-xs text-gray-300">
                      {group.label}
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    {group.items.map((message) => {
                      const isMine =
                        message.senderId &&
                        adminUser?.userid &&
                        message.senderId === adminUser.userid;
                      const priorityClass =
                        PRIORITY_COLORS[message.priority] ||
                        PRIORITY_COLORS[0];
                      const reactionCount = getReactionCount(message.reactions);

                      return (
                        <div
                          key={message.id}
                          className={`flex w-full gap-3 ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!isMine && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold">
                              {getInitials(message.senderName)}
                            </div>
                          )}
                          <div className="relative max-w-[70%]">
                            <div
                              className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${priorityClass}`}
                            >
                              {message.type === "text" && (
                                <p className="whitespace-pre-wrap">
                                  {message.content}
                                </p>
                              )}
                              {message.type === "image" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalContent({
                                      type: "image",
                                      content: message.content,
                                    })
                                  }
                                  className="overflow-hidden rounded-lg"
                                >
                                  <img
                                    src={message.content}
                                    alt="Note attachment"
                                    className="max-h-60 w-auto rounded-lg object-cover"
                                  />
                                </button>
                              )}
                              {message.type === "video" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setModalContent({
                                      type: "video",
                                      content: message.content,
                                    })
                                  }
                                  className="w-full overflow-hidden rounded-lg"
                                >
                                  <video
                                    src={message.content}
                                    className="max-h-60 w-full rounded-lg object-cover"
                                  />
                                  <div className="mt-2 text-xs text-gray-200">
                                    Tap to play video
                                  </div>
                                </button>
                              )}
                              {message.type === "document" && (
                                <a
                                  href={message.content}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-200 hover:text-blue-100"
                                >
                                  📄 Open document
                                </a>
                              )}
                            </div>
                            <div
                              className={`mt-2 flex items-center gap-3 text-xs text-gray-400 ${
                                isMine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span>{formatTime(message.timestamp)}</span>
                              {reactionCount > 0 && (
                                <span className="rounded-full bg-[#161b22] px-2 py-0.5 text-[11px] text-gray-200">
                                  {reactionCount}
                                </span>
                              )}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveEmojiMenu(
                                      activeEmojiMenu === message.id
                                        ? null
                                        : message.id
                                    )
                                  }
                                  className="rounded-full border border-gray-700 px-2 py-0.5 text-[11px] text-gray-200"
                                >
                                  😊
                                </button>
                                {activeEmojiMenu === message.id && (
                                  <div className="absolute right-0 z-20 mt-2 flex gap-2 rounded-lg border border-gray-700 bg-[#161b22] p-2">
                                    {EMOJI_CHOICES.map((emoji) => (
                                      <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => {
                                          handleReaction(message.id, emoji);
                                          setActiveEmojiMenu(null);
                                        }}
                                        className="text-base"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isMine && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(message.id)}
                                    className="text-xs text-red-300 hover:text-red-200"
                                  >
                                    Delete
                                  </button>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setActivePriorityMenu(
                                          activePriorityMenu === message.id
                                            ? null
                                            : message.id
                                        )
                                      }
                                      className="rounded-full border border-gray-700 px-2 py-0.5 text-[11px] text-gray-200"
                                    >
                                      ...
                                    </button>
                                    {activePriorityMenu === message.id && (
                                      <div className="absolute right-0 z-20 mt-2 w-32 rounded-lg border border-gray-700 bg-[#161b22] py-1 text-xs">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePriorityChange(message.id, 3)
                                          }
                                          className="block w-full px-3 py-2 text-left text-red-200 hover:bg-gray-800"
                                        >
                                          High priority
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePriorityChange(message.id, 2)
                                          }
                                          className="block w-full px-3 py-2 text-left text-orange-200 hover:bg-gray-800"
                                        >
                                          Medium priority
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handlePriorityChange(message.id, 1)
                                          }
                                          className="block w-full px-3 py-2 text-left text-blue-200 hover:bg-gray-800"
                                        >
                                          Low priority
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-gray-800 bg-[#0f131a] px-4 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                className="rounded-full border border-gray-700 px-3 py-2 text-sm text-gray-200"
              >
                + Attachment
              </button>
              {attachmentMenuOpen && (
                <div className="absolute left-0 top-12 z-20 w-40 rounded-lg border border-gray-700 bg-[#161b22] py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleAttachmentClick("photo")}
                    className="block w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-800"
                  >
                    Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachmentClick("video")}
                    className="block w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-800"
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAttachmentClick("document")}
                    className="block w-full px-4 py-2 text-left text-gray-200 hover:bg-gray-800"
                  >
                    Docs
                  </button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentChange}
            />
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a note..."
              className="flex-1 rounded-full border border-gray-700 bg-[#0d1117] px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isUploading || !inputValue.trim()}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
            >
              {isUploading ? "Uploading..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="relative max-h-full w-full max-w-4xl">
            <button
              type="button"
              onClick={() => setModalContent(null)}
              className="absolute -right-3 -top-3 rounded-full bg-gray-900 px-3 py-1 text-sm text-white"
            >
              Close
            </button>
            {modalContent.type === "image" && (
              <img
                src={modalContent.content}
                alt="Note attachment"
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
            )}
            {modalContent.type === "video" && (
              <video
                src={modalContent.content}
                controls
                className="max-h-[80vh] w-full rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
