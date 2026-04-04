import Skeleton from "react-loading-skeleton";

const skeletonBase = "#243644";
const skeletonHighlight = "#2f4557";

function BubbleShimmer({ align = "left", width = "40%", height = 58 }) {
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

/** Shimmer for the conversation list area only (middle section). Use with fixed header + footer. */
export default function ConversationListShimmer() {
  return (
    <div className="flex-1 overflow-y-auto chat-list-scroll bg-[#0b141a] chat-bg-pattern p-4 space-y-6 min-h-0">
      <div className="flex justify-center">
        <Skeleton
          width={96}
          height={20}
          borderRadius={999}
          baseColor={skeletonBase}
          highlightColor={skeletonHighlight}
        />
      </div>
      <BubbleShimmer align="left" width={180} height={50} />
      <BubbleShimmer align="right" width={300} height={66} />
      <BubbleShimmer align="right" width={350} height={280} />
      <BubbleShimmer align="right" width={140} height={56} />
      <BubbleShimmer align="left" width={230} height={60} />
    </div>
  );
}
