import { Image, Text, View } from "react-native";

/**
 * A picture if there is one, and something deliberate if there is not.
 *
 * The website has drawn this fallback all along: a colour worked out from
 * the name and the first letter on top of it. The app drew an empty tinted
 * box instead, so the Sudu Shop shelf, where almost nothing has a
 * photograph, was a grid of blank rectangles. The same shelf on the website
 * looked finished.
 *
 * The same arithmetic as the web, so a given item is the same colour in both
 * places: add up the character codes and take the remainder. Stable, never
 * ugly, and obviously a placeholder to whoever is filling the menu in.
 *
 * A flat colour rather than the website's gradient, because a gradient in
 * React Native needs a native module, and a new build from Apple is a lot to
 * pay for a second colour nobody asked for.
 */
export default function Thumb({
  src,
  name,
  radius = 0,
  ratio = 4 / 3,
}: {
  src: string;
  name: string;
  radius?: number;
  ratio?: number;
}) {
  if (src !== "") {
    return (
      <Image
        source={{ uri: src }}
        style={{ width: "100%", aspectRatio: ratio, borderRadius: radius }}
      />
    );
  }

  const hue = [...name].reduce((total, ch) => total + ch.charCodeAt(0), 0) % 360;

  return (
    <View
      style={{
        width: "100%",
        aspectRatio: ratio,
        borderRadius: radius,
        backgroundColor: `hsl(${hue}, 70%, 88%)`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 30, fontWeight: "800", color: `hsl(${hue}, 45%, 35%)` }}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
