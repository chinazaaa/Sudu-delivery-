/**
 * The list that is the whole job.
 *
 * The dashboard used to be six cards of figures and a feed, which answers
 * "how are we doing" and never answers "what should I do now". Every line
 * here costs money if it is left: a filled cart nobody paid for, an order
 * waiting on a transfer while its run closes, a review nobody replied to.
 *
 * Ordered as the board draws it: what has been left behind, then the money
 * owed to somebody else, then the money owed to us, then the clock. The
 * order is fixed rather than worked out from the figures, because a list
 * whose rows move about between mornings is a list that has to be read from
 * the top every time instead of recognised. Nothing is invented: a job
 * appears only when there is something real behind it, and an empty list is
 * a finished morning rather than a broken page.
 */
export type Job = {
  /** Which it is, so the page can key and test them. */
  kind: "left" | "unpaid" | "closing" | "reviews" | "parcels" | "asked" | "promoters";
  /** How loud the dot is: red costs money today, amber soon, ink is timing,
   *  volt is worth doing but nobody is out of pocket. */
  tone: "red" | "amber" | "ink" | "volt";
  title: string;
  detail: string;
  action: { label: string; href: string };
};

export function needsDoing(now: {
  /** Carts filled in and never paid for, with what they came to. */
  left: { value: number; count: number; stillInTime: number };
  /** Orders placed and not paid for, with what they come to. */
  unpaid: { value: number; count: number; runLabel: string; closesAt: string };
  /** The run being worked, if one is. Its id travels with it because the
   *  row's button opens that run rather than the list of all of them. */
  run: {
    id: string;
    label: string;
    closesInMinutes: number;
    kitchens: number;
    paid: number;
  } | null;
  /** Reviews nobody has answered. */
  reviews: number;
  /** Commission earned and not yet handed over, by promoter. Somebody did
   *  the work weeks ago and is still waiting to be paid for it. */
  promoters?: { name: string; owed: number; since: string }[];
  /** Parcels promised for today. Not on the board, because the board was
   *  drawn for a food run, but somebody has paid for these and is waiting. */
  parcels?: number;
  /** Somebody asking for something we do not stock, waiting on an answer.
   *  It arrives by email too, and an inbox is where things go to be missed. */
  asked?: number;
}): Job[] {
  const jobs: Job[] = [];

  if (now.left.count > 0) {
    jobs.push({
      kind: "left",
      tone: "amber",
      title: `${naira(now.left.value)} left behind`,
      detail:
        `${said(now.left.count, "cart")} filled in and never paid for.` +
        (now.left.stillInTime > 0
          ? ` ${now.left.stillInTime} can still make today's run, one WhatsApp each.`
          : " None of them can still make today's run."),
      // Named for the carts worth a WhatsApp right now, because that is
      // what pressing it is for. Where none of them can still make the run
      // there is nothing to nudge, so it goes back to opening the list.
      action: {
        label:
          now.left.stillInTime > 0
            ? `Nudge all ${now.left.stillInTime}`
            : "Open left behind",
        href: "/admin/carts",
      },
    });
  }

  const owedTo = (now.promoters ?? []).filter((one) => one.owed > 0);
  if (owedTo.length > 0) {
    const owed = owedTo.reduce((all, one) => all + one.owed, 0);
    jobs.push({
      kind: "promoters",
      tone: "red",
      title: `You owe ${said(owedTo.length, "promoter")} ${naira(owed)}`,
      detail:
        owedTo
          .slice(0, 3)
          .map((one) => `${one.name} ${naira(one.owed)}${one.since ? ` since ${one.since}` : ""}`)
          .join(", ") + ". They brought these people in.",
      // Said as an instruction to whoever is reading it, which is what it
      // is: go and pay these people. It opens the list and their account
      // numbers. Nothing here moves money, because a promoter is paid by a
      // transfer made by hand in a banking app.
      action: {
        label:
          owedTo.length === 1 ? "Pay them" : owedTo.length === 2 ? "Pay both" : "Pay them all",
        // Straight to the owed list and down to it, rather than to the top
        // of a page of nine promoters with the two who are owed somewhere
        // below the fold. Somebody tapping this has already decided; the
        // page should open where the account numbers are.
        href: "/admin/promoters?owed=1#owed",
      },
    });
  }

  if (now.unpaid.count > 0) {
    jobs.push({
      kind: "unpaid",
      tone: "red",
      title: `${said(now.unpaid.count, "order")} unpaid`,
      detail:
        `${naira(now.unpaid.value)}` +
        (now.unpaid.runLabel ? ` across ${now.unpaid.runLabel}.` : ".") +
        (now.unpaid.closesAt ? ` Chase or cancel before ${now.unpaid.closesAt}.` : ""),
      action: { label: "Chase", href: "/admin/orders?status=pending" },
    });
  }

  // Only while it is close enough to act on. A run closing in nine hours is
  // a timetable, and a dashboard that says so every morning is one nobody
  // reads by Thursday.
  if (now.run && now.run.closesInMinutes > 0 && now.run.closesInMinutes <= 240) {
    jobs.push({
      kind: "closing",
      tone: "ink",
      title: `${now.run.label} closes in ${howLong(now.run.closesInMinutes)}`,
      detail:
        `${said(now.run.kitchens, "kitchen")} on it, ` +
        (now.run.paid === 0
          ? "nothing ordered yet."
          : `${said(now.run.paid, "order")} paid for so far.`),
      // The run itself, not the list of runs. Somebody tapping this has
      // already decided which run they mean: it is the one named in the row.
      action: { label: "Open the run", href: `/admin/batch/${now.run.id}` },
    });
  }

  if ((now.parcels ?? 0) > 0) {
    jobs.push({
      kind: "parcels",
      tone: "red",
      title: `${said(now.parcels as number, "parcel")} promised for today`,
      detail: "Somebody has paid for these and is waiting on a day that is already here.",
      action: { label: "Open parcels", href: "/admin/parcels" },
    });
  }

  if ((now.asked ?? 0) > 0) {
    jobs.push({
      kind: "asked",
      tone: "volt",
      title: `${said(now.asked as number, "request")} waiting on an answer`,
      detail: "Somebody asked for something we do not stock. Nobody has told them either way.",
      action: { label: "Open requests", href: "/admin/requests" },
    });
  }

  if (now.reviews > 0) {
    jobs.push({
      kind: "reviews",
      tone: "volt",
      title: `${said(now.reviews, "review")} to reply to`,
      detail: "Replying is the cheapest thing on this list and it keeps you near the top of Google.",
      action: { label: "Reply", href: "/admin/reviews" },
    });
  }

  // Already in the board's order, because that is the order they are added
  // in: nothing is sorted afterwards.
  return jobs;
}

/**
 * How many abandoned carts could still make a run.
 *
 * The dashboard said "3 can still make today's run" off a filter whose
 * callback never looked at the cart: it tested the clock once and so counted
 * either none of them or all of them. A cart is worth a WhatsApp now only if
 * there is still a run to make, and if that cart's own last touch was before
 * the cut-off. A cart filled against another run cannot make this one at
 * all; one filled against no run yet can, because picking the run is part of
 * checking out.
 */
export function cartsInTime(
  carts: { updated_at: string; batch_id: string | null }[],
  run: { id: string; cutOffAt: string } | null,
  now: number = Date.now()
): number {
  if (run === null) return 0;
  const closes = new Date(run.cutOffAt).getTime();
  // A run whose cut-off has passed, or has no readable cut-off, cannot be
  // made by anybody.
  if (!Number.isFinite(closes) || closes <= now) return 0;

  return carts.filter((cart) => {
    if (cart.batch_id !== null && cart.batch_id !== run.id) return false;
    const touched = new Date(cart.updated_at).getTime();
    return Number.isFinite(touched) && touched < closes;
  }).length;
}

/** "1 cart", "4 carts". Said rather than printed as "4 cart(s)". */
function said(count: number, thing: string): string {
  return `${count} ${thing}${count === 1 ? "" : "s"}`;
}

/** "2h 14m", "40m". Nobody needs seconds on this page. */
export function howLong(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const hours = Math.floor(whole / 60);
  const rest = whole % 60;
  return hours === 0 ? `${rest}m` : rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/** The same naira as everywhere else, kept local so this file is pure. */
function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`;
}
