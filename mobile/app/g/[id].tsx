import { useEffect } from "react";
import { ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { T } from "@/lib/theme";

/**
 * Somebody tapped a group link.
 *
 * sudu.store/g/fjgcuwm opens here rather than in a browser, which is the
 * whole point: the link arrives in a chat, and the person tapping it already
 * has the app. It hands the code to the Group tab and gets out of the way.
 *
 * The code is never used as a group id. It is a way in, and the server swaps
 * it for the real id the moment a seat is taken: passing a code to anything
 * that expects an id finds nothing, which on the website showed up as a join
 * popup that would not go away.
 */
export default function GroupLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace({ pathname: "/group", params: { code: String(id ?? "") } });
  }, [id, router]);

  return <ActivityIndicator color={T.brand} style={{ marginTop: 40 }} />;
}
