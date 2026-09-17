import { CardSkeleton, Line } from "@/components/Skeleton";

/** Order again: the last order being rebuilt at today's prices. */
export default function LoadingReorder() {
  return (
    <div className="space-y-4">
      <Line w="w-44" h="h-7" />
      <CardSkeleton rows={4} />
    </div>
  );
}
