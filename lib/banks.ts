import { db } from "./supabase";
import type { Settings } from "./settings";

/** One account somebody can pay into. */
export type BankAccount = {
  id: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  sort_order: number;
  active: boolean;
};

/**
 * The accounts as they are stored, or null when the table is not there.
 *
 * Null and empty are different: empty means every account has been taken
 * down, and the single account in settings is what is left to fall back on.
 */
async function stored(includeHidden: boolean): Promise<BankAccount[] | null> {
  try {
    let query = db().from("bank_accounts").select("*").order("sort_order").order("bank_name");
    if (!includeHidden) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as BankAccount[];
  } catch {
    return null;
  }
}

/** The one account settings has always held, as an account. */
export function settingsAccount(settings: Settings): BankAccount | null {
  if (!settings.bank_name || !settings.bank_account_number) return null;
  return {
    id: "settings",
    bank_name: settings.bank_name,
    account_name: settings.bank_account_name,
    account_number: settings.bank_account_number,
    sort_order: 0,
    active: true,
  };
}

/**
 * What a customer may pay into, best first.
 *
 * The list is the truth once there is one. A database without the table yet,
 * or with nothing on the list, still takes money into the account in
 * settings, because a shop that cannot be paid is worse than a shop with one
 * account.
 */
export async function payableAccounts(settings: Settings): Promise<BankAccount[]> {
  const rows = await stored(false);
  if (rows && rows.length > 0) return rows;

  const single = settingsAccount(settings);
  return single ? [single] : [];
}

/** Every account, hidden ones included, for the admin list. */
export async function allAccounts(): Promise<BankAccount[] | null> {
  return stored(true);
}
