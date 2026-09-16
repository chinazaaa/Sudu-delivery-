import { db } from "./supabase";

export type Settings = {
  bank_name: string;
  bank_account_name: string;
  bank_account_number: string;
  whatsapp_number: string;
  card_note: string;
};

const EMPTY: Settings = {
  bank_name: "",
  bank_account_name: "",
  bank_account_number: "",
  whatsapp_number: "",
  card_note: "",
};

export async function getSettings(): Promise<Settings> {
  const { data } = await db()
    .from("settings")
    .select("bank_name, bank_account_name, bank_account_number, whatsapp_number, card_note")
    .eq("id", true)
    .maybeSingle();
  return { ...EMPTY, ...(data ?? {}) } as Settings;
}

export function hasBankDetails(settings: Settings): boolean {
  return Boolean(settings.bank_name && settings.bank_account_number);
}

/**
 * wa.me wants international digits with no plus and no spaces, so a number
 * typed the Nigerian way (0803…) has to be rewritten.
 */
export function whatsappLink(number: string, message: string): string | null {
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const international = digits.startsWith("0") ? "234" + digits.slice(1) : digits;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}
