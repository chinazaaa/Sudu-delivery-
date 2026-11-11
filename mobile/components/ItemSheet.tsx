import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { naira, type Item } from "@/lib/api";
import { cart, type Line } from "@/lib/store";
import { F, T } from "@/lib/theme";
import { Display } from "@/components/ui";

/** The questions a meal asks, and nothing is added until they are answered. */
export default function ItemSheet({
  item,
  restaurant,
  editing,
  onDone,
}: {
  item: Item;
  restaurant: string;
  /** The cart line being changed, when this was opened from the cart. */
  editing: Line | null;
  onDone: () => void;
}) {
  // Opened from the cart, the sheet starts where they left it: the same
  // choices ticked and the same number. Starting blank made every visit back
  // to a meal a rebuild, and answering the questions again from scratch is
  // exactly what somebody checking their cart is not doing.
  const [picked, setPicked] = useState<Record<string, string[]>>(() => {
    if (!editing) return {};
    const start: Record<string, string[]> = {};
    for (const group of item.groups) {
      const theirs = group.options
        .filter((option) => editing.optionIds.includes(option.id))
        .map((option) => option.id);
      if (theirs.length > 0) start[group.id] = theirs;
    }
    return start;
  });
  const [qty, setQty] = useState(editing ? editing.qty : 1);

  const chosen = useMemo(() => Object.values(picked).flat(), [picked]);

  const extra = useMemo(
    () =>
      item.groups
        .flatMap((group) => group.options)
        .filter((option) => chosen.includes(option.id))
        .reduce((sum, option) => sum + option.priceDelta, 0),
    [chosen, item.groups]
  );

  const missing = item.groups.filter(
    (group) => group.required && (picked[group.id] ?? []).length === 0
  );

  const choose = (groupId: string, optionId: string, maxSelect: number) => {
    setPicked((was) => {
      const current = was[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...was, [groupId]: current.filter((one) => one !== optionId) };
      }
      if (maxSelect <= 1) return { ...was, [groupId]: [optionId] };
      if (current.length >= maxSelect) return was;
      return { ...was, [groupId]: [...current, optionId] };
    });
  };

  const add = async () => {
    const names = item.groups
      .flatMap((group) => group.options)
      .filter((option) => chosen.includes(option.id))
      .map((option) => option.name);

    // The old line goes first, or changing the choices on something would
    // leave the original sitting in the cart beside the new one. Whose food
    // it is travels with it: a bag is labelled by name.
    if (editing) await cart.setQty(editing.key, 0);

    await cart.add(
      {
        itemId: item.id,
        name: item.name,
        restaurant,
        imageUrl: item.imageUrl,
        unitPrice: item.price + extra,
        optionIds: chosen,
        choices: names,
        forName: editing?.forName ?? "",
        containerPct: item.containerPct,
      },
      qty
    );
    onDone();
  };

  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: T.shell,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: "92%",
        overflow: "hidden",
      }}
    >
      {/* Without this there is no way out of the sheet on an iPhone: a full
          screen modal cannot be swiped away, and only Android has a back. */}
      <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: 10 }}>
        <Pressable
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={8}
          style={round()}
        >
          <Ionicons name="close" size={22} color={T.ink} />
        </Pressable>
      </View>

      {/* Shrinks to what is on it, so a drink with nothing to ask does not
          open a screenful of empty grey. */}
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}
      >
        {item.imageUrl !== "" && (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: "100%", height: 200, borderRadius: T.radius }}
          />
        )}
        <Display size={28}>{item.name}</Display>
        {blurbOf(item) !== "" && <Text style={{ color: T.muted }}>{blurbOf(item)}</Text>}

        {item.groups.map((group) => (
          <View key={group.id} style={{ backgroundColor: T.paper, borderWidth: 2, borderColor: T.ink, borderRadius: T.radius, padding: 14 }}>
            <Text style={{ fontFamily: F.bodyBold, color: T.ink }}>{group.name}</Text>
            <Text style={{ color: T.muted, marginBottom: 8 }}>
              {group.maxSelect > 1 ? `Pick up to ${group.maxSelect}` : "Pick one"}
              {group.required ? "" : ", or none"}
            </Text>
            {group.options.map((option) => {
              const on = (picked[group.id] ?? []).includes(option.id);
              // A sold out choice is shown but cannot be picked, the same as
              // on the website: knowing it exists is worth the grey line.
              const sold = option.available === false;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => choose(group.id, option.id, group.maxSelect)}
                  disabled={sold}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 10,
                    borderTopWidth: 1,
                    borderTopColor: T.line,
                    opacity: sold ? 0.4 : 1,
                  }}
                >
                  <Text style={{ color: on ? T.brand : T.ink, fontWeight: on ? "800" : "400" }}>
                    {on ? "● " : "○ "}
                    {option.name}
                  </Text>
                  {option.priceDelta !== 0 && (
                    <Text style={{ color: T.muted }}>+{naira(option.priceDelta)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          padding: 16,
          paddingBottom: 16 + insets.bottom,
          backgroundColor: T.paper,
          borderWidth: 2,
          borderColor: T.ink,
          flexDirection: "row",
          gap: 12,
          alignItems: "center",
        }}
      >
        <Pressable onPress={() => setQty((was) => Math.max(1, was - 1))} style={round()}>
          <Text style={{ fontSize: 20 }}>−</Text>
        </Pressable>
        <Text style={{ fontFamily: F.bodyBold, fontSize: 16 }}>{qty}</Text>
        <Pressable onPress={() => setQty((was) => was + 1)} style={round()}>
          <Text style={{ fontSize: 20 }}>+</Text>
        </Pressable>

        <Pressable
          onPress={add}
          disabled={missing.length > 0}
          style={{
            flex: 1,
            backgroundColor: missing.length > 0 ? "rgba(20,17,15,0.15)" : T.brand,
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: T.paper, fontFamily: F.bodyBold }}>
            {missing.length > 0
              ? `Choose ${missing[0].name.toLowerCase()}`
              : `Add · ${naira((item.price + extra) * qty)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The description worth printing: some menus just repeat the name into it,
 *  and saying the same thing twice reads as a mistake. */
function blurbOf(item: Item): string {
  const described = item.description.trim();
  return described.toLowerCase() === item.name.trim().toLowerCase() ? "" : described;
}

function round() {
  return {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.line,
    alignItems: "center",
    justifyContent: "center",
  } as const;
}
