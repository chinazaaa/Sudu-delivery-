import { CardSkeleton, Line } from "@/components/Skeleton";

/** My orders. Signed in it is a list of orders, signed out it is the PIN
 *  form, so the shapes stop at a heading and two cards rather than promising
 *  either one. */
export default function LoadingOrders() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <Line w="w-40" h="h-7" />
        <Line w="w-16" h="h-3.5" />
      </div>
      <CardSkeleton rows={3} />
      <CardSkeleton rows={2} />
    </div>
  );
}
