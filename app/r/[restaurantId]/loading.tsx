export default function LoadingRestaurant() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="-mx-4 h-52 bg-black/[0.06] sm:mx-0 sm:h-64 sm:rounded-2xl" />
      <div className="h-14 rounded-2xl bg-black/[0.06]" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-black/[0.06]" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-black/[0.06]" />
        ))}
      </div>
    </div>
  );
}
