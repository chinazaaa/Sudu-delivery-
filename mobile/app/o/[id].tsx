import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { T } from "@/lib/theme";

/**
 * An order link, tapped from a message.
 *
 * The site says /o/1a2b3c and the app says /order/1a2b3c, and the lookup
 * takes either the short code or the long id, so this is only a change of
 * address.
 */
export default function OrderLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/order/${String(id ?? "")}`);
  }, [id, router]);

  return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;
}
