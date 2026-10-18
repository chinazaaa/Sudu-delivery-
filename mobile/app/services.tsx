import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useShop } from "@/lib/use-shop";
import { F, T } from "@/lib/theme";
import { Display } from "@/components/ui";

/**
 * The other half of the shop, named.
 *
 * Laundry, printing, a tailor, a repair. None of them is a shelf: there
 * is nothing to put in a basket and no price until somebody says what the
 * job is, so every one of them ends in a message to a person. There is
 * nothing for the app to do with that but say the thing exists and open
 * the page, which is why these are links and not screens.
 *
 * Worth a screen of its own all the same. Somebody who installed this app
 * to order dinner has no way of learning that the same shop will collect
 * their laundry, and a shop that does nine things while appearing to do
 * two is losing the other seven quietly.
 *
 * The list comes down with the menu rather than living here, so the day a
 * tenth is written it is in the app, instead of waiting on two stores to
 * approve a release that changes one array.
 */
export default function ServicesScreen() {
  const shop = useShop();
  const services = shop?.services ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: T.shell }}>
      <Stack.Screen options={{ title: "What else we do" }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        <View style={{ gap: 4 }}>
          <Display size={26}>What else we do</Display>
          <Text style={{ color: T.muted, lineHeight: 21 }}>
            None of these have a price until we know the job, so each one
            opens a page where you tell us what you need. We come back with
            a number, and nothing happens until you say yes.
          </Text>
        </View>

        {services.length === 0 ? (
          <Text style={{ color: T.muted }}>
            Nothing here just now. Pull down on the home screen to try again.
          </Text>
        ) : (
          services.map((one) => (
            <Pressable
              key={one.slug}
              onPress={() => void Linking.openURL(one.url)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: T.paper,
                borderWidth: 2,
                borderColor: T.ink,
                borderRadius: 16,
                padding: 14,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: F.bodyBold, color: T.ink, fontSize: 16 }}>
                  {one.title}
                </Text>
                <Text style={{ color: T.muted, lineHeight: 19 }}>{one.lead}</Text>
              </View>
              {/* Says it leaves the app, because a tap that silently opens a
                  browser is a tap somebody did not agree to. */}
              <Ionicons name="open-outline" size={20} color={T.brand} />
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
