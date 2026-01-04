import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DocumentTable from "../components/DocumentTable";
import DocumentPreview from "../components/DocumentPreview";
import { fetchDocumentsRoute } from "../utils/apiRoutes";

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

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [searchParams] = useSearchParams();

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const [selectedFilter, setSelectedFilter] = useState(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all | seen | unseen
  const [categoryFilter, setCategoryFilter] = useState(null); // C D F

  const scrollContainerRef = useRef(null);
  const PAGE_LIMIT = 30;

  const fetchPage = useCallback(
    async (pageCursor) => {
      const token = localStorage.getItem("adminToken");
      const url = fetchDocumentsRoute(startDate, endDate, {
        limit: PAGE_LIMIT,
        cursor: pageCursor,
      });

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error("Failed to fetch documents.");
      }

      const nextCursor = data?.nextCursor ?? null;
      const hasMoreResult =
        typeof data?.hasMore === "boolean" ? data.hasMore : Boolean(nextCursor);

      return {
        documents: Array.isArray(data?.documents) ? data.documents : [],
        nextCursor,
        hasMore: hasMoreResult,
      };
    },
    [endDate, startDate]
  );

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingMore(false);
      setFetchError(null);
      setDocuments([]);
      setCursor(null);
      setHasMore(true);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }

      const data = await fetchPage(null);

      setDocuments(data.documents);
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.log("Fetch error:", err);
      setFetchError("Unable to load documents.");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  const fetchNextPage = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;

    try {
      setLoadingMore(true);
      setFetchError(null);

      const data = await fetchPage(cursor);

      setDocuments((prev) => {
        if (!data.documents.length) return prev;
        const existingIds = new Set(prev.map((doc) => doc.id));
        const nextDocs = data.documents.filter((doc) => !existingIds.has(doc.id));
        return [...prev, ...nextDocs];
      });
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.log("Fetch error:", err);
      setFetchError("Unable to load more documents.");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, fetchPage, hasMore, loading, loadingMore]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  useEffect(() => {
    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");

    setSelectedFilter(typeParam || null);

    if (["all", "seen", "unseen"].includes(statusParam)) {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter("all");
    }
  }, [searchParams]);

  const filteredDocuments = documents
    .filter((doc) =>
      selectedFilter ? doc.type === selectedFilter : true
    )
    .filter((doc) => {
      if (!search) return true;
      const text = search.toLowerCase();

      return (
        doc.driver_name?.toLowerCase().includes(text) ||
        doc.type?.toLowerCase().includes(text) ||
        doc.note?.toLowerCase().includes(text) ||
        String(doc.userid).includes(text)
      );
    })
    .filter((doc) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "seen") return doc.seen === true;
      if (statusFilter === "unseen") return doc.seen === false;
    })
    .filter((doc) => {
      if (!categoryFilter) return true;
      return String(doc.feature).toUpperCase() === categoryFilter;
    });

  function resetDates() {
    const { start, end } = getDefaultDates();
    setStartDate(start);
    setEndDate(end);
  }

  function handleScroll(event) {
    const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      fetchNextPage();
    }
  }

  return (
    <div className="text-white h-full overflow-hidden flex flex-col p-4">


      {/* TOP FILTER BUTTONS */}
      <div className="flex flex-wrap gap-3 mb-5">
        {Object.keys(FILTER_MAP).map((item) => (
          <button
            key={item}
            onClick={() => setSelectedFilter(FILTER_MAP[item])}
            className={`px-4 py-1 rounded-full text-sm border 
              ${
                selectedFilter === FILTER_MAP[item]
                  ? "bg-blue-600 border-blue-600"
                  : "border-gray-600 hover:bg-gray-800"
              }
            `}
          >
            {item}
          </button>
        ))}

        {selectedFilter && (
          <button
            onClick={() => setSelectedFilter(null)}
            className="px-4 py-1 rounded-full bg-gray-700"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* STATUS + CATEGORY FILTER ROW */}
      <div className="flex items-center gap-4 mb-4">

        {/* STATUS */}
        <span>Status:</span>
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1 rounded ${
            statusFilter === "all" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          All
        </button>

        <button
          onClick={() => setStatusFilter("unseen")}
          className={`px-3 py-1 rounded flex items-center gap-2 ${
            statusFilter === "unseen" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Unseen
        </button>

        <button
          onClick={() => setStatusFilter("seen")}
          className={`px-3 py-1 rounded flex items-center gap-2 ${
            statusFilter === "seen" ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span className="text-green-500 text-xl">✔</span> Seen
        </button>

        {/* CATEGORY */}
        <span className="ml-6">Category:</span>

        {["C", "D", "F"].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded ${
              categoryFilter === cat ? "bg-blue-600" : "bg-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}

        {categoryFilter && (
          <button
            onClick={() => setCategoryFilter(null)}
            className="px-3 py-1 bg-gray-600 rounded"
          >
            Reset
          </button>
        )}
      </div>

      {/* SEARCH BAR */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1d232a] px-3 py-2 rounded outline-none"
        />
      </div>

      {/* MAIN 2 COLUMN LAYOUT */}
     <div className="flex gap-4 flex-1 overflow-hidden">


        {/* LEFT PANEL */}
        <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 overflow-hidden flex flex-col">

  {/* Date Filter (FIXED) */}
  <div className="flex gap-3 items-center mb-4 shrink-0">
    <span>Date Range:</span>

    <input
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      className="bg-[#1d232a] px-3 py-1 rounded"
    />

    <span>to</span>

    <input
      type="date"
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      className="bg-[#1d232a] px-3 py-1 rounded"
    />

    <button
      onClick={resetDates}
      className="ml-3 bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
    >
      Reset
    </button>
  </div>

  {/* 📜 TABLE (ONLY THIS SCROLLS) */}
  <div
    ref={scrollContainerRef}
    className="flex-1 overflow-y-auto chat-list-scroll"
    onScroll={handleScroll}
  >
    <DocumentTable
      documents={filteredDocuments}
      loading={loading}
      setSelectedDoc={setSelectedDoc}
    />

    {!loading && loadingMore && (
      <div className="py-3 text-center text-sm text-gray-400">
        Loading more...
      </div>
    )}

    {!loading && !loadingMore && !hasMore && documents.length > 0 && (
      <div className="py-3 text-center text-sm text-gray-500">
        End of results
      </div>
    )}

    {!loading && fetchError && (
      <div className="py-3 text-center text-sm text-red-400">
        {fetchError}
      </div>
    )}
  </div>

</div>


        {/* RIGHT PANEL */}
        <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
          <DocumentPreview selectedDoc={selectedDoc} />
        </div>

      </div>
    </div>
  );
}
