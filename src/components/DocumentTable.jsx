

// import DocumentRow from "./DocumentRow";
// import Loader from "./Loader";

// export default function DocumentTable({ documents, loading, setSelectedDoc }) {
//   return (
//     <>
//       {/* SEARCH BAR */}
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
//       <table className="w-full text-left">
//         <thead>
//           <tr className="border-b border-gray-700 text-gray-400">
//             <th className="p-3">Select</th>
//             <th className="p-3">Status</th>
//             <th className="p-3">Uploaded By</th>
//             <th className="p-3">Date</th>
//             <th className="p-3">Type</th>
//             <th className="p-3">Category</th>
//           </tr>
//         </thead>

//         <tbody>
//           {loading ? (
//             <tr>
//               <td colSpan="6">
//                 <Loader />
//               </td>
//             </tr>
//           ) : documents.length === 0 ? (
//             <tr>
//               <td colSpan="6" className="text-center py-6 text-gray-400">
//                 No Documents Found
//               </td>
//             </tr>
//           ) : (
//             documents.map((doc) => (
//               <DocumentRow
//                 key={doc._id}
//                 item={doc}
//                 onClick={() => setSelectedDoc(doc)}
//               />
//             ))
//           )}
//         </tbody>
//       </table>

//       <p className="mt-5 text-sm text-gray-400">
//         Total Documents: {documents.length}
//       </p>
//     </>
//   );
// }

import DocumentRow from "./DocumentRow";
import Loader from "./Loader";

// GROUPING FUNCTION
function groupDocumentsByDate(documents) {
  const groups = {};

  documents.forEach((doc) => {
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
}

export default function DocumentTable({ documents, loading, setSelectedDoc }) {
  const grouped = groupDocumentsByDate(documents);

  return (
    <>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400">
            <th className="p-3">Select</th>
            <th className="p-3">Status</th>
            <th className="p-3">Uploaded By</th>
            <th className="p-3">Date</th>
            <th className="p-3">Type</th>
            <th className="p-3">Category</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan="6"><Loader /></td></tr>
          ) : (
            Object.keys(grouped).map((group) => (
              <>
                {/* STICKY GROUP HEADER */}
                <tr className="bg-[#0d1117] sticky top-0 z-20">
  <td colSpan="6" className="p-2 font-bold text-blue-400 text-center">
    {group}
  </td>
</tr>


                {grouped[group].map((doc) => (
                  <DocumentRow
                    key={doc.id}
                    item={doc}
                    onClick={() => setSelectedDoc(doc)}
                  />
                ))}
              </>
            ))
          )}
        </tbody>
      </table>

      <p className="mt-5 text-sm text-gray-400">
        Total Documents: {documents.length}
      </p>
    </>
  );
}



