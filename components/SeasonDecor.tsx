/**
 * The bit of a season you can actually see.
 *
 * Recolouring the palette dresses the shop, which is not the same as
 * decorating it: the first person to switch Halloween on looked for
 * pumpkins and found an orange button. So this is the pumpkins.
 *
 * Drawn behind everything and deaf to the mouse. A decoration that can
 * swallow a tap on the order button is worse than no decoration, and a
 * fixed layer over a shop is exactly how that happens, so it takes no
 * pointer events and sits under every card on the page.
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
  const floaters = [
    { art: "🎃", left: "4%", delay: "0s", drift: "22s", size: "34px" },
    { art: "🦇", left: "18%", delay: "-6s", drift: "17s", size: "26px" },
    { art: "👻", left: "33%", delay: "-11s", drift: "25s", size: "30px" },
    { art: "🎃", left: "49%", delay: "-3s", drift: "19s", size: "24px" },
    { art: "🦇", left: "64%", delay: "-14s", drift: "23s", size: "30px" },
    { art: "🕸️", left: "79%", delay: "-8s", drift: "21s", size: "28px" },
    { art: "🎃", left: "91%", delay: "-17s", drift: "18s", size: "32px" },
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
