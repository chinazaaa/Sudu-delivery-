import { Text, View } from "react-native";
import { F } from "@/lib/theme";
import type { Delivery } from "@/lib/shop-days";

/** Green when it delivers today, amber with the day when it does not. */
export default function DeliveryPill({ day }: { day?: Delivery }) {
  if (!day || !day.said) return null;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        paddingHorizontal: 9,
        paddingVertical: 3,
        backgroundColor: day.today ? "#dcfce7" : "#fef3c7",
      }}
    >
      <Text
        style={{
          fontFamily: F.bodySemi,
          fontSize: 12,
          color: day.today ? "#166534" : "#92400e",
        }}
      >
        {day.said}
      </Text>
    </View>
  );
}
