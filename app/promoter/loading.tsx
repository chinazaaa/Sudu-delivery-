import { CardSkeleton, Line } from "@/components/Skeleton";

/** The promoter portal: what they are owed, and who still has not paid. */
export default function LoadingPromoter() {
  return (
    <div className="space-y-4">
      <Line w="w-44" h="h-7" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card space-y-2">
            <Line w="w-20" h="h-3" />
            <Line w="w-28" h="h-6" />
          </div>
        ))}
      </div>
      <CardSkeleton rows={3} />
      <CardSkeleton rows={2} />
    </div>
  );
}
