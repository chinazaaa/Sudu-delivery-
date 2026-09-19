import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { T } from "@/lib/theme";

export type Deal = { title: string; detail: string; code?: string };

/**
 * What is on offer here, behind one button.
 *
 * The same idea as the website's: an offer scattered across a badge and a
 * line at the top is something people find by accident, and this is somewhere
 * to look on purpose. Each one says what it actually asks of you, not only
 * what it is worth.
 */
export default function Deals({ line, deals }: { line: string; deals: Deal[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState("");

  if (line === "" && deals.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {line !== "" && (
        <View
          style={{
            borderRadius: T.radius,
            borderWidth: 2,
            borderColor: T.brand + "4d",
            backgroundColor: T.tint,
            padding: 12,
          }}
        >
          <Text style={{ color: T.brandDark, fontWeight: "800" }}>{line}</Text>
        </View>
      )}

      {deals.length > 0 && (
        <Pressable
          onPress={() => setOpen(true)}
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            borderWidth: 2,
            borderColor: T.brand + "4d",
            backgroundColor: T.tint,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: T.brandDark, fontWeight: "800" }}>
            {deals.length} deal{deals.length === 1 ? "" : "s"} here
          </Text>
        </Pressable>
      )}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(20,17,15,0.45)", justifyContent: "flex-end" }}
        >
          <Pressable
            // Swallows its own taps, or pressing a deal would shut the sheet.
            onPress={() => {}}
            style={{
              maxHeight: "85%",
              backgroundColor: T.shell,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 16,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: T.ink }}>
                What is on here
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityLabel="Close"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(20,17,15,0.06)",
                }}
              >
                <Text style={{ fontWeight: "800", color: T.ink }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {deals.map((deal, index) => (
                <View
                  key={`${deal.title}-${index}`}
                  style={{ backgroundColor: T.paper, borderRadius: T.radius, padding: 14, gap: 4 }}
                >
                  <Text style={{ fontWeight: "800", color: T.ink }}>{deal.title}</Text>
                  <Text style={{ color: T.muted }}>{deal.detail}</Text>
                  {deal.code ? (
                    <Pressable
                      onPress={() => {
                        void Clipboard.setStringAsync(deal.code!);
                        setCopied(deal.code!);
                        setTimeout(() => setCopied(""), 2000);
                      }}
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 4,
                        borderRadius: 999,
                        backgroundColor: T.ink,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                      }}
                    >
                      <Text style={{ color: T.paper, fontWeight: "800" }}>
                        {copied === deal.code ? "Copied" : `Copy ${deal.code}`}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
