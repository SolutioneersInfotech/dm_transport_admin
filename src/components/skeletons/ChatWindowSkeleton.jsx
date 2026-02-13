import Skeleton from "react-loading-skeleton";

const skeletonBase = "#243644";
const skeletonHighlight = "#2f4557";

function BubbleSkeleton({ align = "left", width = "40%", height = 58 }) {
  const isRight = align === "right";

  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] ${isRight ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <Skeleton
          width={width}
          height={height}
          borderRadius={18}
          baseColor={skeletonBase}
          highlightColor={skeletonHighlight}
        />
        <Skeleton
          width={64}
          height={10}
          borderRadius={999}
          baseColor={skeletonBase}
          highlightColor={skeletonHighlight}
        />
      </div>
    </div>
  );
}

export default function ChatWindowSkeleton() {
  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-[#0b141a]">
      <div className="px-4 py-3 border-b border-[#2c3e52] bg-[#1c2530] flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton
            circle
            width={40}
            height={40}
            baseColor={skeletonBase}
            highlightColor={skeletonHighlight}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton width="62%" height={14} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
            <Skeleton width="46%" height={11} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Skeleton circle width={18} height={18} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
          <Skeleton circle width={18} height={18} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
          <Skeleton width={92} height={36} borderRadius={10} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto chat-list-scroll bg-[#0b141a] chat-bg-pattern p-4 space-y-6">
        <div className="flex justify-center">
          <Skeleton width={96} height={20} borderRadius={999} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
        </div>

        <BubbleSkeleton align="left" width={180} height={50} />
        <BubbleSkeleton align="right" width={300} height={66} />
        <BubbleSkeleton align="right" width={350} height={280} />
        <BubbleSkeleton align="right" width={140} height={56} />
        <BubbleSkeleton align="left" width={230} height={60} />
      </div>

      <div className="p-3 border-t border-[#2c3e52] bg-[#1c2530] flex items-end gap-2">
        <Skeleton circle width={28} height={28} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
        <Skeleton
          className="flex-1"
          height={48}
          borderRadius={999}
          baseColor={skeletonBase}
          highlightColor={skeletonHighlight}
        />
        <Skeleton circle width={44} height={44} baseColor={skeletonBase} highlightColor={skeletonHighlight} />
      </div>
    </div>
  );
}
