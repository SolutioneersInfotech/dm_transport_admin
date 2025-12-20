import Skeleton from "react-loading-skeleton";

export default function DocumentTableSkeleton({ rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-800">
          <td className="p-3">
            <Skeleton width={16} height={16} />
          </td>
          <td className="p-3">
            <Skeleton width={60} />
          </td>
          <td className="p-3">
            <Skeleton width={120} />
          </td>
          <td className="p-3">
            <Skeleton width={90} />
          </td>
          <td className="p-3">
            <Skeleton width={70} />
          </td>
          <td className="p-3">
            <Skeleton width={100} />
          </td>
        </tr>
      ))}
    </>
  );
}
