import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";

let isWorkerConfigured = false;

function ensureWorkerConfigured() {
  if (isWorkerConfigured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  isWorkerConfigured = true;
}

ensureWorkerConfigured();

function PdfThumbnail({ attachmentUrl, displayName, className = "" }) {
  const [pdfData, setPdfData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const hasLoggedFailureRef = useRef(false);

  useEffect(() => {
    setPdfData(null);
    setPreviewFailed(false);
    setIsLoading(false);
    hasLoggedFailureRef.current = false;

    if (!attachmentUrl) return undefined;

    // Keep PDF preview passive (fetch-only), so opening chat never triggers downloads.
    const controller = new AbortController();
    let isActive = true;

    setIsLoading(true);
    fetch(attachmentUrl, { signal: controller.signal, credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (!isActive) return;
        setPdfData(new Uint8Array(buffer));
        setIsLoading(false);
      })
      .catch((error) => {
        if (!isActive || error?.name === "AbortError") return;
        if (!hasLoggedFailureRef.current) {
          console.warn("PDF preview unavailable:", error);
          hasLoggedFailureRef.current = true;
        }
        setPreviewFailed(true);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [attachmentUrl]);

  // Memoized file object avoids unnecessary react-pdf reinitialization between renders.
  const pdfFile = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData]);

  const handleRenderError = (error) => {
    if (!hasLoggedFailureRef.current) {
      console.warn("PDF preview unavailable:", error);
      hasLoggedFailureRef.current = true;
    }
    setPreviewFailed(true);
  };

  if (!previewFailed && isLoading) {
    return (
      <div className={`relative h-44 w-full rounded-t-lg bg-gradient-to-b from-[#0b1220] to-[#151f33] ${className}`}>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#0b1220] to-[#151f33]" />
        <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          PDF
        </span>
      </div>
    );
  }

  if (previewFailed || !pdfFile) {
    // Fallback card is intentional when browser/device cannot render the PDF preview.
    return (
      <div
        className={`relative h-44 w-full rounded-t-lg bg-gradient-to-b from-[#0b1220] to-[#151f33] ${className}`}
        aria-label={`PDF preview unavailable for ${displayName || "document"}`}
      >
        <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
          PDF
        </span>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <FileText className="h-10 w-10 text-red-300/80" />
          <p className="text-xs text-gray-300">Preview unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-44 w-full overflow-hidden rounded-t-lg bg-[#0b1220] ${className}`}>
      <Document
        file={pdfFile}
        loading={null}
        error={null}
        onLoadError={handleRenderError}
        onSourceError={handleRenderError}
      >
        {/* Render only page 1 for chat bubble performance. */}
        <Page
          pageNumber={1}
          width={278}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          loading={null}
          onRenderError={handleRenderError}
        />
      </Document>
      <span className="absolute left-2 top-2 rounded bg-red-500/85 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
        PDF
      </span>
    </div>
  );
}

export default memo(PdfThumbnail);
