import { memo, useCallback, useEffect, useState } from "react";
import { FileText, Image, Paperclip, Video, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function ChatComposer({
  disabled = false,
  inputRef,
  fileInputRef,
  onFileSelect,
  showAttachmentOptions,
  setShowAttachmentOptions,
  openFilePicker,
  onSend,
  selectedFile,
  replyTo,
  onCancelReply,
  onPreviewSelectedFile,
  onRemoveSelectedFile,
  resetKey,
}) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
  }, [resetKey]);

  const handleSend = useCallback(async () => {
    if (disabled) return;
    const nextText = draft;
    const shouldClearDraft = Boolean(nextText.trim());
    if (!shouldClearDraft && !(selectedFile instanceof File)) return;

    if (shouldClearDraft) {
      setDraft("");
    }

    await onSend?.(nextText);
    inputRef?.current?.focus();
  }, [disabled, draft, inputRef, onSend, selectedFile]);

  return (
    <>
      {replyTo && (
        <div className="px-4 py-2 border-t border-[#2c3e52] bg-[#1c2530] flex items-center justify-between">
          <div className="border-l-4 border-[#1f6feb] pl-3">
            <p className="text-xs font-semibold text-[#1f6feb]">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-xs text-[#8696a0] truncate max-w-[260px]">
              {typeof replyTo.message === "string"
                ? replyTo.message
                : replyTo.message != null
                  ? String(replyTo.message)
                  : ""}
            </p>
          </div>
          <button
            className="text-[#8696a0] hover:text-[#e9edef] p-1"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}
      <div className="p-3 border-t border-[#2c3e52] bg-[#1c2530] sticky bottom-0 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={onFileSelect}
          className="hidden"
          aria-label="Attach file"
        />
        <div className="relative flex-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full text-[#8696a0] hover:bg-[#3a4d63] hover:text-[#e9edef]"
            onClick={() => setShowAttachmentOptions((prev) => !prev)}
            aria-label="Attach file"
            aria-expanded={showAttachmentOptions}
            aria-haspopup="true"
          >
            <Paperclip className="h-5 w-5" strokeWidth={1.8} />
          </Button>
          {showAttachmentOptions && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowAttachmentOptions(false)}
                aria-hidden="true"
              />
              <div
                className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-[#2c3e52] bg-[#1c2530] py-2 shadow-xl"
                role="menu"
                aria-label="Choose attachment type"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                  onClick={() => openFilePicker("image/*")}
                  role="menuitem"
                >
                  <Image className="h-5 w-5 text-[#8ab4f8]" aria-hidden="true" />
                  <span className="text-sm">Photo</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                  onClick={() => openFilePicker("video/*")}
                  role="menuitem"
                >
                  <Video className="h-5 w-5 text-[#b5a3ff]" aria-hidden="true" />
                  <span className="text-sm">Video</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-[#e9edef] hover:bg-[#2c3e52]"
                  onClick={() => openFilePicker("application/pdf")}
                  role="menuitem"
                >
                  <FileText className="h-5 w-5 text-[#fca5a5]" aria-hidden="true" />
                  <span className="text-sm">PDF</span>
                </button>
              </div>
            </>
          )}

          <Input
            className="w-full rounded-full border-0 bg-[#2c3e52] py-5 pl-14 pr-4 text-[#e9edef] placeholder:text-[#8696a0] focus-visible:ring-[#1f6feb]"
            placeholder="Type a message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            ref={inputRef}
          />
        </div>

        <Button
          onClick={handleSend}
          size="icon"
          className="rounded-full bg-[#1f6feb] hover:bg-[#1a5fd4] text-white h-11 w-11 flex-shrink-0"
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </Button>
      </div>
      {selectedFile instanceof File && (
        <div className="px-3 pb-3 border-t-0 bg-[#1c2530] sticky bottom-0">
          <div className="mx-[52px] mt-2 flex items-center justify-between gap-3 rounded-lg border border-[#2c3e52] bg-[#243544] px-3 py-2 text-sm text-gray-200">
            <button
              type="button"
              onClick={onPreviewSelectedFile}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/5 text-gray-400">
                <Paperclip className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-100">
                  {selectedFile.name || "Attachment ready"}
                </p>
                <p className="text-[11px] text-gray-400">
                  Ready to preview and send
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:bg-[#2c3e52] hover:text-white"
                onClick={onPreviewSelectedFile}
              >
                Preview
              </Button>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:text-white"
                onClick={onRemoveSelectedFile}
                aria-label="Remove attachment"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default memo(ChatComposer);
