const IMAGE_MIME_PREFIX = "image/";
const VIDEO_MIME_PREFIX = "video/";
const PDF_MIME = "application/pdf";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "ogv", "ogg"];

function normalizeMimeType(mimeType) {
  return typeof mimeType === "string" ? mimeType.trim().toLowerCase() : "";
}

function getExtension(value) {
  if (!value) return "";

  if (typeof value === "string") {
    const cleaned = value.split("?")[0].split("#")[0];
    const fromPath = cleaned.split("/").pop() || cleaned;
    const maybeExt = fromPath.includes(".") ? fromPath.split(".").pop() : "";
    return maybeExt ? maybeExt.toLowerCase() : "";
  }

  if (typeof value?.name === "string") {
    return getExtension(value.name);
  }

  return "";
}

function matchesExtension(value, allowedExtensions) {
  const ext = getExtension(value);
  return Boolean(ext) && allowedExtensions.includes(ext);
}

// MIME type is primary for detection; extension checks are an intentional fallback.
export function isImageAttachment({ mimeType, name, url } = {}) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (normalizedMimeType.startsWith(IMAGE_MIME_PREFIX)) return true;
  return matchesExtension(name || url, IMAGE_EXTENSIONS);
}

// Shared helper keeps send dialog and chat bubble attachment rendering in sync.
export function isVideoAttachment({ mimeType, name, url } = {}) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (normalizedMimeType.startsWith(VIDEO_MIME_PREFIX)) return true;
  return matchesExtension(name || url, VIDEO_EXTENSIONS);
}

export function isPdfAttachment({ mimeType, name, url } = {}) {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (normalizedMimeType === PDF_MIME) return true;
  return matchesExtension(name || url, ["pdf"]);
}

export function isGenericFileAttachment({ mimeType, name, url } = {}) {
  const hasSource = Boolean(mimeType || name || url);
  if (!hasSource) return false;

  return !isImageAttachment({ mimeType, name, url }) &&
    !isVideoAttachment({ mimeType, name, url }) &&
    !isPdfAttachment({ mimeType, name, url });
}

export function formatFileSize(sizeInBytes) {
  const size = Number(sizeInBytes);
  if (!Number.isFinite(size) || size < 0) return "Unknown size";

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractAttachmentDisplayName({ explicitName, file, url, fallback = "Document.pdf" } = {}) {
  const candidateFromMetadata = typeof explicitName === "string" ? explicitName.trim() : "";
  if (candidateFromMetadata) return candidateFromMetadata;

  const candidateFromFile = typeof file?.name === "string" ? file.name.trim() : "";
  if (candidateFromFile) return candidateFromFile;

  if (typeof url === "string" && url.trim()) {
    try {
      const pathname = new URL(url, window.location.origin).pathname;
      const pathChunk = pathname.split("/").filter(Boolean).pop() || "";
      const decoded = decodeURIComponent(pathChunk).trim();
      if (decoded) return decoded;
    } catch {
      const cleaned = url.split("?")[0].split("#")[0].trim();
      const pathChunk = cleaned.split("/").filter(Boolean).pop() || "";
      if (pathChunk) {
        try {
          const decoded = decodeURIComponent(pathChunk).trim();
          if (decoded) return decoded;
        } catch {
          return pathChunk;
        }
      }
    }
  }

  return fallback;
}
