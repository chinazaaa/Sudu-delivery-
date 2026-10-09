import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { countdown } from "@/lib/api";
import { F, T } from "@/lib/theme";

/**
 * How long is left to order for the run at the top of the page.
 *
 * The same deadline the website shows, in the same place, for the same
 * reason: the page says when food can arrive, and a time you can still make
 * is what turns that from a fact into a reason to order now.
 *
 * It waits for the first tick rather than drawing a number straight away,
 * so nothing jumps, and it says nothing at all unless the cut-off is close.
 * A countdown reading a day and a half is a timetable, and a deadline
 * nobody can miss is not a deadline.
 */
export default function CutOff({
  at,
  within = 2 * 60 * 60 * 1000,
  tone = "dark",
}: {
  at: string;
  within?: number;
  /** "light" where it is sitting on Ink, which is most of the time now. */
  tone?: "dark" | "light";
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const shut = new Date(at).getTime();
    if (!Number.isFinite(shut)) return;

    const tick = () => setLeft(shut - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [at]);

  if (left === null || left <= 0 || left > within) return null;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: tone === "light" ? T.volt : T.brand,
        }}
      />
      <Text
        style={{
          color: tone === "light" ? T.volt : T.brandDark,
          fontFamily: F.bodySemi,
          fontSize: 13,
        }}
      >
        Orders close in {countdown(left)}
      </Text>
    </View>
  );
}
