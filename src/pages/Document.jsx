
// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// // Function: Last 60 Days Default Range
// function getDefaultDates() {
//   const today = new Date();
//   const past = new Date();

//   past.setDate(today.getDate() - 60);
//   const format = (d) => d.toISOString().split("T")[0];

//   return {
//     start: format(past),
//     end: format(today),
//   };
// }

// export default function Documents() {
//   const { start, end } = getDefaultDates();

//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   const [startDate, setStartDate] = useState(start);
//   const [endDate, setEndDate] = useState(end);

//   // Fetch API Function
//   async function fetchDocs() {
//     try {
//       setLoading(true);

//       const token = localStorage.getItem("adminToken");

//       let url =
//         "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

//       if (startDate && endDate) {
//         url += `?start_date=${startDate}&end_date=${endDate}`;
//       }

//       const res = await fetch(url, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         console.error("Error fetching documents:", data);
//         return;
//       }

//       const sorted = (data.documents || []).sort((a, b) => {
//         return new Date(b.date) - new Date(a.date);
//       });

//       setDocuments(sorted);

//     } catch (error) {
//       console.error("Error fetching docs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   useEffect(() => {
//     if (startDate && endDate) {
//       fetchDocs();
//     }
//   }, [startDate, endDate]);

//   function resetDates() {
//     const { start, end } = getDefaultDates();
//     setStartDate(start);
//     setEndDate(end);
//     fetchDocs();
//   }

//   useEffect(() => {
//     console.log("Selected Doc:", selectedDoc);
//   }, [selectedDoc]);

//   return (
//     <div className="text-white p-4">

//       {/* TOP BUTTONS */}
//       <div className="flex flex-wrap gap-3 mb-6">
//         {[
//           "Pickup Doc",
//           "Delivery Proof",
//           "Load Image",
//           "Fuel Receipt",
//           "Stamp Paper",
//           "Driver Expense",
//           "DM Transport Trip Envelope",
//           "DM Trans Inc Trip Envelope",
//           "DM Transport City Worksheet",
//           "Repair and Maintenance",
//           "CTPAT",
//         ].map((item) => (
//           <button
//             key={item}
//             className="border border-gray-600 px-4 py-1 rounded-full hover:bg-gray-800 text-sm"
//           >
//             {item}
//           </button>
//         ))}
//       </div>

//       {/* 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">

//         {/* LEFT TABLE - ONLY THIS WILL SCROLL */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 
//                         h-[80vh] overflow-y-auto">

//           {/* Date Filter */}
//           <div className="flex gap-3 items-center mb-4">
//             <span className="text-gray-400 text-sm">Date Range:</span>

//             <input
//               type="date"
//               value={startDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <span className="text-gray-400">to</span>

//             <input
//               type="date"
//               value={endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <button
//               onClick={resetDates}
//               className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
//             >
//               Reset
//             </button>
//           </div>

//           {/* TABLE */}
//           <DocumentTable
//             documents={documents}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW PANEL */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 
//                         min-h-[600px] overflow-auto">
//           <DocumentPreview selectedDoc={selectedDoc} />
//         </div>

//       </div>
//     </div>
//   );
// }


// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// // Function: Last 60 Days Default Range
// function getDefaultDates() {
//   const today = new Date();
//   const past = new Date();

//   past.setDate(today.getDate() - 60);
//   const format = (d) => d.toISOString().split("T")[0];

//   return {
//     start: format(past),
//     end: format(today),
//   };
// }

// // 🔥 Map Buttons → Backend Document Types
// const FILTER_MAP = {
//   "Pickup Doc": "pick_up",
//   "Delivery Proof": "delivery",
//   "Load Image": "load_image",
//   "Fuel Receipt": "fuel_recipt",
//   "Stamp Paper": "paper_logs",
//   "Driver Expense": "driver_expense_sheet",
//   "DM Transport Trip Envelope": "dm_transport_trip_envelope",
//   "DM Trans Inc Trip Envelope": "dm_trans_inc_trip_envelope",
//   "DM Transport City Worksheet": "dm_transport_city_worksheet_trip_envelope",
//   "Repair and Maintenance": "repair_maintenance",
//   "CTPAT": "CTPAT",
// };

// export default function Documents() {
//   const { start, end } = getDefaultDates();

//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   const [startDate, setStartDate] = useState(start);
//   const [endDate, setEndDate] = useState(end);

//   const [selectedFilter, setSelectedFilter] = useState(null); // 🔥 Active filter

//   // Fetch API Function
//   async function fetchDocs() {
//     try {
//       setLoading(true);

//       const token = localStorage.getItem("adminToken");

//       let url =
//         "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

//       if (startDate && endDate) {
//         url += `?start_date=${startDate}&end_date=${endDate}`;
//       }

//       const res = await fetch(url, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         console.error("Error fetching documents:", data);
//         return;
//       }

//       const sorted = (data.documents || []).sort((a, b) => {
//         return new Date(b.date) - new Date(a.date);
//       });

//       setDocuments(sorted);

//     } catch (error) {
//       console.error("Error fetching docs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Load in first render
//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   // If date change → refetch
//   useEffect(() => {
//     if (startDate && endDate) {
//       fetchDocs();
//     }
//   }, [startDate, endDate]);

//   function resetDates() {
//     const { start, end } = getDefaultDates();
//     setStartDate(start);
//     setEndDate(end);
//     fetchDocs();
//   }

//   // 🔥 Apply category filter
//   const filteredDocuments = selectedFilter
//     ? documents.filter((doc) => doc.type === selectedFilter)
//     : documents;

//   return (
//     <div className="text-white p-4">

//       {/* TOP FILTER BUTTONS */}
//       <div className="flex flex-wrap gap-3 mb-6">
//         {Object.keys(FILTER_MAP).map((item) => (
//           <button
//             key={item}
//             onClick={() => setSelectedFilter(FILTER_MAP[item])}
//             className={`px-4 py-1 rounded-full text-sm border 
//               ${
//                 selectedFilter === FILTER_MAP[item]
//                   ? "bg-blue-600 border-blue-600"
//                   : "border-gray-600 hover:bg-gray-800"
//               }
//             `}
//           >
//             {item}
//           </button>
//         ))}

//         {/* RESET FILTER BUTTON */}
//         {selectedFilter && (
//           <button
//             onClick={() => setSelectedFilter(null)}
//             className="bg-gray-700 px-4 py-1 rounded-full text-sm hover:bg-gray-600"
//           >
//             Clear Filter
//           </button>
//         )}
//       </div>

//       {/* 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">

//         {/* LEFT TABLE - scrollable */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 h-[80vh] overflow-y-auto">

//           {/* DATE FILTER */}
//           <div className="flex gap-3 items-center mb-4">
//             <span className="text-gray-400 text-sm">Date Range:</span>

//             <input
//               type="date"
//               value={startDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <span className="text-gray-400">to</span>

//             <input
//               type="date"
//               value={endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <button
//               onClick={resetDates}
//               className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
//             >
//               Reset
//             </button>
//           </div>

//           {/* TABLE --> FILTERED LIST */}
//           <DocumentTable
//             documents={filteredDocuments}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 min-h-[600px] overflow-auto">
//           <DocumentPreview selectedDoc={selectedDoc} />
//         </div>
//       </div>
//     </div>
//   );
// }


// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// // Function: Last 60 Days Default Range
// function getDefaultDates() {
//   const today = new Date();
//   const past = new Date();

//   past.setDate(today.getDate() - 60);
//   const format = (d) => d.toISOString().split("T")[0];

//   return {
//     start: format(past),
//     end: format(today),
//   };
// }

// // 🔥 Map Buttons → Backend Document Types
// const FILTER_MAP = {
//   "Pickup Doc": "pick_up",
//   "Delivery Proof": "delivery",
//   "Load Image": "load_image",
//   "Fuel Receipt": "fuel_recipt",
//   "Stamp Paper": "paper_logs",
//   "Driver Expense": "driver_expense_sheet",
//   "DM Transport Trip Envelope": "dm_transport_trip_envelope",
//   "DM Trans Inc Trip Envelope": "dm_trans_inc_trip_envelope",
//   "DM Transport City Worksheet": "dm_transport_city_worksheet_trip_envelope",
//   "Repair and Maintenance": "repair_maintenance",
//   "CTPAT": "CTPAT",
// };

// export default function Documents() {
//   const { start, end } = getDefaultDates();

//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   const [startDate, setStartDate] = useState(start);
//   const [endDate, setEndDate] = useState(end);

//   const [selectedFilter, setSelectedFilter] = useState(null); 
//   const [search, setSearch] = useState(""); // 🔥 SEARCH STATE

//   // Fetch API Function
//   async function fetchDocs() {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("adminToken");

//       let url =
//         "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

//       if (startDate && endDate) {
//         url += `?start_date=${startDate}&end_date=${endDate}`;
//       }

//       const res = await fetch(url, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const data = await res.json();
//       if (!res.ok) {
//         console.error("Error fetching documents:", data);
//         return;
//       }

//       const sorted = (data.documents || []).sort(
//         (a, b) => new Date(b.date) - new Date(a.date)
//       );

//       setDocuments(sorted);
//     } catch (error) {
//       console.error("Error fetching docs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   useEffect(() => {
//     if (startDate && endDate) fetchDocs();
//   }, [startDate, endDate]);

//   function resetDates() {
//     const { start, end } = getDefaultDates();
//     setStartDate(start);
//     setEndDate(end);
//     fetchDocs();
//   }

//   // 🔥 APPLY FILTER + SEARCH
//   const filteredDocuments = documents
//     .filter((doc) =>
//       selectedFilter ? doc.type === selectedFilter : true
//     )
//     .filter((doc) => {
//       if (!search) return true;

//       const text = search.toLowerCase();

//       return (
//         doc.driver_name?.toLowerCase().includes(text) ||
//         doc.type?.toLowerCase().includes(text) ||
//         doc.note?.toLowerCase().includes(text) ||
//         String(doc.userid).includes(text) ||
//         String(doc.feature).includes(text)
//       );
//     });

//   return (
//     <div className="text-white p-4">

//       {/* TOP FILTER BUTTONS */}
//       <div className="flex flex-wrap gap-3 mb-6">
//         {Object.keys(FILTER_MAP).map((item) => (
//           <button
//             key={item}
//             onClick={() => setSelectedFilter(FILTER_MAP[item])}
//             className={`px-4 py-1 rounded-full text-sm border 
//               ${
//                 selectedFilter === FILTER_MAP[item]
//                   ? "bg-blue-600 border-blue-600"
//                   : "border-gray-600 hover:bg-gray-800"
//               }`}
//           >
//             {item}
//           </button>
//         ))}

//         {selectedFilter && (
//           <button
//             onClick={() => setSelectedFilter(null)}
//             className="bg-gray-700 px-4 py-1 rounded-full text-sm hover:bg-gray-600"
//           >
//             Clear Filter
//           </button>
//         )}
//       </div>

//       {/* 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">

//         {/* LEFT TABLE */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 h-[80vh] overflow-y-auto">

//           {/* SEARCH BAR */}
//           <div className="mb-4">
//             <input
//               type="text"
//               placeholder="Search documents..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="bg-[#1d232a] px-3 py-2 rounded w-full outline-none text-sm"
//             />
//           </div>

//           {/* DATE FILTER */}
//           <div className="flex gap-3 items-center mb-4">
//             <span className="text-gray-400 text-sm">Date Range:</span>

//             <input
//               type="date"
//               value={startDate}
//               onChange={(e) => setStartDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <span className="text-gray-400">to</span>

//             <input
//               type="date"
//               value={endDate}
//               onChange={(e) => setEndDate(e.target.value)}
//               className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
//             />

//             <button
//               onClick={resetDates}
//               className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
//             >
//               Reset
//             </button>
//           </div>

//           <DocumentTable
//             documents={filteredDocuments}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 min-h-[600px] overflow-auto">
//           <DocumentPreview selectedDoc={selectedDoc} />
//         </div>
//       </div>
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import DocumentTable from "../components/DocumentTable";
import DocumentPreview from "../components/DocumentPreview";

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
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  const [selectedFilter, setSelectedFilter] = useState(null);

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all"); // all | seen | unseen
  const [categoryFilter, setCategoryFilter] = useState(null); // C D F

  async function fetchDocs() {
    try {
      setLoading(true);

      const token = localStorage.getItem("adminToken");

      let url =
        "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) return;

      const sorted = (data.documents || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setDocuments(sorted);
    } catch (err) {
      console.log("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [startDate, endDate]);

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

  return (
    <div className="text-white p-4">

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
      <div className="flex gap-4">

        {/* LEFT PANEL */}
        <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 h-[80vh] overflow-y-auto">

          {/* Date Filter */}
          <div className="flex gap-3 items-center mb-4">
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

          <DocumentTable
            documents={filteredDocuments}
            loading={loading}
            setSelectedDoc={setSelectedDoc}
          />

        </div>

        {/* RIGHT PANEL */}
        <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 overflow-auto min-h-[600px]">
          <DocumentPreview selectedDoc={selectedDoc} />
        </div>

      </div>
    </div>
  );
}
