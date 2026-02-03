import Skeleton from "react-loading-skeleton";

export default function DocumentTableSkeleton({
  rows = 6,
  showFlag = false,
  compact = false,
  responsive = false,
}) {
  const cellClass = compact ? "px-1 sm:px-2 py-1.5" : "p-3";
  const dateCellClass = `${cellClass}${responsive ? " hidden md:table-cell" : ""}`;
  const typeCellClass = `${cellClass}${responsive ? " hidden sm:table-cell" : ""}`;

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-800">
          <td className={`${cellClass} w-10 sm:w-12`}>
            <Skeleton width={14} height={14} />
          </td>
          <td className={cellClass}>
            <Skeleton circle width={10} height={10} />
          </td>
          {showFlag && (
            <td className={cellClass}>
              <Skeleton width={12} height={12} />
            </td>
          )}
          <td className={cellClass}>
            <div className="flex items-center gap-2">
              <Skeleton circle width={24} height={24} />
              <Skeleton className="h-3 w-full" />
            </div>
          </td>
          <td className={dateCellClass}>
            <Skeleton className="h-3 w-full" />
          </td>
          <td className={typeCellClass}>
            <Skeleton className="h-3 w-full" />
          </td>
          <td className={cellClass}>
            <Skeleton className="h-3 w-full" />
          </td>
        </tr>
      ))}
    </>
  );
}
