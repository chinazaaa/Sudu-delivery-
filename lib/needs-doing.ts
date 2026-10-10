/**
 * The list that is the whole job.
 *
 * The dashboard used to be six cards of figures and a feed, which answers
 * "how are we doing" and never answers "what should I do now". Every line
 * here costs money if it is left: a filled cart nobody paid for, an order
 * waiting on a transfer while its run closes, a review nobody replied to.
 *
 * Ordered by what it costs to ignore rather than by kind, so the top of the
 * list is always the next thing to do. Nothing is invented: a job appears
 * only when there is something real behind it, and an empty list is a
 * finished morning rather than a broken page.
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
  /** What it is worth leaving, in naira, for the ordering. Not shown. */
  weight: number;
};

export function needsDoing(now: {
  /** Carts filled in and never paid for, with what they came to. */
  left: { value: number; count: number; stillInTime: number };
  /** Orders placed and not paid for, with what they come to. */
  unpaid: { value: number; count: number; runLabel: string; closesAt: string };
  /** The run being worked, if one is. */
  run: { label: string; closesInMinutes: number; kitchens: number; paid: number } | null;
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
      action: { label: "Open left behind", href: "/admin/carts" },
      weight: now.left.value,
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
      action: { label: "Chase them", href: "/admin/orders?status=pending" },
      weight: now.unpaid.value,
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
      action: { label: "Open the run", href: "/admin/runs" },
      weight: now.run.paid === 0 ? 1 : 0,
    });
  }

  const owedTo = (now.promoters ?? []).filter((one) => one.owed > 0);
  if (owedTo.length > 0) {
    const owed = owedTo.reduce((all, one) => all + one.owed, 0);
    jobs.push({
      kind: "promoters",
      tone: "amber",
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
        href: "/admin/promoters?owed=1",
      },
      // Not the shop's money, and somebody is waiting on it. It sits with
      // the rest of the money rather than below the nice-to-haves.
      weight: owed,
    });
  }

  if ((now.parcels ?? 0) > 0) {
    jobs.push({
      kind: "parcels",
      tone: "red",
      title: `${said(now.parcels as number, "parcel")} promised for today`,
      detail: "Somebody has paid for these and is waiting on a day that is already here.",
      action: { label: "Open parcels", href: "/admin/parcels" },
      // Above the reviews and below real money, because a parcel late is a
      // refund and an apology rather than a figure on this page.
      weight: 1,
    });
  }

  if ((now.asked ?? 0) > 0) {
    jobs.push({
      kind: "asked",
      tone: "volt",
      title: `${said(now.asked as number, "request")} waiting on an answer`,
      detail: "Somebody asked for something we do not stock. Nobody has told them either way.",
      action: { label: "Open requests", href: "/admin/requests" },
      weight: 0,
    });
  }

  if (now.reviews > 0) {
    jobs.push({
      kind: "reviews",
      tone: "volt",
      title: `${said(now.reviews, "review")} to reply to`,
      detail: "Replying is the cheapest thing on this list and it keeps you near the top of Google.",
      action: { label: "Reply", href: "/admin/reviews" },
      weight: 0,
    });
  }

  // Money first, biggest first, and the two that cost nothing to leave at
  // the bottom in the order they were added.
  return jobs.sort((a, b) => b.weight - a.weight);
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
