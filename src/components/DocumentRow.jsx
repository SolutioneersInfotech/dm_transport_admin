// export default function DocumentRow({ item, onClick }) {
//   return (
//     <tr
//   className="border-b border-gray-800 hover:bg-[#1b222c] cursor-pointer"
//   onClick={() => {
//     console.log("ROW CLICKED:", item);
//     onClick();
//   }}
// >

//       <td className="p-3">
//         <input type="checkbox" className="w-4 h-4" />
//       </td>

//       {/* STATUS DOT */}
//       <td className="p-3">
//         <span
//           className={`w-3 h-3 inline-block rounded-full ${
//             item.status === "approved"
//               ? "bg-green-500"
//               : item.status === "pending"
//               ? "bg-blue-500"
//               : "bg-gray-500"
//           }`}
//         ></span>
//       </td>

//       <td className="p-3 flex items-center gap-2">
//        <img src={item.document_url} className="w-8 h-8 rounded" />

//         {item.uploadedBy}
//       </td>

//       <td className="p-3">{item.date}</td>

//       <td className="p-3">{item.type}</td>

//       <td className="p-3">{item.category}</td>
//     </tr>
//   );
// }

export default function DocumentRow({ item, onClick }) {
  console.log("ROW DATA:", item);

  return (
    <tr
      className="border-b border-gray-800 hover:bg-[#1b222c] cursor-pointer"
      onClick={() => onClick(item)}
    >
      <td className="p-3">
        <input type="checkbox" className="w-4 h-4" />
      </td>


      {/* Status */}
      <td className="p-3">
        <span
          className={`w-3 h-3 inline-block rounded-full ${
            item.status === "approved"
              ? "bg-green-500"
              : item.status === "pending"
              ? "bg-blue-500"
              : "bg-gray-500"
          }`}
        ></span>
      </td>

      {/* Driver Image + Name */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <img
            src={item.driver_image || "/default-user.png"}
            className="w-8 h-8 rounded-full object-cover"
          />

          <span>{item.driver_name}</span>
        </div>
      </td>

      {/* Date + Time */}
      <td className="p-3">
        {new Date(item.date).toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>

      <td className="p-3">{item.type}</td>
      <td className="p-3">{item.feature}</td>
    </tr>
  );
}
