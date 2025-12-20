import Skeleton from "react-loading-skeleton";

export default function ChatWindowSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ================= HEADER ================= */}
      <div className="px-4 py-3 border-b border-gray-700 bg-[#111827] flex items-center gap-3">
        <Skeleton circle width={40} height={40} />
        <div>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={10} style={{ marginTop: 4 }} />
        </div>
      </div>

      {/* ================= MESSAGE AREA ================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d1117]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[70%]">
              <Skeleton height={40} width={200 + (i % 3) * 40} />
            </div>
          </div>
        ))}
      </div>

      {/* ================= INPUT BAR ================= */}
      <div className="p-4 border-t border-gray-700 bg-[#111827] flex gap-2">
        <Skeleton width={32} height={32} />
        <Skeleton height={40} className="flex-1" />
        <Skeleton width={70} height={40} />
      </div>
    </div>
  );
}
