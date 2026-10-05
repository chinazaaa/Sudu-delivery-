/**
 * The band at the top of anything Secret Santa.
 *
 * The rest of the shop is orange on cream and should stay that way: it is a
 * delivery service and it is the same every week. This is once a year, it is
 * the one thing here people will send to a group chat for fun rather than
 * because they are hungry, and a plain form with a heading on it does not
 * get sent anywhere.
 *
 * Deep green rather than red, with the orange kept for the things you press.
 * Red on orange fights, and the buttons have to stay the loudest thing on
 * the page or nobody joins anything.
 *
 * The snow is two layers of dots at different sizes and opacities, which
 * reads as depth without a single image to load. No animation: this sits
 * behind text somebody is reading on a bus.
 */
export default function SantaHero({
  kicker,
  title,
  chips = [],
}: {
  kicker: string;
  title: string;
  chips?: string[];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl px-6 py-8 text-white shadow-card"
      style={{
        background:
          "radial-gradient(120% 140% at 15% 0%, #1b6b4a 0%, #0f4a33 45%, #0a3425 100%)",
      }}
    >
      {/* Snow, far and near. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #fff 1px, transparent 1.6px), radial-gradient(circle at 70% 60%, #fff 1.6px, transparent 2.2px)",
          backgroundSize: "70px 70px, 110px 110px",
        }}
      />
      {/* A warm glow in the corner, so the green does not read as cold. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,90,31,0.55) 0%, rgba(255,90,31,0) 70%)",
        }}
      />

      <div className="relative">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white/75">
          <Sprig />
          {kicker}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
          {title}
        </h1>

        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((one) => (
              <span
                key={one}
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm"
              >
                {one}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A sprig of holly, small enough to read as punctuation. */
function Sprig() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {/* Two leaves and three berries. Any more detail than this is a
        * smudge at the size it is actually printed. */}
      <path
        d="M11 5C8 5 5 7.5 5 11c3.5 0 6-2.5 6-6Z"
        className="fill-emerald-300"
      />
      <path
        d="M12 7c0 3.5 2.5 6 6 6 0-3.5-2.5-6-6-6Z"
        className="fill-emerald-400"
      />
      <circle cx="9" cy="15" r="2.1" className="fill-rose-400" />
      <circle cx="13.2" cy="16.6" r="2.1" className="fill-rose-500" />
      <circle cx="10.8" cy="19" r="2.1" className="fill-rose-400" />
    </svg>
  );
}
