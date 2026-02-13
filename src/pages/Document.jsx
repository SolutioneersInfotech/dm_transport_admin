import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format as formatDate } from "date-fns";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchDocumentCount, fetchDocuments, fetchMoreDocuments, resetPagination, updateDocument, deleteDocumentThunk, deleteDocumentsThunk } from "../store/slices/documentsSlice";
import DocumentPreviewContent from "../components/DocumentPreviewContent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import DateRangePicker from "../components/date-range-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { X, Search, Flag, ChevronDown, Check, Copy, Download, Trash2, Redo2, RefreshCw, Loader2 } from "lucide-react";
import DocumentTableSkeleton from "../components/skeletons/DocumentTableSkeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "../components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { toast } from "sonner";
import { buildDocumentDownloadName, getDocumentTypeLabel } from "../utils/documentDownloadName";

const formatLocalDate = (date) => formatDate(date, "yyyy-MM-dd");

// Last 60 Days
function getDefaultDates() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const past = new Date(start);
  past.setDate(past.getDate() - 60);

  return { from: past, to: start };
}

const FILTER_MAP = {
  "Pickup Doc": "pick_up",
  "Delivery Proof": "delivery",
  "Load Image": "load_image",
  "Fuel Receipt": "fuel_recipt",
  "Stamp Paper": "paper_logs",
  "Driver Expense": "driver_expense_sheet",
  "DM Transport Trip Envelope": "dm_transport_trip_envelope",
  "DM Trans Inc Trip Envelope": "dm_trans_inc_trip_envelope",
  "DM Transport City Worksheet": "dm_transport_city_worksheet_trip_envelope",
  "Repair and Maintenance": "trip_envelope",
  "CTPAT": "CTPAT",
};

export default function Documents() {
  const defaultDates = useMemo(() => getDefaultDates(), []);
  const dispatch = useAppDispatch();
  const {
    documents: allDocuments,
    loading,
    loadingMore,
    hasMore,
    page,
    limit,
    total,
    totalDocuments,
    lastFetchParams,
    lastFetched,
    countsTotal,
  } = useAppSelector((state) => state.documents);
  const { users } = useAppSelector((state) => state.users);
  const documentDropDownRef = useRef(null);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(480);
  const [isMarkingAsSeen, setIsMarkingAsSeen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const observerTarget = useRef(null);
  const isResizingRef = useRef(false);
  const layoutRef = useRef(null);
  const tableScrollRef = useRef(null);
  const [skeletonRows, setSkeletonRows] = useState(12);
  const skeletonRowHeight = 36;
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const previousCountRef = useRef(null);
  const [isFlagUpdating, setIsFlagUpdating] = useState(false);

  const [searchParams] = useSearchParams();

  const [dateRange, setDateRange] = useState(() => ({
    from: defaultDates.from,
    to: defaultDates.to,
  }));

  const [selectedFilters, setSelectedFilters] = useState([]); // Array of filter values

  const handleToggleFlag = useCallback(async (doc) => {
    if (!doc || isFlagUpdating) return;

    const isFlagged = doc.flag?.flagged || doc.flagged || doc.isFlagged;
    const reason = doc.flag?.reason ?? doc.flagged_reason ?? "";
    const nextFlag = {
      flagged: !isFlagged,
      reason: !isFlagged ? reason : "",
    };

    try {
      setIsFlagUpdating(true);
      const result = await dispatch(updateDocument({ document: doc, flag: nextFlag }));
      if (!updateDocument.fulfilled.match(result)) {
        toast.error(result.payload || "Failed to update flag status");
      }
    } catch (error) {
      console.error("Failed to update flag status:", error);
      toast.error("Failed to update flag status");
    } finally {
      setIsFlagUpdating(false);
    }
  }, [dispatch, isFlagUpdating]);

  // Sync selectedDoc with Redux state when document is updated
  useEffect(() => {
    if (selectedDoc?.id) {
      const updatedDoc = allDocuments.find((doc) => doc.id === selectedDoc.id);
      if (updatedDoc && (
        updatedDoc.seen !== selectedDoc.seen || 
        JSON.stringify(updatedDoc.flag) !== JSON.stringify(selectedDoc.flag) ||
        updatedDoc.state !== selectedDoc.state ||
        updatedDoc.completed !== selectedDoc.completed ||
        updatedDoc.type !== selectedDoc.type ||
        updatedDoc.document_url !== selectedDoc.document_url ||
        updatedDoc.acknowledgement !== selectedDoc.acknowledgement
      )) {
        setSelectedDoc(updatedDoc);
      }
    }
  }, [allDocuments, selectedDoc]);

  useEffect(() => {
    if (!selectedDoc) {
      setIsPreviewOpen(false);
    }
  }, [selectedDoc]);

  useEffect(() => {
    if (!tableScrollRef.current) return;

    const container = tableScrollRef.current;
    const updateRows = () => {
      const header = container.querySelector("[data-slot='table-header']");
      const headerHeight = header?.offsetHeight ?? 0;
      const containerHeight = container.clientHeight ?? 0;
      const availableHeight = Math.max(containerHeight - headerHeight, skeletonRowHeight);
      const nextRows = Math.max(1, Math.ceil(availableHeight / skeletonRowHeight));
      setSkeletonRows(nextRows);
    };

    updateRows();
    const resizeObserver = new ResizeObserver(updateRows);
    resizeObserver.observe(container);
    const headerEl = container.querySelector("[data-slot='table-header']");
    if (headerEl) {
      resizeObserver.observe(headerEl);
    }

    return () => resizeObserver.disconnect();
  }, [skeletonRowHeight]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizingRef.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const minWidth = 320;
      const minTableWidth = 420;
      const maxWidth = Math.max(minWidth, rect.width - minTableWidth);
      const nextWidth = Math.min(
        maxWidth,
        Math.max(minWidth, rect.right - event.clientX)
      );
      setPreviewWidth(nextWidth);
    };

    const stopResize = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const handleResizeStart = useCallback((event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [isSearchInProgress, setIsSearchInProgress] = useState(false);
  const hasInitializedSearch = useRef(false);

  const [statusFilter, setStatusFilter] = useState("all"); // all | seen | unseen
  const [categoryFilter, setCategoryFilter] = useState([]); // C D F
  const [flagFilter, setFlagFilter] = useState(null); // null | true | false (null = all)
  const [showDocumentTypeDropdown, setShowDocumentTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilterTypeDropdown, setShowFilterTypeDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [driverPopupDoc, setDriverPopupDoc] = useState(null);
  const filterTypeDropdownRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!hasInitializedSearch.current) {
      hasInitializedSearch.current = true;
      return;
    }

    setIsSearchInProgress(true);
  }, [searchDebounced]);

  useEffect(() => {
    if (isSearchInProgress && !loading) {
      setIsSearchInProgress(false);
    }
  }, [loading, isSearchInProgress]);

  const isSearchLoading = search !== searchDebounced || isSearchInProgress;

  const handleCopy = async (value, label) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`Copied ${label}`);
    } catch (copyError) {
      console.error("Failed to copy value", copyError);
      toast.error("Failed to copy to clipboard");
    }
  };

  const renderCopyButton = (value, label) => (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        handleCopy(value, label);
      }}
      className="text-gray-500 hover:text-gray-200 transition-colors"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );

  const findDriverByEmailOrName = useCallback(
    (email, name) => {
      if (!users?.length) return null;

      if (email) {
        const userByEmail = users.find(
          (u) =>
            u.email?.toLowerCase() === email.toLowerCase() ||
            u.driver_email?.toLowerCase() === email.toLowerCase()
        );
        if (userByEmail) {
          return userByEmail;
        }
      }

      if (name) {
        const userByName = users.find(
          (u) =>
            u.name?.toLowerCase() === name.toLowerCase() ||
            u.driver_name?.toLowerCase() === name.toLowerCase()
        );
        if (userByName) {
          return userByName;
        }
      }

      return null;
    },
    [users]
  );


  // Convert status filter to isSeen parameter
  const isSeenParam = useMemo(() => {
    if (statusFilter === "seen") return true;
    if (statusFilter === "unseen") return false;
    return null;
  }, [statusFilter]);

  // Category: pass array so API gets category=C&category=D (multiple params)
  const categoryParam = useMemo(() => {
    if (!Array.isArray(categoryFilter) || categoryFilter.length === 0) return null;
    return categoryFilter;
  }, [categoryFilter]);

  // Convert flag filter to API format
  const isFlaggedParam = useMemo(() => {
    return flagFilter !== null ? flagFilter : null;
  }, [flagFilter]);

  // Convert document type filters to API format
  // These are sent as multiple "type" parameters
  const typeFilters = useMemo(() => {
    return selectedFilters.length > 0 ? selectedFilters : [];
  }, [selectedFilters]);

  const startDate = useMemo(() => {
    return dateRange?.from ? formatLocalDate(dateRange.from) : undefined;
  }, [dateRange]);

  const endDate = useMemo(() => {
    return dateRange?.to ? formatLocalDate(dateRange.to) : undefined;
  }, [dateRange]);

  const currentFetchArgs = useMemo(
    () => ({
      startDate,
      endDate,
      page: 1,
      limit: 20,
      search: searchDebounced,
      isSeen: isSeenParam,
      isFlagged: isFlaggedParam,
      category: categoryParam,
      filters: typeFilters,
    }),
    [
      startDate,
      endDate,
      searchDebounced,
      isSeenParam,
      isFlaggedParam,
      categoryParam,
      typeFilters,
    ]
  );

  // Fetch documents when params change (initial load)
  useEffect(() => {
    const paramsChanged =
      !lastFetchParams ||
      lastFetchParams.startDate !== startDate ||
      lastFetchParams.endDate !== endDate ||
      lastFetchParams.search !== searchDebounced ||
      lastFetchParams.isSeen !== isSeenParam ||
      lastFetchParams.isFlagged !== isFlaggedParam ||
      JSON.stringify(categoryParam ?? null) !== JSON.stringify(lastFetchParams.category ?? null) ||
      JSON.stringify(lastFetchParams.filters || []) !== JSON.stringify(typeFilters);

    const isStale = lastFetched && Date.now() - lastFetched > 30 * 1000;

    if ((paramsChanged || isStale) && !loading) {
      dispatch(resetPagination());
      dispatch(fetchDocuments(currentFetchArgs));
    }
  }, [
    dispatch,
    startDate,
    endDate,
    searchDebounced,
    isSeenParam,
    isFlaggedParam,
    categoryParam,
    typeFilters,
    lastFetchParams,
    lastFetched,
    loading,
    currentFetchArgs,
  ]);

  const handleManualRefresh = useCallback(async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    try {
      await dispatch(fetchDocuments(currentFetchArgs)).unwrap();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [dispatch, currentFetchArgs, isManualRefreshing]);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");

    // Handle single type from URL params (for backward compatibility)
    if (typeParam) {
      setSelectedFilters([typeParam]);
    }

    if (["all", "seen", "unseen"].includes(statusParam)) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  // Toggle filter selection
  const toggleFilter = (filterValue) => {
    setSelectedFilters((prev) => {
      if (prev.includes(filterValue)) {
        return prev.filter((f) => f !== filterValue);
      } else {
        return [...prev, filterValue];
      }
    });
  };

  // Remove a specific filter
  const removeFilter = (filterValue) => {
    setSelectedFilters((prev) => prev.filter((f) => f !== filterValue));
  };

  // Use documents directly from API (filtering is done server-side)
  const filteredDocuments = allDocuments;

  function resetDates() {
    const { start, end } = defaultDates;
    setDateRange({
      from: new Date(start),
      to: new Date(end),
    });
  }

  // Group documents by date
  const groupedDocuments = useMemo(() => {
    const groups = {};
    filteredDocuments?.forEach((doc) => {
      const d = new Date(doc.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      let label = "";
      if (d.toDateString() === today.toDateString()) {
        label = "Today";
      } else if (d.toDateString() === yesterday.toDateString()) {
        label = "Yesterday";
      } else {
        label = d.toLocaleDateString();
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(doc);
    });
    return groups;
  }, [filteredDocuments]);

  // Select all functionality
  const allDocIds = useMemo(() => {
    return new Set(filteredDocuments?.map((doc) => doc.id) || []);
  }, [filteredDocuments]);

  const isAllSelected = allDocIds.size > 0 && selectedDocIds.size === allDocIds.size;
  const isIndeterminate = selectedDocIds.size > 0 && selectedDocIds.size < allDocIds.size;
  const selectionMode = selectedDocIds.size > 0;

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedDocIds(new Set(allDocIds));
    } else {
      setSelectedDocIds(new Set());
    }
  };

  const handleSelectDoc = (docId, checked) => {
    const newSelected = new Set(selectedDocIds);
    if (checked) {
      newSelected.add(docId);
    } else {
      newSelected.delete(docId);
    }
    setSelectedDocIds(newSelected);
  };

  const getSelectedDocs = useCallback(() => {
    return filteredDocuments?.filter((doc) => selectedDocIds.has(doc.id)) || [];
  }, [filteredDocuments, selectedDocIds]);

  const handleBulkDownload = async () => {
    const docsToDownload = getSelectedDocs();
    if (docsToDownload.length === 0) return;
    setIsBulkDownloading(true);
    try {
      for (const doc of docsToDownload) {
        const docUrl = doc.document_url || doc.url || doc.file_url;
        if (!docUrl) {
          toast.error(`Missing file URL for ${doc.driver_name || "document"}`);
          continue;
        }
        try {
          const res = await fetch(docUrl, { credentials: "omit" });
          const blob = await res.blob();
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const ext = (docUrl.split("?")[0]?.split(".").pop() || "file").toLowerCase();
          const typeLabel = getDocumentTypeLabel(doc.type, FILTER_MAP);
          const driverName = doc.driver_name || doc.driverName || doc.driver?.name || "Unknown Driver";
          const fileName = buildDocumentDownloadName({ doc, driverName, typeLabel });
          a.download = `${fileName}.${ext}`;
          a.click();
          URL.revokeObjectURL(a.href);
        } catch (error) {
          console.error("Failed to download document", error);
          toast.error("Download failed");
        }
      }
    } finally {
      setIsBulkDownloading(false);
    }
  };

  const handleBulkDelete = async () => {
    const docsToDelete = getSelectedDocs();
    if (docsToDelete.length === 0) return;
    setIsBulkDeleting(true);
    setShowBulkDeleteModal(false);
    let didDelete = false;
    try {
      const result = await dispatch(deleteDocumentsThunk({ documents: docsToDelete }));
      if (deleteDocumentsThunk.fulfilled.match(result)) {
        didDelete = true;
      } else {
        toast.error(result.payload || "Failed to delete documents");
      }
    } catch (error) {
      console.error("Failed to delete documents", error);
      toast.error("Failed to delete selected documents");
    } finally {
      setIsBulkDeleting(false);
    }

    if (didDelete) {
      setSelectedDocIds(new Set());
      if (selectedDoc && docsToDelete.some((doc) => doc.id === selectedDoc.id)) {
        setSelectedDoc(null);
        setIsPreviewOpen(false);
      }
      toast.success("Selected documents deleted");
    }
  };

  const showSkeleton = loading && !isManualRefreshing && filteredDocuments?.length === 0;
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        documentDropDownRef.current &&
        !documentDropDownRef.current.contains(event.target)
      ) {
        setShowDocumentTypeDropdown(false);
        setShowStatusDropdown(false);
      }
      if (
        filterTypeDropdownRef.current &&
        !filterTypeDropdownRef.current.contains(event.target)
      ) {
        setShowFilterTypeDropdown(false);
      }
    }
  
    document.addEventListener("mousedown", handleClickOutside);
  
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle mobile/desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Close drawer if switching to desktop
      if (window.innerWidth >= 1024 && selectedDoc) {
        // Keep selectedDoc but drawer will be hidden by CSS
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedDoc]);
  

  // Infinite scroll handler
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      dispatch(
        fetchMoreDocuments({
          startDate,
          endDate,
          page: page + 1,
          limit: 20,
          search: searchDebounced,
          isSeen: isSeenParam,
          isFlagged: isFlaggedParam,
          category: categoryParam,
          filters: typeFilters,
        })
      );
    }
  }, [
    dispatch,
    hasMore,
    loadingMore,
    loading,
    startDate,
    endDate,
    page,
    searchDebounced,
    isSeenParam,
    isFlaggedParam,
    categoryParam,
    typeFilters,
  ]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [handleLoadMore]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    const pollIntervalMs = 30 * 1000;

    const pollCounts = () => {
      if (document.visibilityState !== "visible") return;
      if (loading || loadingMore) return;
      dispatch(
        fetchDocumentCount({
          start_date: startDate,
          end_date: endDate,
          isSeen: isSeenParam,
          isFlagged: isFlaggedParam,
        })
      );
    };

    pollCounts();
    const intervalId = setInterval(pollCounts, pollIntervalMs);

    return () => clearInterval(intervalId);
  }, [dispatch, startDate, endDate, isSeenParam, isFlaggedParam, loading, loadingMore]);

  useEffect(() => {
    if (typeof countsTotal !== "number") return;
    if (previousCountRef.current !== null && countsTotal > previousCountRef.current && !loading) {
      dispatch(resetPagination());
      dispatch(fetchDocuments(currentFetchArgs));
    }
    previousCountRef.current = countsTotal;
  }, [countsTotal, dispatch, currentFetchArgs, loading]);


  return (
    <div className="text-white h-full overflow-hidden flex flex-col p-1 sm:p-2">

      {/* CHIP FILTER INPUT - Document Type Filters */}
      <div className="mb-2">
        {/* Mobile: Dropdown for Document Type Filters */}
        <div className="sm:hidden">
          <div className="relative" ref={filterTypeDropdownRef}>
            <button
              onClick={() => setShowFilterTypeDropdown(!showFilterTypeDropdown)}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-300 bg-[#161b22] border border-gray-700 rounded-md hover:bg-[#1d232a] hover:border-gray-600 transition-colors"
            >
              <span>
                {selectedFilters.length === 0
                  ? "Document Types"
                  : selectedFilters.length === 1
                  ? Object.keys(FILTER_MAP).find((key) => FILTER_MAP[key] === selectedFilters[0]) || "1 selected"
                  : `${selectedFilters.length} selected`}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilterTypeDropdown ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showFilterTypeDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterTypeDropdown(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#161b22] border border-gray-700 rounded-md shadow-lg z-20 max-h-[60vh] overflow-y-auto">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 mb-1">
                      Document Types
                    </div>
                    {Object.keys(FILTER_MAP).map((item) => {
                      const filterValue = FILTER_MAP[item];
                      const isSelected = selectedFilters.includes(filterValue);
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            toggleFilter(filterValue);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-[#1d232a] transition-colors flex items-center gap-2 rounded ${
                            isSelected ? "text-[#1f6feb] bg-[#1d232a]" : "text-gray-300"
                          }`}
                        >
                          <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                            isSelected ? "border-[#1f6feb] bg-[#1f6feb]" : "border-gray-600"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-white" />}
                          </span>
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Show selected filters as chips on mobile */}
          {selectedFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedFilters.map((filterValue) => {
                const filterLabel = Object.keys(FILTER_MAP).find(
                  (key) => FILTER_MAP[key] === filterValue
                );
                return (
                  <div
                    key={filterValue}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1f6feb] text-white text-xs"
                  >
                    <span>{filterLabel}</span>
                    <button
                      onClick={() => removeFilter(filterValue)}
                      className="hover:bg-[#1a5fd4] rounded-full p-0.5 transition-colors"
                      aria-label={`Remove ${filterLabel} filter`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: Filter Options as Chips */}
        <div className="hidden sm:flex flex-wrap gap-1.5 sm:gap-2">
          {Object.keys(FILTER_MAP).map((item) => {
            const filterValue = FILTER_MAP[item];
            const isSelected = selectedFilters.includes(filterValue);
            return (
              <Button
                key={item}
                onClick={() => toggleFilter(filterValue)}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs md:text-sm whitespace-nowrap ${
                  isSelected
                    ? "bg-[#1f6feb] border-[#1f6feb] text-white"
                    : "border-gray-600 bg-[#161b22] text-gray-300 hover:bg-[#1d232a]"
                }`}
              >
                {item}
              </Button>
            );
          })}
        </div>
      </div>

      {/* FILTER BAR - Horizontal Layout matching image */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
        {/* Search Bar */}
        <div className="relative w-full sm:flex-1 sm:min-w-0">
          {isSearchLoading ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          )}
          <Input
            type="text"
            placeholder="Search by driver name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1d232a] pl-9 border-gray-700 text-gray-300 placeholder:text-gray-500 text-sm sm:text-base"
          />
        </div>

        {/* Category Filters (C, D, E, F) - multi-select, sent as category=C&category=D */}
        <div className="flex gap-1.5 sm:gap-2">
          {["C", "D", "F"].map((cat) => {
            const isSelected = Array.isArray(categoryFilter) && categoryFilter.includes(cat);
            return (
              <Button
                key={cat}
                onClick={() => {
                  setCategoryFilter(
                    isSelected ? categoryFilter.filter((c) => c !== cat) : [...categoryFilter, cat]
                  );
                }}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className={`min-w-[36px] sm:min-w-[40px] h-8 sm:h-9 text-xs sm:text-sm ${
                  isSelected
                    ? "bg-[#1f6feb] text-white border-[#1f6feb] hover:bg-[#1a5fd4]"
                    : "bg-[#161b22] border-gray-700 text-gray-300 hover:bg-[#1d232a] hover:border-gray-600"
                }`}
              >
                {cat}
              </Button>
            );
          })}
        </div>

        {/* All Documents Dropdown with Status Filter */}
        <div className="relative" ref={documentDropDownRef} >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                setShowDocumentTypeDropdown(!showDocumentTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-300 hover:text-white transition-colors border-b border-gray-700 hover:border-gray-600 whitespace-nowrap"
            >
              {statusFilter === "all" ? "All" : statusFilter === "seen" ? "Seen" : "Unseen Only"}

              <ChevronDown className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${showDocumentTypeDropdown ? "rotate-180" : ""}`} />
            </button>
            {(selectedFilters.length > 0 || statusFilter !== "all" || (Array.isArray(categoryFilter) && categoryFilter.length > 0)) && (
          <button
                onClick={() => {
                  setSelectedFilters([]);
                  setStatusFilter("all");
                  setCategoryFilter([]);
                  setShowDocumentTypeDropdown(false);
                  setShowStatusDropdown(false);
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#1d232a]"
                aria-label="Clear filters"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        )}
      </div>

          {/* Dropdown Menu */}
          {showDocumentTypeDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDocumentTypeDropdown(false)}
              />
              <div className="absolute top-full left-0 mt-1 bg-[#161b22] border border-gray-700 rounded-md shadow-lg z-20 min-w-[200px]">
                {/* Status Filter Section */}
                <div className="border-b border-gray-700">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </div>
                  {["all", "seen", "unseen"].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setShowStatusDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-[#1d232a] transition-colors flex items-center gap-2 ${
                        statusFilter === status ? "text-[#1f6feb] bg-[#1d232a]" : "text-gray-300"
                      }`}
                    >
                      <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                        statusFilter === status ? "border-[#1f6feb] bg-[#1f6feb]" : "border-gray-600"
                      }`}>
                        {statusFilter === status && <Check className="h-3 w-3 text-white" />}
                      </span>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Document Type Filter Section */}
                {/* <div className="max-h-[200px] overflow-y-auto">
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Document Types
                  </div>
                  {Object.keys(FILTER_MAP).map((item) => {
                    const filterValue = FILTER_MAP[item];
                    const isSelected = selectedFilters.includes(filterValue);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleFilter(filterValue)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-[#1d232a] transition-colors flex items-center gap-2 ${
                          isSelected ? "text-[#1f6feb] bg-[#1d232a]" : "text-gray-300"
                        }`}
                      >
                        <span className={`w-4 h-4 border rounded flex items-center justify-center ${
                          isSelected ? "border-[#1f6feb] bg-[#1f6feb]" : "border-gray-600"
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </span>
                        {item}
                      </button>
                    );
                  })}
                </div> */}
              </div>
            </>
          )}
        </div>

        {/* Flag Filter */}
        <Button
          onClick={() => {
            setFlagFilter(flagFilter === null ? true : null);
          }}
          variant="outline"
          size="sm"
          className={`h-8 sm:h-9 px-2 sm:px-3 ${
            flagFilter === true
              ? "bg-[#1f6feb] text-white border-[#1f6feb] hover:bg-[#1a5fd4]"
              : "bg-[#161b22] border-gray-700 text-gray-400 hover:bg-[#1d232a] hover:border-gray-600 hover:text-gray-300"
          }`}
          title={flagFilter === true ? "Show flagged only" : "Show all documents"}
        >
          <Flag className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${flagFilter === true ? "text-white" : "text-gray-400"}`} />
        </Button>

        {/* Date Range Picker */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:justify-end sm:ml-auto">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            triggerWidthClassName="w-[260px] sm:w-[320px]"
            labelClassName="text-center"
          />
          {dateRange?.from &&
            dateRange?.to &&
            (formatLocalDate(dateRange.from) !== defaultDates.start ||
              formatLocalDate(dateRange.to) !== defaultDates.end) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetDates}
              className="h-8 sm:h-9 px-2 text-gray-400 hover:text-gray-300 hover:bg-[#1d232a]"
              title="Reset dates"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>

        {selectionMode && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={isBulkDownloading}
              className="h-8 sm:h-9 border-gray-600/80 bg-[#0f172a]/70 text-slate-200 shadow-sm hover:bg-[#1f2937] hover:text-white hover:border-slate-400 hover:shadow-md active:shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              {isBulkDownloading ? "Downloading..." : "Download"}&nbsp;
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedDocIds.size === 0) return;
                setShowBulkDeleteModal(true);
              }}
              disabled={isBulkDeleting}
              className="h-8 mr-0.5 sm:h-9 border-red-500/60 bg-[#0f172a]/70 text-red-400 shadow-sm hover:bg-red-500/20 hover:text-red-100 hover:border-red-400 hover:shadow-md active:shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isBulkDeleting ? "Deleting..." : "Delete"}&nbsp;
            </Button>
          </div>
        )}
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 bg-[#161b22] rounded-lg border border-gray-700 overflow-hidden flex flex-col">
        {/* FLEX CONTAINER: TABLE + PREVIEW */}
          <div
            ref={layoutRef}
            className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden"
          >
            {/* 📜 TABLE SECTION */}
            <div
              className={`flex-1 min-w-0 overflow-hidden flex flex-col ${
                isPreviewOpen ? "lg:border-r border-gray-700" : ""
              }`}
            >
            <div ref={tableScrollRef} className="flex-1 overflow-y-auto chat-list-scroll">
              <div className="overflow-x-auto">
              <Table>
            <TableHeader className="sticky top-0 bg-[#161b22] z-10 border-b border-gray-700">
              <TableRow className="hover:bg-transparent border-gray-700">
                <TableHead className="w-10 sm:w-12 h-8 px-1 sm:px-2">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Checkbox
                      checked={isIndeterminate ? "indeterminate" : isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                    />
                    <span className="text-[9px] sm:text-[10px] font-medium text-gray-400 hidden sm:inline">
                      
                    </span>
                  </div>
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Flag
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Uploaded By
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">
                  Date & Time
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleManualRefresh}
                    disabled={isManualRefreshing}
                    title="Refresh"
                    aria-label="Refresh"
                    className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-[#1d232a] disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isManualRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {showSkeleton ? (
                <DocumentTableSkeleton
                  rows={skeletonRows}
                  showFlag
                  compact
                  responsive
                  rowHeightClass="h-9"
                  showActionColumn
                />
              ) : Object.keys(groupedDocuments).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <p className="text-sm font-medium">No documents found</p>
                      <p className="text-xs mt-1">Try adjusting your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                Object.keys(groupedDocuments).map((group) => (
                  <>
                    {/* Group Header */}
                    <TableRow key={`group-${group}`} className="bg-[#0d1117] border-gray-800 hover:bg-[#0d1117]">
                      <TableCell colSpan={8} className="px-2 py-1">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                          <span className="text-xs font-semibold text-blue-400 px-2">
                            {group}
                          </span>
                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Group Rows */}
                    {groupedDocuments[group].map((doc) => {
                      const isActive = selectedDoc?.id === doc.id;
                      const isSelected = selectedDocIds.has(doc.id);

                      return (
                      <TableRow
                        key={doc.id}
                        data-state={isSelected ? "selected" : undefined}
                        className={`group h-9 border-gray-800 hover:bg-[#1d232a]/50 cursor-pointer transition-colors ${
                          isActive ? "bg-[#1f6feb]/15 ring-1 ring-inset ring-[#1f6feb]/40" : ""
                        } ${
                          isSelected && !isActive ? "bg-[#1f6feb]/10 ring-1 ring-inset ring-[#1f6feb]/30" : ""
                        }`}
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsPreviewOpen(true);
                          if (doc.seen !== true) {
                            dispatch(updateDocument({ document: doc, seen: true }));
                          }
                        }}
                      >
                        <TableCell className="px-1 sm:px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDocIds.has(doc.id)}
                            onCheckedChange={(checked) => handleSelectDoc(doc.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${doc.driver_name}`}
                            className="h-3 w-3 sm:h-3.5 sm:w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 data-[state=checked]:opacity-100 data-[state=indeterminate]:opacity-100"
                          />
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-1.5">
                            <div className="flex items-center gap-1 sm:gap-1.5" title={doc.seen === false ? "Unseen" : doc.seen === true ? "Seen" : "Unknown"}>
                              <span
                                className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                                  doc.seen === false
                                    ? "bg-blue-500"
                                    : doc.seen === true
                                      ? "bg-green-500"
                                      : "bg-gray-500"
                                }`}
                              />
                            </div>
                            {doc.completed === true && (
                              <span className="inline-flex items-center text-emerald-400" title="Done">
                                <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                              </span>
                            )}
                            {doc.state === "markedForResend" && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-orange-400" title="Marked for Resend">
                                <Redo2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                                Resend
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          <button
                            type="button"
                            className="group inline-flex items-center justify-center rounded-full transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60 disabled:pointer-events-none"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleToggleFlag(doc);
                            }}
                            aria-label={doc.flag?.flagged || doc.flagged || doc.isFlagged ? "Unflag document" : "Flag document"}
                            title={doc.flag?.flagged || doc.flagged || doc.isFlagged ? "Unflag document" : "Flag document"}
                            disabled={isFlagUpdating}
                          >
                            {doc.flag?.flagged || doc.flagged || doc.isFlagged ? (
                              <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-red-500 transition-colors duration-200 group-hover:animate-pulse" fill="#ef4444" />
                            ) : (
                              <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600 transition-colors duration-200 group-hover:text-red-400 group-hover:animate-pulse" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          {(() => {
                            const driverName = doc.driver_name || "Unknown";
                            const matchedDriver = findDriverByEmailOrName(doc.driver_email, doc.driver_name);
                            const driverEmail =
                              doc.driver_email || matchedDriver?.email || matchedDriver?.driver_email;
                            const driverPhone =
                              doc.driver_phone ||
                              doc.driver_mobile ||
                              doc.phone ||
                              matchedDriver?.phone;
                            const driverImage =
                              doc.driver_image ||
                              matchedDriver?.profilePic ||
                              matchedDriver?.image ||
                              "/default-user.png";

                            return (
                              <div className="flex items-center gap-1.5 sm:gap-2">
                                <Popover
                                  open={driverPopupDoc?.id === doc.id}
                                  onOpenChange={(open) => !open && setDriverPopupDoc(null)}
                                >
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center rounded-full border border-gray-700 overflow-hidden"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDriverPopupDoc(driverPopupDoc?.id === doc.id ? null : doc);
                                      }}
                                      aria-label={`View ${driverName} contact details`}
                                    >
                                      <img
                                        src={driverImage}
                                        alt={driverName}
                                        className="w-5 h-5 sm:w-6 sm:h-6 object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = "/default-user.png";
                                        }}
                                      />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-72 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                    <div className="p-4 space-y-3 border-b border-gray-700">
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={driverImage}
                                          alt={driverName}
                                          className="w-14 h-14 rounded-full object-cover border border-gray-700"
                                          onError={(e) => { e.currentTarget.src = "/default-user.png"; }}
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-semibold text-white truncate">{driverName}</p>
                                          {driverEmail && <p className="text-xs text-gray-400 truncate">{driverEmail}</p>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="p-3 space-y-2 text-xs text-gray-300">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-gray-500">Driver Name</span>
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span className="text-white truncate">{driverName}</span>
                                          {renderCopyButton(driverName, "driver name")}
                                        </div>
                                      </div>
                                      {driverEmail && (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-gray-500">Email</span>
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-white truncate">{driverEmail}</span>
                                            {renderCopyButton(driverEmail, "driver email")}
                                          </div>
                                        </div>
                                      )}
                                      {driverPhone && (
                                        <div className="flex items-center justify-between gap-3">
                                          <span className="text-gray-500">Phone</span>
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-white truncate">{driverPhone}</span>
                                            {renderCopyButton(driverPhone, "driver phone")}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                                <span className="text-[10px] sm:text-xs font-medium text-white truncate max-w-[100px] sm:max-w-none">
                                  {driverName}
                                </span>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5 hidden md:table-cell">
                          <div className="text-[10px] sm:text-xs text-gray-300">
                            {new Date(doc.date).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5 hidden sm:table-cell">
                          <span className="text-[10px] sm:text-xs text-gray-300 truncate max-w-[80px]">{doc.type || "—"}</span>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          <span className="inline-flex items-center px-1 sm:px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-gray-800/50 text-gray-300 border border-gray-700">
                            {doc.category || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5" />
                      </TableRow>
                      );
                    })}
                  </>
                ))
              )}

              {/* Infinite Scroll Trigger */}
              {hasMore && !loading && (
                <TableRow>
                  <TableCell colSpan={8} ref={observerTarget} className="h-16">
                    {loadingMore && (
                      <div className="flex items-center justify-center gap-2 text-gray-400">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                        <span className="text-xs">Loading more documents...</span>
      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}

              {/* End of Results */}
              {!hasMore && !loading && filteredDocuments?.length > 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-12 text-center">
                    <p className="text-xs text-gray-500">No more documents to load</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
              </Table>
              </div>

              {!loading && (
                <div className="mt-2 sticky bottom-0 items-center justify-between text-[10px] sm:text-xs text-gray-400 w-full bg-gray-900 p-1 sm:p-1.5 rounded-b-lg">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span>
                      Showing: <span className="font-semibold text-white">{filteredDocuments?.length || 0}</span> of{" "}
                      <span className="font-semibold text-white">{total || filteredDocuments?.length || 0}</span> documents
                    </span>
                    {selectedDocIds.size > 0 && (
                      <span>
                        Selected: <span className="font-semibold text-blue-400">{selectedDocIds.size}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 📄 PREVIEW CONTAINER - Hidden on mobile, shown in drawer */}
          {isPreviewOpen && selectedDoc && (
            <div
              className="hidden lg:flex lg:flex-none min-w-[320px] max-w-[70%] flex-col bg-[#161b22] relative overflow-auto"
              style={{ width: previewWidth, maxWidth: "70%" }}
            >
              <div
                className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                role="separator"
                aria-orientation="vertical"
                onMouseDown={handleResizeStart}
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedDoc(null);
                  setIsPreviewOpen(false);
                }}
                className="absolute top-1 right-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900/90 text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close document preview"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Preview Content */}
              <div className="document-preview-scroll flex-1 overflow-y-auto p-0">
                <div className="flex h-full flex-col p-4">
                  <DocumentPreviewContent
                    selectedDoc={selectedDoc}
                    onDocUpdate={(updatedDoc) => {
                      if (updatedDoc === null) {
                        // Document was deleted, close preview
                        setSelectedDoc(null);
                        setIsPreviewOpen(false);
                      } else {
                        setSelectedDoc(updatedDoc);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-[#161b22] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Delete Selected Documents</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="text-gray-400 hover:text-white"
                disabled={isBulkDeleting}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-300">
                You have selected {selectedDocIds.size} document{selectedDocIds.size === 1 ? "" : "s"} for deletion.
                This action cannot be undone.
              </p>
              <p className="text-xs text-gray-400">
                The selected documents will be removed permanently and cannot be recovered.
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <Button
                onClick={() => setShowBulkDeleteModal(false)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-800 hover:bg-[#1d232a] hover:text-white"
                disabled={isBulkDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkDelete}
                size="sm"
                disabled={isBulkDeleting}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBulkDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer for Document Preview */}
      {isMobile && (
        <Drawer open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
          <DrawerContent className="max-h-[85vh] bg-[#161b22] border-gray-700">
            <DrawerHeader className="border-b border-gray-700">
              <div className="flex items-center justify-between">
                <DrawerTitle className="text-white">Document Preview</DrawerTitle>
                <DrawerClose className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </DrawerClose>
              </div>
            </DrawerHeader>
            <div className="document-preview-scroll overflow-y-auto p-0">
              <div className="flex h-full flex-col p-4">
                {selectedDoc && (
                  <DocumentPreviewContent
                    selectedDoc={selectedDoc}
                    onDocUpdate={(updatedDoc) => {
                      if (updatedDoc === null) {
                        // Document was deleted, close preview
                        setSelectedDoc(null);
                      } else {
                        setSelectedDoc(updatedDoc);
                      }
                    }}
                  />
                )}
              </div>
            </div>
            
            {/* Mark document as seen/unseen - Toggle functionality - Mobile */}
            
          </DrawerContent>
        </Drawer>
      )}

    </div>
  );
}
