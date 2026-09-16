export default function LoadingHome() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-14 rounded-2xl bg-black/[0.06]" />
      <div className="h-14 rounded-xl bg-black/[0.06]" />
      <div className="h-64 rounded-2xl bg-black/[0.06] sm:h-80" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-56 rounded-2xl bg-black/[0.06]" />
        ))}
      </div>
    </div>
  );
}
