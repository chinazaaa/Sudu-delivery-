import { Pressable, Text, View, type ViewStyle } from "react-native";
import { F, T } from "@/lib/theme";

/**
 * The pieces every screen is built from, so the design lives in one file
 * rather than in four hundred inline styles.
 *
 * The whole look is drawn rather than lit: a 2px Ink rule round everything,
 * a hard offset shadow with no blur, and pills that press down into their
 * own shadow. React Native has no offset-only shadow that works on both
 * platforms, so the shadow is a second view sitting behind the first.
 */

/** Small capitals, the way a label is set everywhere on this shop. */
export function Ticket({
  children,
  colour = T.muted,
  style,
}: {
  children: React.ReactNode;
  colour?: string;
  style?: ViewStyle;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: F.mono,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: colour,
        },
        style as never,
      ]}
    >
      {children}
    </Text>
  );
}

/** A headline or a price, in the display face. */
export function Display({
  children,
  size = 28,
  colour = T.ink,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  colour?: string;
  style?: ViewStyle;
}) {
  return (
    <Text
      style={[
        {
          fontFamily: F.display,
          fontSize: size,
          lineHeight: size * 0.95,
          color: colour,
          textTransform: "uppercase",
        },
        style as never,
      ]}
    >
      {children}
    </Text>
  );
}

/** A white card with the 2px Ink rule round it. */
export function Card({
  children,
  style,
  ink = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  /** On Ink instead of on white, for the cards that have to be read first. */
  ink?: boolean;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: ink ? T.ink : T.paper,
          borderWidth: 2,
          borderColor: T.ink,
          borderRadius: T.radius,
          padding: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * The speed stripes, without an SVG.
 *
 * A row of thin bars leaning the same way as the ones on the website. The
 * parent has to clip, because they deliberately run off both ends.
 */
export function Stripes({
  colour = T.brand,
  style,
}: {
  colour?: string;
  style?: ViewStyle;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        { position: "absolute", top: -40, bottom: -40, flexDirection: "row", gap: 8 },
        style,
      ]}
    >
      {Array.from({ length: 14 }, (_, at) => (
        <View
          key={at}
          style={{
            width: 7,
            backgroundColor: colour,
            transform: [{ rotate: "30deg" }],
          }}
        />
      ))}
    </View>
  );
}

/** A pill you press. Tomato by default, with the hard shadow under it. */
export function Button({
  children,
  onPress,
  tone = "loud",
  style,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  /** loud: Tomato on Ink. quiet: an outline. dark: Ink. */
  tone?: "loud" | "quiet" | "dark";
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const back =
    tone === "loud" ? T.brand : tone === "dark" ? T.ink : "transparent";
  const ink = tone === "quiet" ? T.ink : T.paper;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          minHeight: 54,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: T.ink,
          backgroundColor: back,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: 22,
          opacity: disabled ? 0.4 : 1,
          // The press is the shadow collapsing: the pill moves into it.
          transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : [],
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: F.bodyBold, fontSize: 17, color: ink }}>
        {children}
      </Text>
    </Pressable>
  );
}

/** The Ink minus / count / plus, once a thing is in the cart. */
export function Stepper({
  qty,
  onLess,
  onMore,
  name,
  tone = "ink",
}: {
  qty: number;
  onLess: () => void;
  onMore: () => void;
  /** What it is stepping, for anybody who cannot see it. */
  name: string;
  /** "ink" on a white card; "chalk" where the card is already Ink. */
  tone?: "ink" | "chalk";
}) {
  const back = tone === "ink" ? T.ink : T.shell;
  const on = tone === "ink" ? T.paper : T.ink;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
        backgroundColor: back,
        borderRadius: 999,
        padding: 2,
      }}
    >
      <Pressable
        onPress={onLess}
        accessibilityLabel={`One less ${name}`}
        style={{ width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: on, fontSize: 20, fontFamily: F.bodyBold }}>−</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: F.mono,
          fontSize: 14,
          minWidth: 18,
          textAlign: "center",
          color: on,
        }}
      >
        {qty}
      </Text>
      <Pressable
        onPress={onMore}
        accessibilityLabel={`One more ${name}`}
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          backgroundColor: T.brand,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: T.paper, fontSize: 20, fontFamily: F.bodyBold }}>+</Text>
      </Pressable>
    </View>
  );
}

/** The round Tomato plus, before a thing is in the cart. */
export function AddButton({ onPress, name }: { onPress: () => void; name: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Add ${name}`}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: T.ink,
        backgroundColor: T.brand,
        alignItems: "center",
        justifyContent: "center",
        transform: pressed ? [{ translateX: 1 }, { translateY: 1 }] : [],
      })}
    >
      <Text style={{ color: T.paper, fontSize: 22, fontFamily: F.bodyBold, lineHeight: 26 }}>
        +
      </Text>
    </Pressable>
  );
}

/**
 * The bar that floats over the bottom of a screen with something in the
 * cart: what is in it on the left, what to do about it on the right.
 */
export function FloatingBar({
  label,
  total,
  action,
  onPress,
  bottom = 16,
}: {
  label: string;
  total: string;
  action: string;
  onPress: () => void;
  bottom?: number;
}) {
  return (
    <View style={{ position: "absolute", left: 12, right: 12, bottom, zIndex: 5 }}>
      {/* The hard shadow, as a view rather than a shadow. */}
      <View
        style={{
          position: "absolute",
          left: 4,
          top: 4,
          right: -4,
          bottom: -4,
          backgroundColor: T.ink,
          borderRadius: T.radius,
        }}
      />
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backgroundColor: T.brand,
          borderWidth: 2,
          borderColor: T.ink,
          borderRadius: T.radius,
          paddingVertical: 10,
          paddingLeft: 16,
          paddingRight: 10,
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Ticket colour="rgba(255,255,255,0.9)">{label}</Ticket>
          <Text style={{ fontFamily: F.bodyBold, fontSize: 17, color: T.paper }}>
            {total}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: T.ink,
            paddingHorizontal: 16,
            minHeight: 42,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: F.bodyBold, color: T.paper }}>{action}</Text>
        </View>
      </Pressable>
    </View>
  );
}
