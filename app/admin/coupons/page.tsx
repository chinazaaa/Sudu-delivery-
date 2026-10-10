import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import ActionButton from "@/components/admin/ActionButton";
import CopyText from "@/components/CopyText";
import Figure from "@/components/admin/Figure";
import Panel from "@/components/admin/Panel";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CouponForm, {
  type CouponFormData,
  type CouponFormValues,
} from "@/components/admin/CouponForm";
import { SLOT_LABEL } from "@/lib/config";
import { runDateLabel } from "@/lib/time";
import { choiceReach, couponLabel, listCoupons } from "@/lib/coupons";
import { naira } from "@/lib/money";
import { choiceLabels, choiceSets } from "@/lib/offers";
import { deleteCoupon, toggleCoupon } from "../actions";
import { batchOverview } from "@/lib/admin";
import { dashboard } from "@/lib/admin-data";
import { menuView } from "@/lib/menu";
import { type ScopeShop } from "@/components/admin/MenuScope";
import { siteUrl } from "@/lib/admin-templates";

export const dynamic = "force-dynamic";

/**
 * The cuts of the list, as the board names them.
 *
 * "Codes" against "Free delivery" is the division that matters: one is
 * something a customer has to be told to type, the other applies itself and
 * is only ever seen as a price that came out lower.
 */
const VIEWS = [
  { value: "", label: "All" },
  { value: "live", label: "Live" },
  { value: "off", label: "Off" },
  { value: "codes", label: "Codes" },
  { value: "free", label: "Free delivery" },
] as const;

/**
 * Whether a run falls on the weekend coming.
 *
 * Saturday or Sunday, within the next seven days. "This weekend" on the
 * form means the two runs somebody is thinking about on a Thursday, not
 * every Saturday there will ever be.
 */
function weekendAhead(runDate: string): boolean {
  const at = new Date(`${runDate}T12:00:00Z`);
  const day = at.getUTCDay();
  if (day !== 0 && day !== 6) return false;
  const days = (at.getTime() - Date.now()) / 86400000;
  return days < 7.5;
}

export default async function CouponsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; edit?: string; view?: string }>;
}) {
  const asked = await searchParams;
  // The form opens at the top rather than waiting at the bottom of however
  // many offers there are. Changing one opens the same form on that offer,
  // in the address, so exactly one form is ever on the screen: the editor
  // used to be a `details` inside every card, which on a phone is however
  // many offers there are, each with its own save.
  const making = asked.new === "1";
  const changing = (asked.edit ?? "").trim().toUpperCase();
  const view = VIEWS.some((one) => one.value === asked.view) ? (asked.view as string) : "";
  const coupons = await listCoupons();
  const editing = changing === "" ? null : (coupons.find((one) => one.code === changing) ?? null);
  // Only runs still ahead are worth attaching a code to.
  const runs = (await batchOverview()).filter(
    (run) => new Date(run.cut_off_at).getTime() > Date.now()
  );
  // Every dish, flat, for the picker: free delivery is usually one or two
  // things and finding them is a search, not a scroll.
  const menu = await menuView();
  const dishes = menu.flatMap((place) =>
    place.items.map((item) => ({
      id: item.id,
      name: item.name,
      restaurant: place.restaurant.name,
    }))
  );
  // Each menu as a tree: its sections, and the choices those sections offer
  // in that kitchen's own words. Picked one step at a time rather than spelt.
  const shops: ScopeShop[] = menu.map((place) => {
    // Kept under the question the dish asks, so Size and Flavour are two rows
    // rather than one long list somebody has to sort in their head.
    const choices = new Map<
      string,
      { group: string; name: string; categories: Set<string>; items: Set<string> }
    >();
    // How many dishes ask each question. Domino's Half & Half asks for a
    // flavour twice, and those two questions are on one pizza out of fifteen,
    // which is worth knowing before an offer is narrowed to them.
    const asks = new Map<string, Set<string>>();

    for (const item of place.items) {
      for (const group of item.groups) {
        asks.set(group.name, (asks.get(group.name) ?? new Set<string>()).add(item.id));
        for (const option of group.options) {
          const name = option.name.trim();
          if (name === "") continue;
          const key = `${group.name.toLowerCase()}|${name.toLowerCase()}`;
          const entry = choices.get(key) ?? {
            group: group.name,
            name,
            categories: new Set<string>(),
            items: new Set<string>(),
          };
          if (item.categoryId) entry.categories.add(item.categoryId);
          entry.items.add(item.id);
          choices.set(key, entry);
        }
      }
    }

    return {
      id: place.restaurant.id,
      name: place.restaurant.name,
      categories: place.categories.map((category) => ({
        id: category.id,
        name: category.name,
        items: place.items.filter((item) => item.categoryId === category.id).length,
      })),
      choices: [...choices.values()].map((one) => ({
        group: one.group,
        name: one.name,
        categories: [...one.categories],
        items: one.items.size,
      })),
      asks: [...asks.entries()].map(([group, items]) => ({ group, items: items.size })),
    };
  });

  // Whether a size actually catches every dish it is meant to, said before a
  // Friday rather than after one.
  const reach = new Map<string, Awaited<ReturnType<typeof choiceReach>>>();
  for (const coupon of coupons) {
    // Only where a choice has actually been ticked. Saying every dish offers
    // it when none was asked for is an answer to a question nobody put.
    if (choiceSets(coupon.required_choice ?? "").length > 0) {
      // The same rule the pricing uses: named dishes win over a section.
      const covered =
        coupon.dishes.length > 0
          ? coupon.dishes.map((dish) => dish.id)
          : menu.flatMap((place) =>
              place.items
                .filter((item) =>
                  coupon.sections.some((section) => section.id === item.categoryId)
                )
                .map((item) => item.id)
            );
      reach.set(coupon.code, await choiceReach([...new Set(covered)], coupon.required_choice));
    }
  }

  // Which is which. An automatic offer applies itself and is never typed,
  // which is the only real division in this list: everything else is a
  // detail of one offer.
  const typedCode = (one: (typeof coupons)[number]) => !one.automatic;
  const freeDelivery = (one: (typeof coupons)[number]) =>
    one.applies_to === "fee" && one.amount === 0;

  const counts: Record<string, number> = {
    "": coupons.length,
    live: coupons.filter((one) => one.active).length,
    off: coupons.filter((one) => !one.active).length,
    codes: coupons.filter(typedCode).length,
    free: coupons.filter(freeDelivery).length,
  };
  const shown = coupons.filter((one) =>
    view === "live"
      ? one.active
      : view === "off"
        ? !one.active
        : view === "codes"
          ? typedCode(one)
          : view === "free"
            ? freeDelivery(one)
            : true
  );
  /*
   * What the offers have really given away over the last four weeks.
   *
   * Not `amount × used`, which is wrong twice over: a set-price offer's
   * amount is what delivery became rather than what came off, and a code
   * used in May is not money given away this month. The dashboard already
   * works this out as `codesCost` over twenty-eight days, which is the money
   * taken off orders plus the delivery given away by an offer that prices
   * the fee outright, and that second half is the part no column records.
   *
   * It is a total for the page rather than a figure per offer, because what
   * an order's code took off is kept against the order and not against the
   * offer. That is what the board shows.
   */
  const month = await dashboard().catch(() => null);

  // For sharing one: a code with no page to type it into is useless, so the
  // link goes with it.
  const url = await siteUrl();

  const link = (next: string) =>
    next === "" ? "/admin/coupons" : `/admin/coupons?view=${next}`;
  // Changing one keeps the cut you were looking at, so saving does not land
  // you back on all of them.
  const editLink = (code: string) =>
    `/admin/coupons?edit=${encodeURIComponent(code)}${
      view === "" ? "" : `&view=${view}`
    }#offer-form`;

  // One bundle for the form, whether it is making an offer or changing one.
  const formData: CouponFormData = {
    shops,
    dishes,
    runs: runs.map((run) => ({
      id: run.id,
      label: `${runDateLabel(run.run_date)} · ${SLOT_LABEL[run.slot]}`,
      // So the form can offer "this weekend" without guessing a date out of
      // a label. Saturday and Sunday, inside the week ahead: a fortnight
      // away is next weekend, not this one.
      weekend: weekendAhead(run.run_date),
    })),
  };

  return (
    /* Room under the last offer for the phone bar, which is fixed. */
    <div className="pb-[76px] lg:pb-0">
      <PageHeader
        title="Offers"
        detail="Free delivery on a dish, a set price on a kitchen, or a code for a group chat."
        /* On a phone this page is reached from More, and the board draws the
           way back to it above the title. */
        backHref="/admin/more"
        backLabel="More"
        actions={
          making || editing ? (
            <Link href={link(view)} className="btn-admin">
              Close the form
            </Link>
          ) : (
            /* The screen's one red button, on the bar at the bottom of a
               phone instead of up here. */
            <Link href="/admin/coupons?new=1" className="btn-admin-go hidden lg:inline-flex">
              New offer
            </Link>
          )
        }
      />

      {/* One form, at the top, whether it is a new offer or one being
          changed. The anchor is why the Edit on a card lands on it rather
          than at the top of however many offers there are. */}
      <div id="offer-form" className="scroll-mt-4" />
      {(making || editing) && (
        <div className="mb-3 sm:mb-4">
          <Panel
            title={editing ? `Changing ${editing.code}` : "A new offer"}
            detail={
              editing
                ? "Everything about it, on one form, saving together. Its code cannot change here: that would orphan every order that used it."
                : "Three questions. Pick what kind it is and it asks only that kind's questions, and the rest fills itself in."
            }
          >
            <CouponForm
              values={editing ? valuesOf(editing) : null}
              data={formData}
              back={link(view)}
            />
          </Panel>
        </div>
      )}

      {coupons.length > 0 && (
        /* The board's two figures, side by side at every width: a row of
           four was two of them nobody asked for, and their counts are on
           the cuts underneath anyway. */
        <div className="mb-3 grid grid-cols-2 gap-2.5 sm:mb-4 sm:gap-3.5 xl:max-w-[560px]">
          <Figure
            label="Live now"
            value={String(counts.live)}
            detail={`of ${coupons.length} offer${coupons.length === 1 ? "" : "s"}`}
          />
          <Figure
            label="Given away"
            value={month === null ? "—" : naira(month.codesCost)}
            tone="brand"
            detail={
              month === null
                ? "The last four weeks could not be read"
                : "Last 28 days, across every offer"
            }
          />
        </div>
      )}

      {coupons.length > 1 && (
        /* The cuts, scrolling sideways on a phone rather than wrapping onto
           three lines above the offers themselves. */
        <div className="-mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:mb-4 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0">
          {VIEWS.map((cut) => (
            <Link
              key={cut.value || "all"}
              href={link(cut.value)}
              className={`pill-admin min-h-[34px] shrink-0 px-3 text-[13px] sm:min-h-[38px] sm:px-3.5 sm:text-sm ${
                view === cut.value ? "pill-admin-on" : ""
              }`}
            >
              {cut.label}
              <span className="font-mono opacity-60">{counts[cut.value] ?? 0}</span>
            </Link>
          ))}
        </div>
      )}

      <ul className="space-y-2.5 sm:space-y-3">
        {shown.map((coupon) => (
          <li
            key={coupon.code}
            /* Tighter on a phone, where the board gives a card fourteen
               pixels of padding rather than sixteen, and a switched off
               offer is faded rather than hidden: it is kept for what it
               says about last term. */
            className={`card p-3.5 sm:p-4 ${coupon.active ? "" : "opacity-[0.72]"}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="min-w-0 flex-1">
                {/* The code in mono caps, because it is a thing somebody
                    types character by character. */}
                <h2 className="font-mono text-[15.5px] font-semibold uppercase tracking-[0.02em]">
                  {coupon.code}
                </h2>
                <p className="mt-0.5 text-[14px] font-semibold">{couponLabel(coupon)}</p>
                {/* What has to be true for it to come off, which is the line
                    somebody reads before sending it to anybody. */}
                <p className="hint mt-0.5">
                  {coupon.first_order_only ? "first order only" : "any order"}
                  {coupon.automatic ? " · applies by itself" : " · they type it"}
                  {coupon.same_day && " · also on a same day car"}
                  {coupon.expires_at &&
                    ` · until ${new Date(coupon.expires_at).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}`}
                  {coupon.note && ` · ${coupon.note}`}
                </p>
              </div>

              {/* The board's switch, which is also the control: the state is
                  the word on it as well as the colour, because a switch
                  whose only state is green fails in sunlight, which is
                  where this page is read. Forty-four pixels tall, since a
                  thumb is what lands on it. */}
              <form action={toggleCoupon} className="shrink-0">
                <input type="hidden" name="code" value={coupon.code} />
                <input type="hidden" name="next_active" value={String(!coupon.active)} />
                <ActionButton
                  busy="…"
                  done="Done ✓"
                  aria-label={
                    coupon.active
                      ? `Switch ${coupon.code} off`
                      : `Switch ${coupon.code} on`
                  }
                  className={`btn-admin shrink-0 gap-2 px-2.5 text-[13px] ${
                    coupon.active
                      ? "bg-mint-tint text-mint hover:bg-mint-tint"
                      : "bg-wash text-muted hover:bg-wash"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex h-[22px] w-[38px] items-center rounded-full border-[1.5px] border-ink/20 px-[2.5px] ${
                      coupon.active ? "justify-end bg-mint" : "justify-start bg-line"
                    }`}
                  >
                    <span className="block size-4 rounded-full bg-paper" />
                  </span>
                  {coupon.active ? "Live" : "Off"}
                </ActionButton>
              </form>
            </div>

            {reach.get(coupon.code) && (
              <p
                className={`mt-1.5 text-[13px] font-semibold ${
                  reach.get(coupon.code)!.missing.length > 0 ? "text-brand-dark" : "text-mint"
                }`}
              >
                {(() => {
                  const asked = choiceLabels(coupon.required_choice ?? "")
                    .map((set) => set.join(" or "))
                    .join(", and ");
                  const found = reach.get(coupon.code)!;
                  return found.missing.length === 0
                    ? `${asked}: all ${found.of} of the dishes it covers offer it.`
                    : `${asked}: ${found.matched} of ${found.of} dishes offer it. Not on: ${found.missing
                        .slice(0, 4)
                        .join(", ")}.`;
                })()}
              </p>
            )}

            {/* How much of it has been used on the left, the two things to
                do with it on the right, which is the board's row. */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t-[1.5px] border-rule pt-2.5">
              <span className="hint min-w-0 flex-1">
                Used {coupon.used} time{coupon.used === 1 ? "" : "s"}
                {coupon.max_uses !== null && ` of ${coupon.max_uses}`}
                {" · "}
                {coupon.runs.length === 0
                  ? "any run"
                  : coupon.runs.map((run) => run.label).join(", ")}
              </span>
              {/* Sharing is a message somebody sends by hand, like every
                  other message this shop sends, so it copies the offer and
                  the page to use it on, and nothing is sent from here. */}
              <CopyText
                value={
                  coupon.automatic
                    ? `${couponLabel(coupon)} at ${url}`
                    : `Use ${coupon.code} at ${url} for ${couponLabel(coupon)}.`
                }
                label="Share"
                look="btn-admin btn-admin-sm"
              />
              {/* Editing opens the whole form at the top of the page rather
                  than inside the card: a form folded into every card is
                  however many offers there are, each with its own save
                  button, and on a phone only one of them can be the one the
                  bar belongs to. */}
              <Link href={editLink(coupon.code)} className="btn-admin btn-admin-sm">
                Edit
              </Link>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t-[1.5px] border-rule pt-2.5">
              <form action={deleteCoupon}>
                <input type="hidden" name="code" value={coupon.code} />
                <ConfirmButton tone="bad" confirm={`Yes, delete ${coupon.code}`}>
                  Delete
                </ConfirmButton>
              </form>
              {/* What is forever, written next to the button rather than in
                  a dialog after it. */}
              <span className="hint min-w-0 flex-1">
                Deleting is forever, and takes the record of its{" "}
                {coupon.used} use{coupon.used === 1 ? "" : "s"} with it. Switching it off
                keeps both.
              </span>
            </div>
          </li>
        ))}

        {coupons.length === 0 && (
          <li className="card p-3.5 text-[14.5px] text-muted sm:p-4">
            Nothing yet. A new offer is free delivery on a dish, a set price on a
            kitchen, or a code for a group chat.
          </li>
        )}
        {coupons.length > 0 && shown.length === 0 && (
          <li className="card p-3.5 text-[14.5px] text-muted sm:p-4">
            Nothing in that part of the list right now.
          </li>
        )}
      </ul>

      <p className="hint mt-3 leading-[1.5]">
        The switch is instant and shows on the site straight away. Edit opens
        the whole form at the top of this page, where everything in it saves
        together.
      </p>

      {/* The board's bar: the one thing this screen is for. Not while a form
          is open, because then the thing to do next is saving it, and the
          form carries its own. */}
      {!making && editing === null && (
        <div className="phone-bar">
          <Link
            href="/admin/coupons?new=1"
            className="btn-admin-go min-h-[52px] w-full text-base"
          >
            + New offer
          </Link>
        </div>
      )}
    </div>
  );
}

/** An offer as the form wants it: flat, and without the shapes it never uses. */
function valuesOf(coupon: Awaited<ReturnType<typeof listCoupons>>[number]): CouponFormValues {
  return {
    code: coupon.code,
    applies_to: coupon.applies_to,
    amount: coupon.amount,
    note: coupon.note,
    active: coupon.active,
    first_order_only: coupon.first_order_only,
    expires_at: coupon.expires_at,
    max_uses: coupon.max_uses,
    included_items: coupon.included_items,
    extra_per_item: coupon.extra_per_item ?? 0,
    min_per_person: coupon.min_per_person ?? 0,
    required_choice: coupon.required_choice ?? "",
    sameDay: coupon.same_day ?? false,
    runs: coupon.runs.map((run) => run.batchId),
    places: coupon.places.map((place) => place.id),
    sections: coupon.sections.map((one) => one.id),
    dishes: coupon.dishes.map((one) => one.id),
  };
}
