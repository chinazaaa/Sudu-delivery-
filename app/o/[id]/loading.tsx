import { CardSkeleton, Line } from "@/components/Skeleton";

/** One order: where it has got to, what is in it, what was paid. */
export default function LoadingOrder() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Line w="w-52" h="h-7" />
        <Line w="w-36" h="h-3.5" />
      </div>

      {/* The stage strip: ordering, ordered, on the way, delivered. */}
      <div className="card flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk h-2 flex-1 rounded-full" />
        ))}
      </div>

      <CardSkeleton rows={4} />
      <CardSkeleton rows={3} />
    </div>
  );
}
