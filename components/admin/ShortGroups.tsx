import { naira } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { whatsappTo } from "@/lib/messages";
import type { GroupShortfall } from "@/lib/groups";

/**
 * Groups the shop is covering the difference on.
 *
 * Shown in two places on purpose. The run sheet is read on the way to the
 * counter, which is the moment it matters for tonight; the groups page is
 * read while a run is still filling, which is early enough to do something
 * about it. The same words in both, because two wordings for one number is
 * how a number stops being believed.
 */
export default function ShortGroups({ groups }: { groups: GroupShortfall[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="card space-y-3">
      <div>
        <h2 className="font-bold">Groups you are covering</h2>
        <p className="text-sm text-muted">
          Somebody in these has not paid yet, so their food is not travelling and
          the car is smaller. The fee for what is actually going costs more than
          the people who did pay were charged between them, and the difference is
          yours unless you ask for it. Nobody has been charged anything extra:
          this is a list to message, not a bill.
        </p>
      </div>

      {groups.map((one) => (
        <div
          key={one.groupId}
          className="space-y-2 rounded-2xl border border-black/10 bg-paper p-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-bold">{one.leaderName}&apos;s group</h3>
            <span className="font-extrabold text-brand-dark">
              {naira(one.short)} short
            </span>
          </div>
          <p className="text-xs text-muted">
            The trip costs {naira(one.owed)} for what is going. {one.paid.length}{" "}
            {one.paid.length === 1 ? "person has" : "people have"} paid{" "}
            {naira(one.collected)} between them.
          </p>

          <p className="text-sm">
            <span className="font-semibold">Not paid yet:</span>{" "}
            {one.missing
              .map(
                (person) =>
                  `${person.name} (${formatPhone(person.phone)}, ${person.items} item${
                    person.items === 1 ? "" : "s"
                  })`
              )
              .join(", ")}
          </p>

          <div className="space-y-1 border-t border-black/10 pt-2">
            <p className="text-xs text-muted">
              {naira(one.eachToCover)} each from the {one.paid.length} who paid
              would cover it. Ask them, or chase the ones above, or let it go.
            </p>
            {one.paid.map((person) => (
              <a
                key={person.phone}
                href={whatsappTo(
                  person.phone,
                  `Hi ${person.name.split(" ")[0]}, quick one about ${one.leaderName}'s group order. ` +
                    `${one.missing.map((m) => m.name.split(" ")[0]).join(" and ")} ` +
                    `${one.missing.length === 1 ? "has" : "have"} not paid, so the delivery is short ` +
                    `${naira(one.short)}. Could you add ${naira(one.eachToCover)} to your transfer? ` +
                    `Totally fine if not, just let me know.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-xl bg-black/[0.04] px-3 py-1.5 text-sm"
              >
                <span>
                  {person.name} · {formatPhone(person.phone)}
                </span>
                <span className="font-semibold text-brand">Message</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
