import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, View } from "react-native";
import { SEASON_ART } from "@/lib/theme";

/**
 * The bit of a season you can actually see.
 *
 * Recolouring the palette dresses the shop, which is not the same as
 * decorating it: the first person to switch Halloween on looked for
 * pumpkins and found an orange button. So this is the pumpkins, and it is
 * the same handful the website floats down its pages.
 *
 * Drawn over the screen and deaf to the thumb. A decoration that can
 * swallow a tap on the order button is worse than no decoration, so the
 * layer takes no touches at all and sits under every bar and sheet.
 *
 * It also stops moving for anybody who has asked their phone to stop
 * things moving. Drift like this is the common trigger for motion
 * sickness, and that setting is an answer rather than a preference.
 */
export default function SeasonDecor({ season }: { season?: string }) {
  const art = SEASON_ART[String(season ?? "").trim().toLowerCase()];
  const [still, setStill] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((asked) => {
        if (alive) setStill(asked);
      })
      .catch(() => {
        // A phone that will not say is a phone we let drift, which is what
        // it did before there was anything to ask.
      });
    const watch = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (asked) => setStill(asked)
    );
    return () => {
      alive = false;
      watch.remove();
    };
  }, []);

  if (!art || art.length === 0) return null;

  /*
   * Spread by hand rather than at random.
   *
   * A random layout reshuffles on every render and puts two pumpkins on
   * top of each other often enough to look like a bug. Sizes are
   * deliberately large: at twenty-four pixels and a third opacity the
   * whole layer read as dust on the screen rather than as decoration.
   */
  const floaters = [
    { at: 0, left: "4%", delay: 0, drift: 24000, size: 48 },
    { at: 1, left: "22%", delay: 6000, drift: 19000, size: 36 },
    { at: 2, left: "40%", delay: 11000, drift: 27000, size: 42 },
    { at: 3, left: "58%", delay: 3000, drift: 21000, size: 38 },
    { at: 1, left: "74%", delay: 14000, drift: 23000, size: 40 },
    { at: 0, left: "90%", delay: 17000, drift: 18000, size: 46 },
  ];

  return (
    <View
      pointerEvents="none"
      style={{ ...StyleSheetAbsolute, overflow: "hidden" }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {floaters.map((one, index) => (
        <Floater
          key={index}
          art={art[one.at % art.length]}
          left={one.left}
          size={one.size}
          delay={one.delay}
          drift={one.drift}
          still={still}
        />
      ))}
    </View>
  );
}

const StyleSheetAbsolute = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

/**
 * One of them, falling slowly and starting part-way down.
 *
 * The delay is negative on the website, which CSS reads as "already this
 * far through". React Native has no such thing, so the same effect comes
 * from starting the value part-way along rather than waiting.
 */
function Floater({
  art,
  left,
  size,
  delay,
  drift,
  still,
}: {
  art: string;
  left: string;
  size: number;
  delay: number;
  drift: number;
  still: boolean;
}) {
  const startAt = (delay % drift) / drift;
  const along = useRef(new Animated.Value(startAt)).current;

  useEffect(() => {
    if (still) return;
    let stopped = false;

    // The rest of this one's first fall, then round and round. Done as two
    // because a plain loop would snap all six back to the top together on
    // the second pass and undo the spreading.
    const first = Animated.timing(along, {
      toValue: 1,
      duration: Math.max(1, drift * (1 - startAt)),
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const rest = Animated.loop(
      Animated.sequence([
        Animated.timing(along, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(along, {
          toValue: 1,
          duration: drift,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    first.start(({ finished }) => {
      if (finished && !stopped) rest.start();
    });

    return () => {
      stopped = true;
      first.stop();
      rest.stop();
    };
  }, [along, drift, startAt, still]);

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: left as unknown as number,
        fontSize: size,
        /*
         * Solid enough to be seen.
         *
         * This sat at 0.22, on the theory that something drifting over the
         * words should be faint. Over a cream page in daylight, a fifth of
         * a pumpkin is a smudge: the decorations read as dust on the screen
         * rather than as decoration, and a decoration nobody can see costs
         * the same as one nobody wanted. The website learnt this and went
         * to 0.9; the app was left behind, so Halloween was on the site and
         * barely on the phone.
         */
        opacity: 0.9,
        // A little shadow so a pale ghost still reads over a pale page,
        // the same as the website's.
        textShadowColor: "rgba(36, 22, 51, 0.35)",
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        transform: [
          {
            translateY: along.interpolate({
              inputRange: [0, 1],
              // Off the top to off the bottom of a tall phone, so nothing
              // appears or vanishes where somebody is looking.
              outputRange: [-80, 1000],
            }),
          },
        ],
      }}
    >
      {art}
    </Animated.Text>
  );
}
