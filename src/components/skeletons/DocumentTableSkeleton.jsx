import Skeleton from "react-loading-skeleton";

export default function DocumentTableSkeleton({
  rows = 6,
  showFlag = false,
  compact = false,
  responsive = false,
  rowHeightClass = "h-9",
}) {
  const cellClass = compact ? "px-1 sm:px-2 py-1.5" : "p-3";
  const dateCellClass = `${cellClass}${responsive ? " hidden md:table-cell" : ""}`;
  const typeCellClass = `${cellClass}${responsive ? " hidden sm:table-cell" : ""}`;

  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className={`border-b border-gray-800 ${rowHeightClass}`}>
          <td className={`${cellClass} w-10 sm:w-12`}>
            <div className="h-3 w-3 sm:h-3.5 sm:w-3.5">
              <Skeleton className="h-full w-full" />
            </div>
          </td>
          <td className={cellClass}>
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2">
              <Skeleton circle className="h-full w-full" />
            </div>
          </td>
          {showFlag && (
            <td className={cellClass}>
              <div className="h-3 w-3 sm:h-3.5 sm:w-3.5">
                <Skeleton className="h-full w-full" />
              </div>
            </td>
          )}
          <td className={cellClass}>
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 sm:h-6 sm:w-6">
                <Skeleton circle className="h-full w-full" />
              </div>
              <Skeleton height={14} width={120} />
            </div>
          </td>
          <td className={dateCellClass}>
            <Skeleton height={14} width="50%" />
          </td>
          <td className={typeCellClass}>
            <Skeleton height={14} width="50%" />
          </td>
          <td className={cellClass}>
            <Skeleton height={16} width="2ch" />
          </td>
        </tr>
      ))}
    </>
  );
}
