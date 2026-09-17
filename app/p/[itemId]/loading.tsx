import { Line, Shape } from "@/components/Skeleton";

/** One product: the picture, the name and price, the choices, the way back. */
export default function LoadingProduct() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Line w="w-12" h="h-3.5" />
        <Line w="w-24" h="h-3.5" />
      </div>

      <div className="grid gap-6 sm:grid-cols-[320px_1fr]">
        <div className="overflow-hidden rounded-2xl bg-paper shadow-card">
          <Shape className="aspect-[4/3] rounded-none sm:aspect-square" />
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <Shape className="size-6 rounded-md" />
              <Line w="w-28" h="h-3.5" />
            </div>
            <Line w="w-3/4" h="h-9" className="mt-3" />
            <Line w="w-32" h="h-7" className="mt-3" />
            <Line w="w-full" h="h-3.5" className="mt-4" />
            <Line w="w-2/3" h="h-3.5" className="mt-2" />
          </div>

          <div className="sk h-14 rounded-full" />

          <div className="space-y-2 border-t border-black/5 pt-4">
            <Line w="w-56" h="h-3" />
            <Line w="w-40" h="h-3" />
          </div>
        </div>
      </div>

      <section className="space-y-3 pb-28">
        <Line w="w-52" h="h-6" />
        <div className="-mx-4 flex gap-3 overflow-hidden px-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-40 shrink-0 overflow-hidden rounded-2xl bg-paper shadow-card"
            >
              <Shape className="h-28 rounded-none" />
              <div className="space-y-2 p-3">
                <Line w="w-24" h="h-4" />
                <Line w="w-16" h="h-3" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
