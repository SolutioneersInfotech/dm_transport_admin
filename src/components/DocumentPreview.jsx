// export default function DocumentPreview({ selectedDoc }) {
//   if (!selectedDoc)
//     return <h2 className="text-gray-400 text-lg">No Document Selected</h2>;

//   return (
//     <div className="text-left w-full">
//       <h2 className="text-xl font-semibold mb-4">Document Details</h2>

//       <p>
//         <b>Uploaded By:</b> {selectedDoc.uploadedBy}
//       </p>
//       <p>
//         <b>Date:</b> {selectedDoc.date}
//       </p>
//       <p>
//         <b>Type:</b> {selectedDoc.type}
//       </p>
//       <p>
//         <b>Category:</b> {selectedDoc.category}
//       </p>

//       <img
//         src={selectedDoc.image}
//         alt="Preview"
//         className="mt-4 w-full rounded"
//       />
//     </div>
//   );
// }


// export default function DocumentPreview({ selectedDoc }) {
//   if (!selectedDoc)
//     return <h2 className="text-gray-400 text-lg">No Document Selected</h2>;

//   const url = selectedDoc.document_url;

//   // extract clean URL before ?query
//   const cleanURL = url?.split("?")[0] || "";

//   // get extension
//   const ext = cleanURL.split(".").pop().toLowerCase();

//   const isPDF = ext === "pdf";
//   const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

//   return (
//     <div className="text-left w-full">
//       <h2 className="text-xl font-semibold mb-4">Document Details</h2>

//       <p><b>Uploaded By:</b> {selectedDoc.driver_name}</p>
//       <p><b>Date:</b> {new Date(selectedDoc.date).toLocaleDateString()}</p>
//       <p><b>Type:</b> {selectedDoc.type}</p>
//       <p><b>Category:</b> {selectedDoc.feature}</p>

//       {selectedDoc.note && <p><b>Note:</b> {selectedDoc.note}</p>}

//       <div className="mt-4 w-full">
//         {isImage && (
//           <img
//             src={url}
//             alt="Document Preview"
//             className="w-full rounded shadow"
//           />
//         )}

//         {isPDF && (
//           <iframe
//             src={url}
//             className="w-full h-[600px] border rounded"
//             title="PDF Preview"
//           ></iframe>
//         )}

//         {!isImage && !isPDF && (
//           <p className="text-gray-400">
//             Unable to preview this file type.{" "}
//             <a
//               href={url}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="text-blue-400 underline"
//             >
//               Open File
//             </a>
//           </p>
//         )}
//       </div>
//     </div>
//   );
// }


export default function DocumentPreview({ selectedDoc }) {
  if (!selectedDoc) {
    return null;
  }

  const url = selectedDoc.document_url;

  // remove query params to detect file extension
  const cleanURL = url?.split("?")[0];
  const ext = cleanURL?.split(".").pop().toLowerCase();

  const isPDF = ext === "pdf";
  const isImage = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

  return (
    <div className="text-left w-full h-full">
      <h2 className="text-xl font-semibold mb-4">Document Details</h2>

      <p><b>Uploaded By:</b> {selectedDoc.driver_name}</p>
      <p><b>Date:</b> {new Date(selectedDoc.date).toLocaleDateString()}</p>
      <p><b>Type:</b> {selectedDoc.type}</p>
      <p><b>Category:</b> {selectedDoc.feature}</p>
      {selectedDoc.note && <p><b>Note:</b> {selectedDoc.note}</p>}

      {/* PREVIEW AREA */}
      <div className="mt-4 w-full h-[70vh] rounded overflow-hidden bg-black/20 flex justify-center items-start">
        
        {/* IMAGE PREVIEW */}
        {isImage && (
          <img
            src={url}
            alt="Document Preview"
            className="max-h-full max-w-full object-contain"
          />
        )}

        {/* PDF PREVIEW (Google Docs Viewer) */}
        {isPDF && (
          <iframe
            src={`https://docs.google.com/viewer?url=${encodeURIComponent(
              url
            )}&embedded=true`}
            className="w-full h-full rounded"
            title="PDF Preview"
          ></iframe>
        )}

        {/* UNKNOWN FILE TYPE */}
        {!isImage && !isPDF && (
          <p className="text-gray-400 p-4">
            Unable to preview this file.
            <br />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Open File
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
