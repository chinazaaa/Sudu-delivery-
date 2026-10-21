/**
 * The bit of a season you can actually see.
 *
 * Recolouring the palette dresses the shop, which is not the same as
 * decorating it: the first person to switch Halloween on looked for
 * pumpkins and found an orange button. So this is the pumpkins.
 *
 * Drawn over the page and deaf to the mouse. A decoration that can
 * swallow a tap on the order button is worse than no decoration, and a
 * fixed layer over a shop is exactly how that happens, so it takes no
 * pointer events at all and stays below every bar, sheet and modal.
 *
 * It also stops moving for anybody who has asked their phone to stop
 * things moving. Drift like this is the common trigger for motion
 * sickness, and the CSS honours that setting rather than overriding it.
 */
export default function SeasonDecor({ season }: { season: string }) {
  if (season !== "halloween") return null;

  // Spread by hand rather than at random: a random layout reshuffles on
  // every render and puts two pumpkins on top of each other often enough
  // to look like a bug.
  // Sizes are deliberately large. At twenty-four pixels and a third
  // opacity the whole layer read as dust on the screen rather than as
  // decoration, so these are the size of a thumb.
  const floaters = [
    { art: "🎃", left: "3%", delay: "0s", drift: "24s", size: "54px" },
    { art: "🦇", left: "17%", delay: "-6s", drift: "19s", size: "40px" },
    { art: "👻", left: "31%", delay: "-11s", drift: "27s", size: "48px" },
    { art: "🎃", left: "45%", delay: "-3s", drift: "21s", size: "38px" },
    { art: "🕸️", left: "57%", delay: "-20s", drift: "26s", size: "44px" },
    { art: "🦇", left: "70%", delay: "-14s", drift: "23s", size: "46px" },
    { art: "👻", left: "82%", delay: "-8s", drift: "20s", size: "40px" },
    { art: "🎃", left: "93%", delay: "-17s", drift: "18s", size: "52px" },
  ];

  return (
    <div aria-hidden className="season-decor">
      {floaters.map((one, at) => (
        <span
          key={at}
          className="season-float"
          style={{
            left: one.left,
            fontSize: one.size,
            animationDelay: one.delay,
            animationDuration: one.drift,
          }}
        >
          {one.art}
        </span>
      ))}
    </div>
  );
}
