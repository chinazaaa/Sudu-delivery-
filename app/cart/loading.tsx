import { ItemRowSkeleton, Line } from "@/components/Skeleton";

/** The cart. */
export default function LoadingCart() {
  return (
    <div className="space-y-4 pb-28">
      <Line w="w-28" h="h-7" />
      {[0, 1].map((i) => (
        <ItemRowSkeleton key={i} />
      ))}
      <div className="card space-y-2">
        <Line w="w-full" h="h-3.5" />
        <Line w="w-2/3" h="h-3.5" />
      </div>
      <div className="sk h-14 rounded-full" />
    </div>
  );
}
