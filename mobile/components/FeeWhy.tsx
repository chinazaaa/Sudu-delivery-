import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { naira } from "@/lib/api";
import { T } from "@/lib/theme";

/**
 * Why the delivery line says what it says.
 *
 * The website has had this since the container ladder went in and the app
 * never did: it showed a number and left the customer to work out why four
 * items cost more than three. A fee nobody can account for reads as a fee
 * that was made up, and the one thing a checkout must never look is
 * arbitrary.
 *
 * Shut by default. Somebody who is not asking the question should not have
 * to read the answer.
 */
export default function FeeWhy({
  rows,
  here,
  extra = null,
  total = null,
  note,
}: {
  /** The whole ladder, so the rung theirs landed on has something to be
   *  read against. A rung on its own explains nothing. */
  rows: { label: string; fee: number }[];
  /** Which rung is theirs, or -1 for none. An empty cart has not landed
   *  anywhere yet. */
  here: number;
  /** A charge that is not part of the ladder, on its own line under it.
   *  Folding it into a rung would make the ladder itself look wrong. */
  extra?: { label: string; fee: number } | null;
  /** The sum, where the rows are parts of one fee rather than rungs one of
   *  which is theirs. A market trip and a kitchen run are two errands added
   *  together, and two numbers with no total under them is the question
   *  half answered. */
  total?: { label: string; fee: number } | null;
  note: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginTop: 2 }}>
      <Pressable onPress={() => setOpen(!open)} hitSlop={8}>
        <Text
          style={{
            color: T.muted,
            fontSize: 13,
            textDecorationLine: "underline",
          }}
        >
          Why this much?
        </Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 8, gap: 6 }}>
          <View style={{ backgroundColor: T.tint, borderRadius: 14, padding: 12, gap: 4 }}>
            {rows.map((row, index) => (
              <View
                key={row.label}
                style={{ flexDirection: "row", justifyContent: "space-between" }}
              >
                <Text
                  style={{
                    color: index === here ? T.ink : T.muted,
                    fontWeight: index === here ? "800" : "400",
                    fontSize: 13,
                  }}
                >
                  {row.label}
                  {index === here ? " · yours" : ""}
                </Text>
                <Text
                  style={{
                    color: index === here ? T.ink : T.muted,
                    fontWeight: index === here ? "800" : "400",
                    fontSize: 13,
                  }}
                >
                  {naira(row.fee)}
                </Text>
              </View>
            ))}

            {total && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: T.line,
                  paddingTop: 4,
                  marginTop: 2,
                }}
              >
                <Text style={{ color: T.ink, fontWeight: "800", fontSize: 13 }}>
                  {total.label}
                </Text>
                <Text style={{ color: T.ink, fontWeight: "800", fontSize: 13 }}>
                  {naira(total.fee)}
                </Text>
              </View>
            )}

            {extra && (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: T.line,
                  paddingTop: 4,
                  marginTop: 2,
                }}
              >
                <Text style={{ color: T.ink, fontWeight: "800", fontSize: 13 }}>
                  {extra.label}
                </Text>
                <Text style={{ color: T.ink, fontWeight: "800", fontSize: 13 }}>
                  +{naira(extra.fee)}
                </Text>
              </View>
            )}
          </View>

          <Text style={{ color: T.muted, fontSize: 13 }}>{note}</Text>
        </View>
      )}
    </View>
  );
}
