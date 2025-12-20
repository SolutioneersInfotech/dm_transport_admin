import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function SkeletonLoader({ count = 6 }) {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-[#161b22]"
        >
          {/* Avatar */}
          <Skeleton circle width={48} height={48} />

          {/* Name + last message */}
          <div className="flex-1">
            <Skeleton width="35%" height={16} />
            <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
          </div>

          {/* Time */}
          <Skeleton width={30} height={12} />
        </div>
      ))}
    </div>
  );
}
