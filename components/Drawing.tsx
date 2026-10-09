/**
 * The thirteen drawings.
 *
 * Flat, a 3px Ink outline, and the shop's own colours. They stand in for a
 * photograph until there is one, on a product card, a kitchen tile, a
 * collection card and the hero.
 *
 * Never used to show a particular restaurant's real dish: a drawing of a
 * chicken beside KFC's name is the shop saying "chicken", not a picture of
 * what KFC will hand over, and the difference matters because we are not
 * affiliated with any of them. The same reason the tiles wear our colours
 * rather than theirs.
 *
 * Traced off the design board rather than drawn again here, so they are the
 * same drawings on the site, in the app and on a flyer.
 */

export type DrawingName =
  | "chicken"
  | "pizza"
  | "burger"
  | "bowl"
  | "drink"
  | "doughnut"
  | "shawarma"
  | "fish"
  | "cake"
  | "box"
  | "parcel"
  | "car"
  | "skincare";

/** Every one of them, in the order the board lays them out. */
export const DRAWINGS: DrawingName[] = [
  "chicken",
  "pizza",
  "burger",
  "bowl",
  "drink",
  "doughnut",
  "shawarma",
  "fish",
  "cake",
  "box",
  "parcel",
  "car",
  "skincare",
];

/**
 * One drawing, at whatever size the thing holding it wants.
 *
 * `size` is a CSS length rather than a number, so a card can hand it 100%
 * and let its own box decide.
 */
export default function Drawing({
  name,
  size = "100%",
  className = "",
  label = "",
}: {
  name: DrawingName;
  size?: string | number;
  className?: string;
  /** What it is, for anybody who cannot see it. Empty hides it from a
   *  screen reader, which is right when the name is already beside it. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={label === "" ? undefined : "img"}
      aria-label={label === "" ? undefined : label}
      aria-hidden={label === "" ? true : undefined}
    >
      {BODY[name]}
    </svg>
  );
}

const BODY: Record<DrawingName, React.ReactNode> = {
  chicken: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M52 70 28 94" strokeWidth="16"/><path d="M52 70 28 94" stroke="#FFF8EC" strokeWidth="9"/><circle cx="23" cy="90" r="7" fill="#FFF8EC"/><circle cx="31" cy="99" r="7" fill="#FFF8EC"/><path d="M88 28c13 13 12 34-2 46-12 11-30 11-40 1-10-10-8-28 4-40 12-12 28-17 38-7z" fill="#E9A23B"/><path d="M66 40l5 3M80 50l5 2M62 58l3 5M78 66l4 3" fill="none"/></g>
    </>
  ),
  pizza: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M18 36Q60 16 102 36L60 106Z" fill="#FFD23F"/><path d="M18 36Q60 16 102 36L97 46Q60 28 23 46Z" fill="#E9A23B"/><circle cx="50" cy="56" r="8" fill="#E5321D"/><circle cx="72" cy="54" r="7" fill="#E5321D"/><circle cx="60" cy="76" r="7" fill="#E5321D"/><path d="M66 66c4-4 9-3 10 0-3 4-8 4-10 0z" fill="#3FA34D"/></g>
    </>
  ),
  burger: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M16 62c6 7 10-1 16 5s10-1 16 5 10-1 16 5 10-1 16 5 10-1 16 5v-10H16z" fill="#3FA34D"/><rect x="18" y="70" width="84" height="15" rx="7" fill="#6B3A1E"/><path d="M20 68h80l-10 11-8-6-10 8-10-8-10 8-10-8-8 6z" fill="#FFD23F"/><path d="M20 60c0-22 18-36 40-36s40 14 40 36z" fill="#E9A23B"/><path d="M44 38l3 2M60 34l3 1M74 40l3 2M52 48l3 1M68 48l3 1" fill="none" stroke="#FFF8EC"/><path d="M22 88h76v4a10 10 0 0 1-10 10H32a10 10 0 0 1-10-10z" fill="#E9A23B"/></g>
    </>
  ),
  bowl: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M22 60c4-18 20-30 38-30s34 12 38 30z" fill="#E5631D"/><path d="M40 46l3 2M56 40l3 1M70 46l3 2M48 54l3 1M64 54l3 1M80 54l2 2" fill="none" stroke="#FFF8EC"/><path d="M68 34c8-6 18-2 18 6s-10 10-16 6z" fill="#B5652A"/><path d="M14 58h92c0 26-20 44-46 44S14 84 14 58z" fill="#FFF8EC"/><path d="M20 72h80" stroke="#E5321D" strokeWidth="6"/></g>
    </>
  ),
  drink: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M34 40h52l-7 62H41z" fill="#E5321D"/><path d="M37 62h46l-2 18H39z" fill="#FFD23F"/><path d="M66 30 74 10h12" fill="none" strokeWidth="5"/><rect x="28" y="30" width="64" height="12" rx="4" fill="#15110E"/></g>
    </>
  ),
  doughnut: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><circle cx="60" cy="62" r="40" fill="#E9A23B"/><path d="M28 56a32 32 0 0 1 64 0c0 6-4 8-7 6s-5 6-9 4-5 6-9 3-6 5-10 2-5 5-9 1-6 3-9-1c-4 2-11 2-11-15z" fill="#E5321D"/><circle cx="60" cy="58" r="12" fill="#F2EFE9"/><path d="M42 42l4-3M74 38l5 2M84 52l2 5M38 58l-1 5M58 34h5M70 70l4 2M46 70l-3 3" fill="none" stroke="#FFD23F" strokeWidth="4"/></g>
    </>
  ),
  shawarma: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M40 104 24 40c16-16 56-16 72 0L80 104z" fill="#F4E3C3"/><path d="M26 42c6-14 62-14 68 0-7 6-14 1-20 6s-14 0-20 4-14-1-28-10z" fill="#3FA34D"/><circle cx="46" cy="40" r="5" fill="#8A4B22"/><circle cx="72" cy="38" r="5" fill="#8A4B22"/><path d="M33 74h54l-7 30H40z" fill="#15110E"/><path d="M38 84h44M40 94h40" stroke="#FFD23F" strokeWidth="4"/></g>
    </>
  ),
  fish: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M16 60c14-22 50-26 72-8l16-12v40l-16-12c-22 18-58 14-72-8z" fill="#5BA4CF"/><path d="M52 46c4 8 4 20 0 28" fill="none"/><circle cx="32" cy="56" r="4" fill="#15110E"/><path d="M60 40c6-6 14-6 18 0z" fill="#FFD23F"/></g>
    </>
  ),
  cake: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><rect x="22" y="50" width="76" height="50" rx="4" fill="#F4E3C3"/><rect x="22" y="70" width="76" height="9" fill="#E5321D"/><path d="M20 52c0-9 6-14 12-14h56c6 0 12 5 12 14z" fill="#FFF8EC"/><path d="M36 52v8M60 52v10M84 52v6" stroke="#FFF8EC" strokeWidth="6"/><circle cx="60" cy="30" r="8" fill="#E5321D"/><path d="M60 22c2-6 6-8 10-8" fill="none"/></g>
    </>
  ),
  box: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><rect x="20" y="50" width="80" height="52" rx="4" fill="#E5321D"/><rect x="14" y="38" width="92" height="16" rx="4" fill="#E5321D"/><rect x="54" y="38" width="12" height="64" fill="#FFD23F"/><path d="M60 38c-10-16-28-14-24-4 3 7 16 6 24 4zM60 38c10-16 28-14 24-4-3 7-16 6-24 4z" fill="#FFD23F"/></g>
    </>
  ),
  parcel: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M20 44 60 26 100 44 60 62z" fill="#DDA36A"/><path d="M20 44v46l40 18V62z" fill="#C98B4E"/><path d="M100 44v46l-40 18V62z" fill="#B57A40"/><path d="M40 35 80 53v16" fill="none" stroke="#FFD23F" strokeWidth="7"/></g>
    </>
  ),
  car: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M4 64h14M2 74h12M8 54h12" fill="none" stroke="#E5321D" strokeWidth="4"/><path d="M22 86V58c0-6 4-10 10-10h46l16 14h12c4 0 8 4 8 8v16z" fill="#E5321D"/><path d="M68 52h10l13 11H68z" fill="#BFE3F5"/><path d="M30 64h30" stroke="#FFD23F" strokeWidth="5"/><circle cx="44" cy="88" r="10" fill="#15110E"/><circle cx="44" cy="88" r="3" fill="#F2EFE9"/><circle cx="96" cy="88" r="10" fill="#15110E"/><circle cx="96" cy="88" r="3" fill="#F2EFE9"/></g>
    </>
  ),
  skincare: (
    <>
<g stroke="#15110E" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M60 30V20h18" fill="none" strokeWidth="5"/><rect x="52" y="30" width="16" height="14" fill="#FFF8EC"/><rect x="38" y="44" width="44" height="60" rx="12" fill="#3FA34D"/><rect x="46" y="62" width="28" height="24" rx="4" fill="#FFF8EC"/><path d="M52 70h16M52 78h10" fill="none" strokeWidth="2.5"/></g>
    </>
  ),
};
