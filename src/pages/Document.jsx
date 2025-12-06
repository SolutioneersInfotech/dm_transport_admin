// export default function Documents() {
//   return (
//     <div className="p-4">
//       {/* Top Filters */}
//       <div className="flex flex-wrap gap-3 mb-4">
//         {[
//           "Pickup Doc",
//           "Delivery Proof",
//           "Load Image",
//           "Fuel Receipt",
//           "Stamp Paper",
//           "Driver expense",
//           "DM Transport Trip Envelope",
//           "DM Transport City Worksheet",
//           "DM Trans Inc Trip Envelope",
//           "Repair and maintenance",
//           "CTPAT",
//         ].map((filter) => (
//           <button
//             key={filter}
//             className="px-4 py-2 border border-gray-500 rounded-full text-sm hover:bg-gray-700"
//           >
//             {filter}
//           </button>
//         ))}
//       </div>

//       {/* Search Line */}
//       <div className="flex items-center gap-3 mb-4">
//         <div className="flex items-center gap-1 px-3 py-2 border border-gray-600 rounded">
//           <input
//             type="text"
//             placeholder="Search..."
//             className="bg-transparent focus:outline-none"
//           />
//           <span>🔍</span>
//         </div>

//         {/* Letters Filter */}
//         <div className="flex items-center gap-4">
//           {["C", "D", "F"].map((l) => (
//             <span key={l} className="cursor-pointer">
//               {l}
//             </span>
//           ))}
//         </div>

//         {/* Dropdown */}
//         <select className="bg-[#161b22] border border-gray-600 px-2 py-2 rounded">
//           <option>All Documents</option>
//         </select>

//         {/* Date Range */}
//         <div className="flex items-center gap-2 border px-3 py-2 border-gray-600 rounded">
//           <span>📅</span>
//           <span>2023-01-01 to 2025-12-02</span>
//         </div>
//       </div>

//       <div className="flex gap-4">
//         {/* Left Table Section */}
//         <div className="w-3/5 bg-[#161b22] rounded-lg border border-gray-700">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="border-b border-gray-600 bg-[#0f1a24]">
//                 <th className="p-3">Select</th>
//                 <th>Status</th>
//                 <th>Uploaded By</th>
//                 <th>Date</th>
//                 <th>Type</th>
//                 <th>Category</th>
//               </tr>
//             </thead>

//             <tbody>
//               <tr className="border-b border-gray-700">
//                 <td className="p-3">
//                   <input type="checkbox" />
//                 </td>
//                 <td>🔵</td>
//                 <td className="flex items-center gap-2">
//                   <img src="/avatar1.png" className="w-8 h-8 rounded-full" />
//                   Gurkirat Singh
//                 </td>
//                 <td>2025-12-02 13:08</td>
//                 <td>Fuel Receipt</td>
//                 <td>F</td>
//               </tr>

//               <tr className="border-b border-gray-700">
//                 <td className="p-3">
//                   <input type="checkbox" />
//                 </td>
//                 <td>🟢</td>
//                 <td className="flex items-center gap-2">
//                   <img src="/avatar2.png" className="w-8 h-8 rounded-full" />
//                   3518 Rajan
//                 </td>
//                 <td>2025-12-02 13:06</td>
//                 <td>Load Image</td>
//                 <td>D</td>
//               </tr>

//               <tr>
//                 <td className="p-3">
//                   <input type="checkbox" />
//                 </td>
//                 <td>🟢</td>
//                 <td className="flex items-center gap-2">
//                   <img src="/avatar2.png" className="w-8 h-8 rounded-full" />
//                   3518 Rajan
//                 </td>
//                 <td>2025-12-02 12:57</td>
//                 <td>Pickup Doc</td>
//                 <td>D</td>
//               </tr>
//             </tbody>
//           </table>

//           <div className="p-3 text-sm text-gray-400">Total Documents 34149</div>
//         </div>

//         {/* Right Preview Section */}
//         <div className="flex-1 flex items-center justify-center text-gray-400 text-lg border border-gray-700 rounded-lg bg-[#161b22]">
//           No Document Selected
//         </div>
//       </div>
//     </div>
//   );
// }

// import { useEffect, useState } from "react";
// import DocumentRow from "../components/DocumentRow";
// import Loader from "../components/Loader";

// export default function Documents() {
//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // 🔥 Fetch documents from backend
//   useEffect(() => {
//     async function fetchDocs() {
//       try {
//         const res = await fetch("http://localhost:5000/api/documents");
//         const data = await res.json();
//         setDocuments(data);
//       } catch (error) {
//         console.error("Error fetching docs:", error);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchDocs();
//   }, []);

//   return (
//     <div className="p-5 text-white">
//       <h2 className="text-2xl font-bold mb-5">Documents</h2>

//       {/* TOP FILTER BUTTONS */}
//       <div className="flex flex-wrap gap-3 mb-5">
//         {[
//           "Pickup Doc",
//           "Delivery Proof",
//           "Load Image",
//           "Fuel Receipt",
//           "Stamp Paper",
//           "DM Transport Trip Envelope",
//           "DM Trans Inc Trip Envelope",
//           "Repair & Maintenance",
//           "CTPAT",
//         ].map((btn) => (
//           <button
//             key={btn}
//             className="border border-gray-600 px-4 py-1 rounded-full hover:bg-gray-800"
//           >
//             {btn}
//           </button>
//         ))}
//       </div>

//       {/* SEARCH + FILTER BAR */}
//       <div className="flex items-center gap-3 mb-4">
//         <input type="checkbox" className="w-4 h-4 cursor-pointer" />
//         <span>Select All</span>

//         <input
//           type="text"
//           placeholder="Search..."
//           className="bg-[#1d232a] px-3 py-2 rounded w-60 outline-none"
//         />
//       </div>

//       {/* TABLE */}
//       <div className="bg-[#161b22] rounded-lg p-5 border border-gray-700">
//         <table className="w-full text-left">
//           <thead>
//             <tr className="border-b border-gray-700 text-gray-400">
//               <th className="p-3">Select</th>
//               <th className="p-3">Status</th>
//               <th className="p-3">Uploaded By</th>
//               <th className="p-3">Date</th>
//               <th className="p-3">Type</th>
//               <th className="p-3">Category</th>
//             </tr>
//           </thead>

//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan="6">
//                   <Loader />
//                 </td>
//               </tr>
//             ) : documents.length === 0 ? (
//               <tr>
//                 <td colSpan="6" className="text-center py-10 text-gray-400">
//                   No Documents Found
//                 </td>
//               </tr>
//             ) : (
//               documents.map((doc) => <DocumentRow key={doc.id} item={doc} />)
//             )}
//           </tbody>
//         </table>

//         <p className="mt-5 text-sm text-gray-400">
//           Total Documents: {documents.length}
//         </p>
//       </div>
//     </div>
//   );
// }

// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// export default function Documents() {
//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   useEffect(() => {
//     async function fetchDocs() {
//       try {
//         const res = await fetch("http://localhost:5000/api/documents");
//         const data = await res.json();
//         setDocuments(data);
//       } catch (error) {
//         console.error("Error fetching docs:", error);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchDocs();
//   }, []);

//   return (
//     <div className="text-white p-4">
//       {/* TOP BUTTON GROUPS */}
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
//         {/* LEFT SIDE TABLE */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700">
//           <DocumentTable
//             documents={documents}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT SIDE PREVIEW WINDOW */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 min-h-[600px] flex justify-center items-center">
//           <DocumentPreview selectedDoc={selectedDoc} />
//         </div>
//       </div>
//     </div>
//   );
// }

// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// export default function Documents() {
//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   // Date Range
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   // Fetch API Function
//   async function fetchDocs() {
//     try {
//       setLoading(true);

//       let url = "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

//       // If date range selected → send query params
//       if (startDate && endDate) {
//         url += `?start=${startDate}&end=${endDate}`;
//       }

//       const res = await fetch(url);
//       const data = await res.json();
//       setDocuments(data);
//     } catch (error) {
//       console.error("Error fetching docs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Load all docs on first render
//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   // Trigger when date range changes
//   useEffect(() => {
//     if (startDate && endDate) {
//       fetchDocs();
//     }
//   }, [startDate, endDate]);

//   return (
//     <div className="text-white p-4">
//       {/* TOP BUTTON GROUP */}
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

//       {/* MAIN 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">
//         {/* LEFT TABLE SECTION */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700">
//           {/* Date Range Filter */}
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
//               onClick={() => {
//                 setStartDate("");
//                 setEndDate("");
//                 fetchDocs();
//               }}
//               className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
//             >
//               Reset
//             </button>
//           </div>

//           {/* Document Table Component */}
//           <DocumentTable
//             documents={documents}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW PANEL */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 min-h-[600px] flex justify-center items-center">
//           <DocumentPreview selectedDoc={selectedDoc} />
//         </div>
//       </div>
//     </div>
//   );
// }


// import { useEffect, useState } from "react";
// import DocumentTable from "../components/DocumentTable";
// import DocumentPreview from "../components/DocumentPreview";

// export default function Documents() {
//   const [documents, setDocuments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedDoc, setSelectedDoc] = useState(null);

//   // Date Range
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");

//   // Fetch API Function
//   async function fetchDocs() {
//     try {
//       setLoading(true);

//       // Get token from localStorage
//       const token = localStorage.getItem("adminToken");

//       let url =
//         "http://127.0.0.1:5001/dmtransport-1/northamerica-northeast1/api/admin/fetchdocuments";

//       // If date range selected → send query params
//       if (startDate && endDate) {
//         url += `?start_date=${startDate}&end_date=${endDate}`;
//       }

//       const res = await fetch(url, {
//         method: "GET",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`, // 🔥 MAIN FIX
//         },
//       });

//       if (!res.ok) {
//         console.error("Unauthorized / Error:", res.status);
//         return;
//       }

//       const data = await res.json();
//       setDocuments(data.documents || []);

//     } catch (error) {
//       console.error("Error fetching docs:", error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Load all docs on first render
//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   // Trigger when date range changes
//   useEffect(() => {
//     if (startDate && endDate) {
//       fetchDocs();
//     }
//   }, [startDate, endDate]);

//   return (
//     <div className="text-white p-4">
//       {/* TOP BUTTON GROUP */}
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

//       {/* MAIN 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">
//         {/* LEFT TABLE SECTION */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700">
//           {/* Date Range Filter */}
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
//               onClick={() => {
//                 setStartDate("");
//                 setEndDate("");
//                 fetchDocs();
//               }}
//               className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
//             >
//               Reset
//             </button>
//           </div>

//           {/* Document Table */}
//           <DocumentTable
//             documents={documents}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW PANEL */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 min-h-[600px] flex justify-center items-center">
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

//   // last 60 days
//   past.setDate(today.getDate() - 60);

//   const format = (d) => d.toISOString().split("T")[0];

//   return {
//     start: format(past), // 60 days before
//     end: format(today),  // today
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

//       // send date range
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

//       // Sort documents by date → latest first
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

//   // FIRST LOAD → fetch with default last 60 days
//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   // If user changes date manually → re-fetch
//   useEffect(() => {
//     if (startDate && endDate) {
//       fetchDocs();
//     }
//   }, [startDate, endDate]);

//   // RESET → back to default last 60 days
//   function resetDates() {
//     const { start, end } = getDefaultDates();
//     setStartDate(start);
//     setEndDate(end);
//     fetchDocs();
//   }
// useEffect(() => {
//   console.log("SELECTED DOC UPDATED:", selectedDoc);
// }, [selectedDoc]);
//   return (
//     <div className="text-white p-4">

//       {/* TOP BUTTON GROUP */}
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

//       {/* MAIN 2 COLUMN LAYOUT */}
//       <div className="flex gap-4">

//         {/* LEFT TABLE */}
//         <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700">

//           {/* Date Range Filter */}
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

//           {/* Document Table */}
//           <DocumentTable
//             documents={documents}
//             loading={loading}
//             setSelectedDoc={setSelectedDoc}
//           />
//         </div>

//         {/* RIGHT PREVIEW PANEL */}
//         <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 
//      min-h-[600px] overflow-auto">
//   <DocumentPreview selectedDoc={selectedDoc} />
// </div>


//       </div>
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import DocumentTable from "../components/DocumentTable";
import DocumentPreview from "../components/DocumentPreview";

// Function: Last 60 Days Default Range
function getDefaultDates() {
  const today = new Date();
  const past = new Date();

  past.setDate(today.getDate() - 60);
  const format = (d) => d.toISOString().split("T")[0];

  return {
    start: format(past),
    end: format(today),
  };
}

export default function Documents() {
  const { start, end } = getDefaultDates();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);

  // Fetch API Function
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

      if (!res.ok) {
        console.error("Error fetching documents:", data);
        return;
      }

      const sorted = (data.documents || []).sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });

      setDocuments(sorted);

    } catch (error) {
      console.error("Error fetching docs:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchDocs();
    }
  }, [startDate, endDate]);

  function resetDates() {
    const { start, end } = getDefaultDates();
    setStartDate(start);
    setEndDate(end);
    fetchDocs();
  }

  useEffect(() => {
    console.log("Selected Doc:", selectedDoc);
  }, [selectedDoc]);

  return (
    <div className="text-white p-4">

      {/* TOP BUTTONS */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          "Pickup Doc",
          "Delivery Proof",
          "Load Image",
          "Fuel Receipt",
          "Stamp Paper",
          "Driver Expense",
          "DM Transport Trip Envelope",
          "DM Trans Inc Trip Envelope",
          "DM Transport City Worksheet",
          "Repair and Maintenance",
          "CTPAT",
        ].map((item) => (
          <button
            key={item}
            className="border border-gray-600 px-4 py-1 rounded-full hover:bg-gray-800 text-sm"
          >
            {item}
          </button>
        ))}
      </div>

      {/* 2 COLUMN LAYOUT */}
      <div className="flex gap-4">

        {/* LEFT TABLE - ONLY THIS WILL SCROLL */}
        <div className="flex-1 bg-[#161b22] p-4 rounded-lg border border-gray-700 
                        h-[80vh] overflow-y-auto">

          {/* Date Filter */}
          <div className="flex gap-3 items-center mb-4">
            <span className="text-gray-400 text-sm">Date Range:</span>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
            />

            <span className="text-gray-400">to</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#1d232a] px-3 py-1 rounded text-sm outline-none"
            />

            <button
              onClick={resetDates}
              className="ml-3 bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600"
            >
              Reset
            </button>
          </div>

          {/* TABLE */}
          <DocumentTable
            documents={documents}
            loading={loading}
            setSelectedDoc={setSelectedDoc}
          />
        </div>

        {/* RIGHT PREVIEW PANEL */}
        <div className="w-[35%] bg-[#161b22] p-4 rounded-lg border border-gray-700 
                        min-h-[600px] overflow-auto">
          <DocumentPreview selectedDoc={selectedDoc} />
        </div>

      </div>
    </div>
  );
}
