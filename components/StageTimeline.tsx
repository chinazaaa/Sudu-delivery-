import {
  PARCEL_LABEL,
  STAGES,
  STAGE_LABEL,
  stageIndex,
  type BatchStage,
} from "@/lib/stages";
import { clockLabel } from "@/lib/time";

/**
 * Where the run has got to. It is one shared line per batch rather than a map,
 * so it is always true and needs nothing running on anyone's phone.
 *
 * Only three of these steps carry a time, and for one reason: those three
 * are the only ones the shop actually records the moment of. An order is
 * placed at a moment, paid at a moment, and handed over at a moment, and
 * each of those is written down. The ones in between are a stage on the
 * whole run, moved along whenever somebody on a phone gets a hand free, so
 * a clock beside "At the counter" would be the time it was tapped rather
 * than the time the food was being cooked.
 *
 * The line used to carry a single "Updated 7:14pm" under the lot, which
 * read as the time of whatever step was lit. A run handed out at five and
 * ticked off at seven therefore told everybody their food arrived at
 * seven, which is the shop telling somebody something they know is untrue.
 */
export default function StageTimeline({
  stage,
  placedAt,
  paidAt,
  deliveredAt,
  parcel = false,
}: {
  stage: BatchStage;
  /** A parcel is not cooked and does not arrive by the boot-load. "At the
   *  counter, food being cooked" on somebody's dress is the shop
   *  describing a trip that is not happening. */
  parcel?: boolean;
  /** When they ordered, which is the one time nobody has to record. */
  placedAt?: string | null;
  paidAt?: string | null;
  /** When the bag actually changed hands, as the shop recorded it or put
   *  it right afterwards. Missing on everything delivered before any of
   *  this was written down, and said without a time rather than with a
   *  wrong one. */
  deliveredAt?: string | null;
}) {
  const current = stageIndex(stage);
  const visible = STAGES.filter((step) => step !== "ordering");
  const last = stageIndex(visible[visible.length - 1]);

  const when = (step: BatchStage): string =>
    step === "handed_out" && deliveredAt ? clockLabel(deliveredAt) : "";

  return (
    <div className="space-y-2">
      <ol className="space-y-1">
        {/* Before the run's own steps, the two moments that belong to this
            order rather than to the car. */}
        {placedAt && (
          <Step said="Order placed" at={clockLabel(placedAt)} done />
        )}
        {paidAt && <Step said="Payment received" at={clockLabel(paidAt)} done />}

        {visible.map((step) => {
          const index = stageIndex(step);
          /*
           * The last step is an arrival, not a thing in progress.
           *
           * The step a run is on is marked in the shop's red, which is
           * right the whole way along: it means watch this space, the food
           * is moving. At the end it was still red, so a bag that had been
           * handed over an hour ago sat under a red dot reading
           * "Delivered", and red on a finished order looks like something
           * went wrong with it. It is green like every other thing that
           * has already happened, and stays bold because it is the answer.
           */
          const arrived = index === current && index === last;
          return (
            <Step
              key={step}
              said={(parcel ? PARCEL_LABEL : STAGE_LABEL)[step]}
              at={index === current ? when(step) : index < current ? when(step) : ""}
              done={index < current || arrived}
              now={index === current && !arrived}
              lead={arrived}
            />
          );
        })}
      </ol>
    </div>
  );
}

function Step({
  said,
  at,
  done = false,
  now = false,
  lead = false,
}: {
  said: string;
  at: string;
  done?: boolean;
  now?: boolean;
  /** Done, and the end of it. Reads as finished rather than as in hand. */
  lead?: boolean;
}) {
  return (
    <li
      className={`flex items-center gap-2 text-sm ${
        now || lead ? "font-semibold" : done ? "text-muted" : "text-ink/35"
      }`}
    >
      <span
        className={`inline-block size-2 shrink-0 rounded-full ${
          now ? "bg-brand" : done ? "bg-green-600" : "bg-black/20"
        }`}
      />
      <span className="min-w-0 flex-1">{said}</span>
      {at !== "" && <span className="ticket shrink-0 text-[11px] text-muted">{at}</span>}
    </li>
  );
}
