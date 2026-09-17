import { CardSkeleton, Line } from "@/components/Skeleton";

/** Admin, whichever page of it. These read more than the customer pages do,
 *  so they are the ones most worth not leaving blank. */
export default function LoadingAdmin() {
  return (
    <div className="space-y-4">
      <Line w="w-40" h="h-7" />
      <CardSkeleton rows={3} />
      <CardSkeleton rows={4} />
      <CardSkeleton rows={2} />
    </div>
  );
}
