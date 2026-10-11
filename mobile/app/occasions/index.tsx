import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { api, naira } from "@/lib/api";
import { T } from "@/lib/theme";
import { Display, Ticket } from "@/components/ui";

type Row = {
  slug: string;
  name: string;
  blurb: string;
  boxes: number;
  from: number | null;
  happensAt: string | null;
  whenWord: string;
  /** The shelf's cover, as a PNG on an absolute address. Empty where the
   *  shop has not drawn one. */
  image?: string;
};

/**
 * Food somebody has already packed.
 *
 * A price on every card, because that is the whole pitch. "Games night" is
 * a category and categories sell nothing; "Games night, three boxes from
 * ₦32,900 with delivery in it" is an offer, and the difference is whether a
 * thumb stops.
 */
export default function OccasionsScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .occasions()
      .then((data) => setRows(data.occasions))
      .catch((problem) => setError(problem instanceof Error ? problem.message : "Could not load."));
  }, []);

  if (error !== "") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: T.muted, textAlign: "center" }}>{error}</Text>
      </View>
    );
  }

  if (!rows) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={T.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: T.shell }}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
    >
      <View>
        <Display size={34}>Food for a room full of people</Display>
        <Text style={{ marginTop: 4, color: T.muted }}>
          Already worked out. One price with delivery in it, and nothing to
          decide but when you want it.
        </Text>
      </View>

      {rows.length === 0 && (
        <Text style={{ color: T.muted }}>Nothing is packed just now.</Text>
      )}

      {rows.map((row) => (
        <Pressable
          key={row.slug}
          onPress={() => router.push(`/occasions/${row.slug}` as never)}
          style={{
            backgroundColor: T.paper,
            borderRadius: T.radius,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            // Every card in the app carries the 2px Ink rule, so the border
            // can no longer be what marks a timed one out: it said "urgent"
            // by leaving the standing ones with no card at all. The date in
            // Tomato above the name is what says it now.
            borderWidth: 2,
            borderColor: row.happensAt ? "rgba(255,90,31,0.4)" : "transparent",
          }}
        >
          {(row.image ?? "") !== "" && (
            <Image
              source={{ uri: row.image }}
              style={{ width: 64, height: 64, borderRadius: 12 }}
              resizeMode="cover"
            />
          )}
          <View style={{ flex: 1 }}>
            {row.happensAt && (
              <View style={{ marginBottom: 2 }}>
                <Ticket colour={T.brandDark}>
                  {row.whenWord} {whenLabel(row.happensAt)}
                </Ticket>
              </View>
            )}
            <Display size={24}>{row.name}</Display>
            {row.blurb !== "" && (
              <Text style={{ color: T.muted, marginTop: 2 }}>{row.blurb}</Text>
            )}
            {row.from !== null && (
              <Text style={{ marginTop: 8, fontWeight: "700", color: T.brandDark }}>
                {row.boxes === 1 ? "One box" : `${row.boxes} boxes`} from {naira(row.from)}
                <Text style={{ fontWeight: "600" }}> · delivery in it</Text>
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={T.muted} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** "4:30 pm, Sun 11 Oct", in Lagos, from an instant. */
function whenLabel(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return at.toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
