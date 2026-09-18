import { ItemRowSkeleton, Line, Shape } from "@/components/Skeleton";

/** A restaurant: the banner with its name over it, the categories, the menu. */
export default function LoadingRestaurant() {
  return (
    <div className="space-y-5">
      <div className="relative -mx-4 h-52 overflow-hidden sm:mx-0 sm:h-64 sm:rounded-2xl">
        <Shape className="h-full rounded-none" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <span className="sk sk-dark size-14 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2 pb-1">
            <Line w="w-52" h="h-7" />
            <Line w="w-28" h="h-3.5" />
          </div>
        </div>
      </div>


      <div className="flex gap-2 overflow-hidden">
        {["w-20", "w-28", "w-24", "w-32"].map((w) => (
          <span key={w} className={`sk h-10 shrink-0 rounded-full ${w}`} />
        ))}
      </div>

      <div className="space-y-3 pb-28">
        {[0, 1, 2, 3, 4].map((i) => (
          <ItemRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
