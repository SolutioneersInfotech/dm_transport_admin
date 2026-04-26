import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  Filter,
  Image,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Shield,
  Trash2,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Checkbox } from "../components/ui/checkbox";
import { sendBroadcast, fetchBroadcastHistory, deleteBroadcast } from "../services/broadcastAPI";
import { uploadBroadcastFile } from "../services/broadcastFileUpload";
import FilePreviewModal from "../components/FilePreviewModal";
import { useAppSelector } from "../store/hooks";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { extractAttachmentDisplayName } from "../utils/chatAttachments";

const MESSAGE_LIMIT = 500;

const recipientOptions = [
  { value: "admins", label: "Admins", icon: Shield },
  { value: "drivers", label: "Drivers", icon: User },
  { value: "all", label: "All Users", icon: Users },
];

const historyFilters = [
  { value: "all", label: "All" },
  { value: "admins", label: "Admins" },
  { value: "drivers", label: "Drivers" },
];

function getBroadcastAudienceLabel(recipientType) {
  switch (recipientType) {
    case "admins":
      return "Admin Broadcast";
    case "drivers":
      return "Driver Broadcast";
    case "all":
      return "All Users Broadcast";
    default:
      return "Broadcast";
  }
}

export default function Broadcast() {
  const navigate = useNavigate();
  const [recipients, setRecipients] = useState("all");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [showRecipientList, setShowRecipientList] = useState(false);
  const [driverSelections, setDriverSelections] = useState({});
  const [adminSelections, setAdminSelections] = useState({});
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historySearch, setHistorySearch] = useState("");
  const [isComposeCollapsed, setIsComposeCollapsed] = useState(false);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [pendingDeleteBroadcast, setPendingDeleteBroadcast] = useState(null);
  const [isDeletingBroadcast, setIsDeletingBroadcast] = useState(false);
  const fileInputRef = useRef(null);

  const { users: drivers = [] } = useAppSelector((state) => state.users);
  const maintenanceUsers = useAppSelector(
    (state) => state?.maintenanceUsers?.users || []
  );
  const { user: adminUser } = useAuth();

  useEffect(() => {
    loadBroadcastHistory();
  }, []);

  useEffect(() => {
    setDriverSelections((prev) => {
      const next = { ...prev };

      drivers.forEach((driver) => {
        const id = driver?.userid ?? driver?.id;
        if (id && !(id in next)) {
          next[id] = true;
        }
      });

      return next;
    });
  }, [drivers]);

  useEffect(() => {
    setAdminSelections((prev) => {
      const next = { ...prev };

      maintenanceUsers.forEach((admin) => {
        const id = admin?.userid ?? admin?.id;
        if (id && !(id in next)) {
          next[id] = true;
        }
      });

      return next;
    });
  }, [maintenanceUsers]);

  useEffect(() => {
    setShowRecipientList(false);
  }, [recipients]);

  useEffect(() => {
    if (!showAttachmentPreview) return;
    setShowAttachmentOptions(false);
  }, [showAttachmentPreview]);

  const loadBroadcastHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchBroadcastHistory();
      setBroadcastHistory(data || []);
    } catch {
      toast.error("Failed to load broadcast history");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedDriverIds = () =>
    drivers
      .map((driver) => driver?.userid ?? driver?.id)
      .filter((id) => id && driverSelections[id]);

  const getSelectedAdminIds = () =>
    maintenanceUsers
      .map((admin) => admin?.userid ?? admin?.id)
      .filter((id) => id && adminSelections[id]);

  const selectedDriverCount = getSelectedDriverIds().length;
  const selectedAdminCount = getSelectedAdminIds().length;
  const selectionList = recipients === "drivers" ? drivers : maintenanceUsers;
  const currentSelections =
    recipients === "drivers" ? driverSelections : adminSelections;

  const allVisibleSelected =
    selectionList.length > 0 &&
    selectionList.every((person) => {
      const id = person?.userid ?? person?.id;
      return id ? currentSelections[id] : false;
    });

  const selectionLabel =
    recipients === "drivers"
      ? selectedDriverCount > 0
        ? `${selectedDriverCount} drivers selected`
        : "Select Users..."
      : recipients === "admins"
        ? selectedAdminCount > 0
          ? `${selectedAdminCount} admins selected`
          : "Select Users..."
        : "All users selected";

  const filteredHistory = broadcastHistory.filter((broadcast) => {
    const matchesType =
      historyFilter === "all" || broadcast.recipientType === historyFilter;

    const searchValue = historySearch.trim().toLowerCase();
    if (!searchValue) {
      return matchesType;
    }

    const haystack = [
      broadcast.message,
      broadcast.attachmentName,
      broadcast.sendername,
      broadcast.recipientType,
      ...(broadcast.recipientNames || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesType && haystack.includes(searchValue);
  });

  const handleUserSelection = (userId) => {
    if (recipients === "drivers") {
      setDriverSelections((prev) => ({
        ...prev,
        [userId]: !prev[userId],
      }));
      return;
    }

    setAdminSelections((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleToggleAll = () => {
    const nextValue = !allVisibleSelected;
    const nextSelections = {};

    selectionList.forEach((person) => {
      const id = person?.userid ?? person?.id;
      if (id) {
        nextSelections[id] = nextValue;
      }
    });

    if (recipients === "drivers") {
      setDriverSelections(nextSelections);
      return;
    }

    setAdminSelections(nextSelections);
  };

  const openAttachmentPicker = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
    setShowAttachmentOptions(false);
  };

  const handleAttachmentSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAttachment(file);
      setShowAttachmentPreview(true);
    }
    event.target.value = "";
  };

  const handleAttachmentUploaded = (url) => {
    if (!selectedAttachment) return;

    setSelectedAttachment((prev) =>
      prev
        ? {
            file: prev,
            url,
            name: prev.name || "",
            mimeType: prev.type || "",
          }
        : prev
    );
    setShowAttachmentPreview(false);
  };

  const clearAttachment = () => {
    setSelectedAttachment(null);
    setShowAttachmentPreview(false);
    setShowAttachmentOptions(false);
  };

  const handleSendBroadcast = async () => {
    const hasMessage = Boolean(message.trim());
    const attachmentMeta =
      selectedAttachment && !(selectedAttachment instanceof File) ? selectedAttachment : null;

    if (!hasMessage && !attachmentMeta?.url) {
      toast.error("Enter a message or attach a file");
      return;
    }

    if (recipients === "drivers" && selectedDriverCount === 0) {
      toast.error("Select at least one driver");
      return;
    }

    if (recipients === "admins" && selectedAdminCount === 0) {
      toast.error("Select at least one admin");
      return;
    }

    setBroadcasting(true);
    try {
      await sendBroadcast(
        recipients,
        message,
        drivers,
        maintenanceUsers,
        getSelectedDriverIds(),
        getSelectedAdminIds(),
        {
          attachmentUrl: attachmentMeta?.url || "",
          attachmentName: attachmentMeta?.name || "",
          attachmentMimeType: attachmentMeta?.mimeType || "",
        }
      );

      toast.success("Broadcast sent successfully");
      setMessage("");
      clearAttachment();
      loadBroadcastHistory();
    } catch {
      toast.error("Failed to send broadcast");
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDeleteBroadcast = (broadcast) => {
    setPendingDeleteBroadcast(broadcast);
  };

  const confirmDeleteBroadcast = async () => {
    if (!pendingDeleteBroadcast?.id) return;

    setIsDeletingBroadcast(true);
    try {
      await deleteBroadcast(pendingDeleteBroadcast.id);
      loadBroadcastHistory();
      setPendingDeleteBroadcast(null);
    } catch (error) {
      console.error("Failed to delete broadcast:", error);
      toast.error("Failed to delete broadcast");
    } finally {
      setIsDeletingBroadcast(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="w-full px-5 py-6">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-1 text-white/55 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Megaphone className="h-4 w-4 text-[#6e83ff]" />
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-white/92">
            Broadcast Messages
          </h1>
        </div>

        <section className="rounded-[10px] border border-white/7 bg-slate-950 p-5 shadow-[0_18px_40px_rgba(4,2,16,0.28)]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[15px] font-semibold text-white/92">
              Send Broadcast
            </div>
            <button
              type="button"
              onClick={() => setIsComposeCollapsed((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-white/8 bg-[#282047]/72 text-white/60 transition hover:text-white"
              aria-label={
                isComposeCollapsed ? "Expand send broadcast panel" : "Collapse send broadcast panel"
              }
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isComposeCollapsed ? "" : "rotate-180"
                }`}
              />
            </button>
          </div>

          {!isComposeCollapsed && (
            <div className="mt-4 rounded-[10px] border border-white/7 bg-slate-950 p-4">
            <label className="mb-2 block text-[13px] font-semibold text-white/78">
              Recipients
            </label>

            <div className="rounded-[9px] border border-white/8 bg-slate-950 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {recipientOptions.map((option) => {
                    const Icon = option.icon;
                    const active = recipients === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setRecipients(option.value)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition ${
                          active
                            ? "border-[#7287ff]/70 bg-[#6b7ef6]/20 text-white"
                            : "border-white/8 bg-white/[0.03] text-white/68 hover:text-white/88"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{option.label}</span>
                        {active && <X className="h-3 w-3 text-white/45" />}
                      </button>
                    );
                  })}
                </div>
                <ChevronDown className="h-4 w-4 text-white/32" />
              </div>
            </div>

            <div className="mt-2">
              <button
                type="button"
                onClick={() =>
                  recipients !== "all" &&
                  setShowRecipientList((prev) => !prev)
                }
                className={`flex w-full items-center justify-between rounded-[9px] border border-white/8 px-4 py-3 text-left text-[13px] transition ${
                  recipients === "all"
                    ? "cursor-default bg-slate-950 text-white/42"
                    : "bg-slate-950 text-white/72 hover:text-white"
                }`}
              >
                <span>{recipients === "all" ? "Select Users..." : selectionLabel}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/35 transition-transform ${
                    showRecipientList ? "rotate-180" : ""
                  }`}
                />
              </button>

              {recipients !== "all" && showRecipientList && (
                <div className="mt-2 rounded-[9px] border border-white/8 bg-slate-950 p-3">
                  <div className="mb-2 px-1 text-[11px] uppercase tracking-[0.22em] text-white/34">
                    {recipients === "drivers"
                      ? `${selectedDriverCount} Selected`
                      : `${selectedAdminCount} Selected`}
                  </div>

                  <label className="mb-1 flex items-center justify-between rounded-md px-2 py-2 text-[13px] text-white/82 hover:bg-white/[0.04]">
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={handleToggleAll}
                        className="border-white/18 bg-white/[0.04] data-[state=checked]:border-[#6b82ff] data-[state=checked]:bg-[#6b82ff] data-[state=checked]:text-white"
                      />
                      <span>Select All</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/32">
                      Default
                    </span>
                  </label>

                  <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                    {selectionList.map((person) => {
                      const id = person?.userid ?? person?.id;
                      const name =
                        person?.name ||
                        person?.driver_name ||
                        person?.admin_name ||
                        person?.username ||
                        "Unknown";

                      return (
                        <label
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-[13px] text-white/74 transition hover:bg-white/[0.04] hover:text-white"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Checkbox
                              checked={currentSelections[id] || false}
                              onCheckedChange={() => handleUserSelection(id)}
                              className="border-white/18 bg-white/[0.04] data-[state=checked]:border-[#6b82ff] data-[state=checked]:bg-[#6b82ff] data-[state=checked]:text-white"
                            />
                            <span className="truncate">{name}</span>
                          </div>
                          <span className="text-[11px] text-white/28">{id}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[13px] font-semibold text-white/78">
                  Message
                </label>
                <span className="text-[11px] text-white/36">
                  {message.length}/{MESSAGE_LIMIT}
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,application/pdf"
                onChange={handleAttachmentSelect}
                className="hidden"
                aria-label="Attach file to broadcast"
              />
              <div className="relative">
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(event.target.value.slice(0, MESSAGE_LIMIT))
                  }
                  rows={4}
                  placeholder="Enter your broadcast message..."
                  className="min-h-[112px] w-full resize-none rounded-[9px] border border-white/8 bg-slate-950 px-4 py-3.5 pr-16 text-[13px] text-white outline-none placeholder:text-white/27 focus:border-[#6b82ff]/75"
                />
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={() => setShowAttachmentOptions((prev) => !prev)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-[#111b21] text-white/72 backdrop-blur-sm transition hover:bg-[#1a252c] hover:text-white"
                    aria-label="Attach file to broadcast"
                    aria-expanded={showAttachmentOptions}
                    aria-haspopup="true"
                  >
                    <Paperclip className="h-4.5 w-4.5" />
                  </button>
                  {showAttachmentOptions && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowAttachmentOptions(false)}
                        aria-hidden="true"
                      />
                      <div
                        className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-white/10 bg-[#18142b] py-2 shadow-[0_18px_40px_rgba(0,0,0,0.38)]"
                        role="menu"
                        aria-label="Choose attachment type"
                      >
                        <button
                          type="button"
                          onClick={() => openAttachmentPicker("image/*")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-white/86 transition hover:bg-white/[0.05]"
                          role="menuitem"
                        >
                          <Image className="h-4.5 w-4.5 text-[#8ab4f8]" />
                          <span className="text-sm">Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAttachmentPicker("video/*")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-white/86 transition hover:bg-white/[0.05]"
                          role="menuitem"
                        >
                          <Video className="h-4.5 w-4.5 text-[#b5a3ff]" />
                          <span className="text-sm">Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openAttachmentPicker("application/pdf")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-white/86 transition hover:bg-white/[0.05]"
                          role="menuitem"
                        >
                          <FileText className="h-4.5 w-4.5 text-[#fca5a5]" />
                          <span className="text-sm">PDF</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-1 text-[11px] text-white/34">
                {message.length}/{MESSAGE_LIMIT}
              </div>

              {selectedAttachment?.url && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-[11px] border border-white/8 bg-slate-950 px-4 py-3 text-[13px] text-white/80">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/55">
                      <Paperclip className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-white/88">
                        {selectedAttachment.name || "Attachment ready"}
                      </p>
                      <p className="text-[11px] text-white/42">
                        Ready to send with this broadcast
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="rounded p-1 text-white/45 transition hover:bg-white/[0.05] hover:text-white"
                    aria-label="Remove attachment"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSendBroadcast}
              disabled={broadcasting}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(90deg,#4b67de,#5f8dff)] text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(77,105,222,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {broadcasting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Broadcast</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Broadcast</span>
                </>
              )}
            </button>
            </div>
          )}
        </section>

        <section className="mt-4 rounded-[10px] border border-white/7 bg-slate-950 shadow-[0_18px_40px_rgba(4,2,16,0.24)]">
          <div className="border-b border-white/7 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-white/92">
                Broadcast History
              </h2>

              <div className="flex items-center gap-2">
                {!isHistoryCollapsed && (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                      <input
                        value={historySearch}
                        onChange={(event) => setHistorySearch(event.target.value)}
                        placeholder="Search broadcasts..."
                        className="h-8 w-[148px] rounded-md border border-white/8 bg-slate-950 pl-8 pr-2 text-[12px] text-white outline-none placeholder:text-white/27"
                      />
                    </div>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-white/8 bg-slate-950 text-white/60"
                    >
                      <Filter className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setIsHistoryCollapsed((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/8 bg-slate-950 text-white/60 transition hover:text-white"
                  aria-label={
                    isHistoryCollapsed
                      ? "Expand broadcast history panel"
                      : "Collapse broadcast history panel"
                  }
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isHistoryCollapsed ? "" : "rotate-180"
                    }`}
                  />
                </button>
              </div>
            </div>

            {!isHistoryCollapsed && (
              <div className="mt-2 flex items-center gap-2">
                {historyFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setHistoryFilter(filter.value)}
                    className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-[12px] transition ${
                      historyFilter === filter.value
                        ? "border-[#6f85ff]/70 bg-[#637bff]/20 text-white"
                        : "border-white/8 bg-white/[0.03] text-white/68"
                    }`}
                  >
                    <span>{filter.label}</span>
                    {filter.value === "all" && <ChevronDown className="h-3 w-3" />}
                  </button>
                ))}

                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-white/8 bg-slate-950 text-white/60"
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {!isHistoryCollapsed && (
            <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-white/65" />
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="rounded-[9px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-[13px] text-white/45">
                  No broadcasts found.
                </div>
              ) : (
                filteredHistory.map((broadcast) => {
                  const recipientCount = broadcast.recipientNames?.length || 0;
                  const preview =
                    broadcast.message?.length > 80
                      ? `${broadcast.message.slice(0, 80)}...`
                      : broadcast.message;

                  return (
                    <article
                      key={broadcast.id}
                      className="rounded-[10px] border border-white/7 bg-slate-950 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-2.5">
                          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#4058cb]/20 text-[#85a0ff]">
                            <Megaphone className="h-4 w-4" />
                          </div>

                          <div>
                            <div className="text-[15px] font-semibold text-white/92">
                              {getBroadcastAudienceLabel(broadcast.recipientType)}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                              <span>{formatDateCompact(broadcast.timestamp)}</span>
                              <span>|</span>
                              <span className="rounded bg-white/[0.04] px-1.5 py-0.5">
                                {broadcast.sendername || "Unknown Admin"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteBroadcast(broadcast)}
                          className="rounded p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                          title="Delete broadcast"
                          aria-label="Delete broadcast"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-white/55">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {recipientCount} recipients
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-[#74d996]" />
                          Sent to {recipientCount} users
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-[#74d996]" />
                          Delivered: {recipientCount}
                        </span>
                      </div>

                      {broadcast.attachmentUrl && (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-[10px] border border-white/7 bg-white/[0.03] px-3 py-2.5 text-[12px] text-white/72">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-white/45">
                              <Paperclip className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-medium text-white/84">
                                {extractAttachmentDisplayName({
                                  explicitName: broadcast.attachmentName,
                                  url: broadcast.attachmentUrl,
                                  fallback: "Attachment",
                                })}
                              </p>
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/32">
                                Attachment
                              </p>
                            </div>
                          </div>
                          <a
                            href={broadcast.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/72 transition hover:bg-white/[0.04] hover:text-white"
                          >
                            Open
                          </a>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/7 pt-3">
                        <p className="line-clamp-1 text-[12px] text-white/62">
                          {preview}
                        </p>
                        <button
                          type="button"
                          className="shrink-0 text-[11px] text-white/44 transition hover:text-white/75"
                        >
                          View More &gt;
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}

        </section>
      </div>
      {pendingDeleteBroadcast && (
        <div
          className="fixed inset-0 z-[190] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Delete broadcast confirmation"
        >
          <div className="w-full max-w-md rounded-[16px] border border-white/10 bg-slate-950 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] font-semibold text-white">
                  Delete broadcast?
                </h3>
                <p className="mt-1 text-[13px] text-white/55">
                  This will permanently delete the broadcast message?
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDeletingBroadcast && setPendingDeleteBroadcast(null)}
                disabled={isDeletingBroadcast}
                className="rounded p-1 text-white/45 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close delete confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-[12px] border border-white/8 bg-white/[0.03] px-4 py-3">
              <div className="text-[12px] uppercase tracking-[0.14em] text-white/32">
                Message preview
              </div>
              <p className="mt-2 line-clamp-3 text-[13px] text-white/78">
                {pendingDeleteBroadcast.message?.trim() || "No message text"}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteBroadcast(null)}
                disabled={isDeletingBroadcast}
                className="rounded-[10px] border border-white/10 px-4 py-2 text-[13px] font-medium text-white/72 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBroadcast}
                disabled={isDeletingBroadcast}
                className="flex min-w-[118px] items-center justify-center gap-2 rounded-[10px] bg-red-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingBroadcast ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAttachmentPreview && selectedAttachment instanceof File && (
        <FilePreviewModal
          file={selectedAttachment}
          adminId={adminUser?.userid || adminUser?.userId || adminUser?.id || "admin"}
          uploadContext={recipients}
          uploadFile={(file, adminId, recipientType, onProgress, onError, onComplete) =>
            uploadBroadcastFile(file, adminId, recipientType, onProgress, onError, onComplete)
          }
          title="Attach to broadcast"
          onClose={() => setShowAttachmentPreview(false)}
          onSent={handleAttachmentUploaded}
        />
      )}
    </div>
  );
}

function formatDateCompact(timestamp) {
  try {
    const date = new Date(timestamp);
    const time = date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
    const monthDay = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });

    return `${time} | ${monthDay}`;
  } catch {
    return timestamp;
  }
}


