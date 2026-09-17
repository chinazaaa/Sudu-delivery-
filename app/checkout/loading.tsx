import { Line } from "@/components/Skeleton";

/** Checkout: which run, who you are, where it goes, what it costs. */
export default function LoadingCheckout() {
  return (
    <div className="space-y-4 pb-28">
      <Line w="w-36" h="h-7" />

      <div className="card space-y-3">
        <Line w="w-32" h="h-3.5" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span key={i} className="sk h-16 flex-1 rounded-xl" />
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Line w="w-24" h="h-3" />
            <span className="sk block h-12 rounded-xl" />
          </div>
        ))}
      </div>

      <div className="sk h-14 rounded-full" />
    </div>
  );
}
