import { format as formatDate } from "date-fns";

const sanitizeSegment = (value) => {
  if (value == null) return "Unknown";
  const normalized = String(value).trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized.replace(/[\\/]+/g, "-") : "Unknown";
};

const parseDocumentDate = (doc) => {
  const raw =
    doc?.date ??
    doc?.created_at ??
    doc?.createdAt ??
    doc?.uploaded_at ??
    doc?.uploadedAt ??
    doc?.timestamp ??
    doc?.created_on;
  if (!raw) return null;
  if (raw && typeof raw.toDate === "function") {
    const d = raw.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  if (raw && typeof raw.seconds === "number") {
    const d = new Date(raw.seconds * 1000);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = typeof raw === "string" || typeof raw === "number" ? new Date(raw) : raw;
  return isNaN(d?.getTime?.()) ? null : d;
};

export const getDocumentTypeLabel = (type, filterMap) => {
  if (!type) return "Unknown";
  if (filterMap && typeof filterMap === "object") {
    const label = Object.keys(filterMap).find((key) => filterMap[key] === type);
    if (label) return label;
  }
  return type;
};

export const buildDocumentDownloadName = ({ doc, driverName, typeLabel }) => {
  const parsedDate = parseDocumentDate(doc);
  const dateTime = parsedDate ? formatDate(parsedDate, "yyyy-MM-dd hh_mm a") : "Unknown Date";
  const category = sanitizeSegment(doc?.category);
  return `${sanitizeSegment(driverName)}_${sanitizeSegment(dateTime)}_${sanitizeSegment(typeLabel)}_${category}`;
};
