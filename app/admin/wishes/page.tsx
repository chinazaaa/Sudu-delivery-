import PageHeader from "@/components/admin/PageHeader";
import Stat from "@/components/admin/Stat";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { whatsappTo } from "@/lib/messages";
import { formatPhone } from "@/lib/phone";
import { dayWord } from "@/lib/time";
import { wishes } from "@/lib/wishes";
import { removeWish } from "./actions";

export const dynamic = "force-dynamic";

/**
 * What people said they wish they could order.
 *
 * Deliberately not the "Asked for" page. That one is somebody who has
 * decided to buy, with a budget and a number, and every row of it is a
 * quote waiting to be written. This is the opposite end: nobody is buying,
 * most of it will never be stocked, and the value is in the repeats.
 *
 * So the one number worth reading is how many said the same thing, which
 * is why the page leaves them whole rather than trying to tidy them into
 * categories nobody agreed on.
 */
export default async function WishesPage() {
  const all = await wishes();
  const week = all.filter(
    (one) => Date.now() - new Date(one.createdAt).getTime() < 7 * 86_400_000
  );
  const withNumbers = all.filter((one) => one.phone !== "");

  return (
    <div>
      <PageHeader
        title="Wishes"
        detail="What people said they wish they could order. One box, no account: the cheapest market research there is."
        backHref="/admin"
        backLabel="Dashboard"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Wishes" value={all.length} />
        <Stat label="This week" value={week.length} tone="good" />
        <Stat label="Left a number" value={withNumbers.length} />
        <Stat
          label="From a link"
          value={all.filter((one) => one.cameFrom !== "").length}
        />
      </div>

      {all.length === 0 ? (
        <p className="card text-muted">
          Nothing yet. Send people to sudu.store/wish and they land here.
        </p>
      ) : (
        <ul className="space-y-3">
          {all.map((one) => (
            <li key={one.id} className="card">
              <p className="font-semibold">{one.wanted}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span>{dayWord(one.createdAt.slice(0, 10))}</span>
                {one.cameFrom ? <span>· {one.cameFrom}</span> : null}
                {one.phone ? <span>· {formatPhone(one.phone)}</span> : null}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {/* They left a number because they want telling when we
                  * get it, so the message to send is already written. */}
                {one.phone ? (
                  <a
                    className="text-sm font-semibold text-brand underline"
                    href={whatsappTo(
                      one.phone,
                      `Hi, you asked us about ${one.wanted}. We can get it now.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tell them we have it
                  </a>
                ) : null}
                <form action={removeWish}>
                  <input type="hidden" name="id" value={one.id} />
                  <ConfirmButton
                    tone="bare"
                    className="text-sm font-semibold text-muted underline"
                    confirm="Sure? Delete it"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
