import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
import { T } from "@/lib/theme";

/**
 * Offered where a search found nothing.
 *
 * Somebody has just told us what they want, in their own words, and been
 * told we have not got it. There is no better moment to offer to go and find
 * it, and the website has said so for months while the app said nothing at
 * all and left them looking at an empty screen.
 */
export default function AskUs({ q = "" }: { q?: string }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/ask?q=${encodeURIComponent(q)}`)}
      style={{
        backgroundColor: T.paper,
        borderRadius: T.radius,
        padding: 16,
        gap: 6,
      }}
    >
      <Text style={{ fontWeight: "800", color: T.ink, fontSize: 16 }}>
        Still cannot find it?
      </Text>
      <Text style={{ color: T.muted, lineHeight: 21 }}>
        Tell us what you are looking for and we will find it, price it, and
        bring it to your block.
      </Text>
      <Text style={{ fontWeight: "800", color: T.brand, marginTop: 2 }}>
        Ask us to get it
      </Text>
    </Pressable>
  );
}
