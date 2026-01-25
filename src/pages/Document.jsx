import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchDocuments, fetchMoreDocuments, resetPagination } from "../store/slices/documentsSlice";
import DocumentPreviewContent from "../components/DocumentPreviewContent";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { X, Search, Calendar, Flag, ChevronDown, Check } from "lucide-react";
import DocumentTableSkeleton from "../components/skeletons/DocumentTableSkeleton";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "../components/ui/drawer";

// Last 60 Days
function getDefaultDates() {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 60);

  const format = (d) => d.toISOString().split("T")[0];

  return { start: format(past), end: format(today) };
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
  const { start, end } = getDefaultDates();
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
  } = useAppSelector((state) => state.documents);
  const documentDropDownRef = useRef(null);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const observerTarget = useRef(null);

  const [searchParams] = useSearchParams();

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const [selectedFilters, setSelectedFilters] = useState([]); // Array of filter values

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all | seen | unseen
  const [categoryFilter, setCategoryFilter] = useState(null); // C D F
  const [flagFilter, setFlagFilter] = useState(null); // null | true | false (null = all)
  const [showDocumentTypeDropdown, setShowDocumentTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilterTypeDropdown, setShowFilterTypeDropdown] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const filterTypeDropdownRef = useRef(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);


  // Convert status filter to isSeen parameter
  const isSeenParam = useMemo(() => {
    if (statusFilter === "seen") return true;
    if (statusFilter === "unseen") return false;
    return null;
  }, [statusFilter]);

  // Convert category filter to API format (C, D, F)
  // Note: The API expects category as a single value, not an array
  const categoryParam = useMemo(() => {
    return categoryFilter || null;
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

  // Fetch documents when params change (initial load)
  useEffect(() => {
    const paramsChanged =
      !lastFetchParams ||
      lastFetchParams.startDate !== startDate ||
      lastFetchParams.endDate !== endDate ||
      lastFetchParams.search !== searchDebounced ||
      lastFetchParams.isSeen !== isSeenParam ||
      lastFetchParams.isFlagged !== isFlaggedParam ||
      lastFetchParams.category !== categoryParam ||
      JSON.stringify(lastFetchParams.filters || []) !== JSON.stringify(typeFilters);

    const isStale = lastFetched && Date.now() - lastFetched > 5 * 60 * 1000;

    if ((paramsChanged || isStale) && !loading) {
      dispatch(resetPagination());
      dispatch(
        fetchDocuments({
          startDate,
          endDate,
          page: 1,
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
  ]);

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
    const { start, end } = getDefaultDates();
    setStartDate(start);
    setEndDate(end);
    setDateRange({
      from: new Date(start),
      to: new Date(end),
    });
  }

  // Handle native date input changes
  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDate(value);
    if (value && endDate && value > endDate) {
      setEndDate(value); // If start date is after end date, update end date
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setEndDate(value);
    if (value && startDate && value < startDate) {
      setStartDate(value); // If end date is before start date, update start date
    }
  };

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
        <div className="relative flex-1 w-full sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by driver name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1d232a] pl-9 border-gray-700 text-gray-300 placeholder:text-gray-500 text-sm sm:text-base"
          />
        </div>

        {/* Category Filters (C, D, F) */}
        <div className="flex gap-1.5 sm:gap-2">
          {["C", "D", "F"].map((cat) => (
            <Button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              className={`min-w-[36px] sm:min-w-[40px] h-8 sm:h-9 text-xs sm:text-sm ${
                categoryFilter === cat
                  ? "bg-[#1f6feb] text-white border-[#1f6feb] hover:bg-[#1a5fd4]"
                  : "bg-[#161b22] border-gray-700 text-gray-300 hover:bg-[#1d232a] hover:border-gray-600"
              }`}
            >
              {cat}
            </Button>
          ))}
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
            {(selectedFilters.length > 0 || statusFilter !== "all") && (
          <button
                onClick={() => {
                  setSelectedFilters([]);
                  setStatusFilter("all");
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

        {/* Date Range Picker - Native Inputs */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <div className="relative flex items-center flex-1 sm:flex-none min-w-0">
            <Calendar className="absolute left-2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none z-10" />
            <Input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              max={endDate || undefined}
              className="h-8 sm:h-9 pl-8 sm:pl-9 pr-2 sm:pr-3 text-xs sm:text-sm bg-[#1d232a] border-gray-700 text-gray-300 hover:bg-[#161b22] hover:border-gray-600 focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] [color-scheme:dark]"
            />
          </div>
          <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">to</span>
          <div className="relative flex items-center flex-1 sm:flex-none min-w-0">
            <Input
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              min={startDate || undefined}
              className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm bg-[#1d232a] border-gray-700 text-gray-300 hover:bg-[#161b22] hover:border-gray-600 focus:border-[#1f6feb] focus:ring-1 focus:ring-[#1f6feb] [color-scheme:dark]"
            />
          </div>
          {(startDate !== start || endDate !== end) && (
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
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 bg-[#161b22] rounded-lg border border-gray-700 overflow-hidden flex flex-col">
        {/* FLEX CONTAINER: TABLE + PREVIEW */}
          <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
            {/* 📜 TABLE SECTION */}
            <div
              className={`flex-1 min-w-0 overflow-hidden flex flex-col ${
                isPreviewOpen ? "lg:border-r border-gray-700" : ""
              }`}
            >
            <div className="flex-1 overflow-y-auto chat-list-scroll">
              <div className="overflow-x-auto">
              <Table>
            <TableHeader className="sticky top-0 bg-[#161b22] z-10 border-b border-gray-700">
              <TableRow className="hover:bg-transparent border-gray-700">
                <TableHead className="w-10 sm:w-12 h-8 px-1 sm:px-2">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Checkbox
                      checked={isAllSelected || isIndeterminate}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                    />
                    <span className="text-[9px] sm:text-[10px] font-medium text-gray-400 hidden sm:inline">Select All</span>
                  </div>
                </TableHead>
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
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
                <TableHead className="h-8 px-1 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Flag
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <DocumentTableSkeleton rows={12} />
              ) : Object.keys(groupedDocuments).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
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
                      <TableCell colSpan={7} className="px-2 py-1">
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
                    {groupedDocuments[group].map((doc) => (
                      <TableRow
                        key={doc.id}
                        className="border-gray-800 hover:bg-[#1d232a]/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedDoc(doc);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <TableCell className="px-1 sm:px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedDocIds.has(doc.id)}
                            onCheckedChange={(checked) => handleSelectDoc(doc.id, checked)}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select ${doc.driver_name}`}
                            className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                          />
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${doc.seen === false
                                  ? "bg-blue-500"
                                  : doc.seen === true
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }`}
                            />
                            <span className="text-[10px] sm:text-[11px] text-gray-400">
                              {doc.seen === false ? "Unseen" : doc.seen === true ? "Seen" : "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            {doc.driver_image && (
                              <img
                                src={doc.driver_image}
                                alt={doc.driver_name}
                                className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-gray-700"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            )}
                            <span className="text-[10px] sm:text-xs font-medium text-white truncate max-w-[100px] sm:max-w-none">
                              {doc.driver_name || "Unknown"}
                            </span>
                          </div>
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
                        <TableCell className="px-1 sm:px-2 py-1.5">
                          {doc.flag?.flagged || doc.flagged || doc.isFlagged ? (
                            <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#1f6feb]" fill="#1f6feb" />
                          ) : (
                            <Flag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-gray-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))
              )}

              {/* Infinite Scroll Trigger */}
              {hasMore && !loading && (
                <TableRow>
                  <TableCell colSpan={7} ref={observerTarget} className="h-16">
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
                  <TableCell colSpan={7} className="h-12 text-center">
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
          {isPreviewOpen && (
            <div
              className="hidden lg:flex lg:shrink-0 lg:w-[40%] min-w-[320px] max-w-[60%] flex-col bg-[#161b22] relative resize-x overflow-auto"
              style={{ resize: "horizontal" }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedDoc(null);
                  setIsPreviewOpen(false);
                }}
                className="absolute top-3 right-3 text-gray-400 hover:text-white rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Close document preview"
              >
                <X className="h-4 w-4" />
              </button>
              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedDoc ? (
                  <DocumentPreviewContent selectedDoc={selectedDoc} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400 text-center text-sm">
                      No Document Selected
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
            <div className="overflow-y-auto p-4">
              {selectedDoc && <DocumentPreviewContent selectedDoc={selectedDoc} />}
            </div>
          </DrawerContent>
        </Drawer>
      )}

    </div>
  );
}
