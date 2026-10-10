import { STAGES } from "./stages";

/**
 * How an order went, as a row of steps somebody can read down.
 *
 * The admin order page could say what an order *is* and never what had
 * happened to it. Four of the five things worth knowing are already
 * recorded against the order or its run; the fifth is whether a review ever
 * came of it, which is the thing most often forgotten and exactly why it
 * belongs at the bottom of a list somebody reads after a handover.
 *
 * Nothing is invented. A step with no time against it says so rather than
 * borrowing the one above it, because a timeline that guesses is worse than
 * one with a gap in it.
 */
export type Step = {
  label: string;
  /** When it happened, or empty where it has not or was never recorded. */
  when: string;
  done: boolean;
};

export function orderStory(order: {
  created_at: string;
  paid_at: string | null;
  done_at: string | null;
  rated_at: string | null;
  status: string;
  payment_method: string | null;
  paid_into?: string | null;
  hostel: string;
  batchStage?: string | null;
  /** Where the food was bought, for the step that names it. */
  counters?: string[];
  /** Whether this customer is ticked as having left a Google review. Held
   *  against the person rather than the order, because a review is about
   *  the shop and somebody only writes one once. */
  reviewed?: boolean;
}, say: (iso: string) => string): Step[] {
  const stage = String(order.batchStage ?? "");
  const reached = (name: string) =>
    STAGES.indexOf(stage as never) >= STAGES.indexOf(name as never);

  const bought = reached("at_counter");
  const handed =
    order.status === "delivered" || order.done_at !== null || reached("handed_out");

  const where =
    (order.counters ?? []).length === 0
      ? "the counter"
      : (order.counters as string[]).length === 1
        ? (order.counters as string[])[0]
        : `${(order.counters as string[]).length} counters`;

  return [
    { label: "Ordered", when: say(order.created_at), done: true },
    {
      label: "Paid",
      when: order.paid_at ? say(order.paid_at) : "",
      done: order.paid_at !== null,
    },
    {
      label: `Bought at ${where}`,
      // The run records the stage, not the minute it changed, so this step
      // says that it happened and does not pretend to know when.
      when: "",
      done: bought,
    },
    {
      label: "Handed over",
      when: order.done_at ? say(order.done_at) : "",
      done: handed,
    },
    /*
     * Whether a review came of it, not whether one was asked for.
     *
     * It read "Review asked" and was ticked off the stars somebody left on
     * their own order page, so it answered neither question: people who had
     * written a Google review showed as nothing done, and the word promised
     * a record of asking that the shop has never kept.
     *
     * Two ways to have been reviewed, because the shop has two kinds. The
     * stars on this order are about this food; the Google tick is about the
     * shop, and is held against the person. Either one means something came
     * back, which is what the step is there to say.
     */
    {
      label: "Reviewed",
      // Which kind, where it was not the stars on this order: "Done" on its
      // own leaves somebody wondering where to go and look.
      when: order.rated_at
        ? say(order.rated_at)
        : order.reviewed === true
          ? "On Google"
          : "",
      done: order.rated_at !== null || order.reviewed === true,
    },
  ];
}

/** How they paid, said in one line, for the step that records it. */
export function howPaid(order: {
  payment_method: string | null;
  paid_into?: string | null;
}): string {
  const how = order.payment_method === "card" ? "card" : "transfer";
  const into = String(order.paid_into ?? "").trim();
  return into === "" ? how : `${how}, ${into}`;
}
