import { promoterRows } from "@/lib/admin";
import { naira } from "@/lib/money";
import { savePromoter } from "../actions";

export const dynamic = "force-dynamic";

export default async function PromotersAdmin() {
  const promoters = await promoterRows();

  return (
    <div className="space-y-4">
      <section className="card">
        <h1 className="text-lg font-semibold">Promoters</h1>
        <p className="text-sm text-ink/60">
          Give codes to a handful of people, not everyone. Orders counted are for the
          life of the customer — attribution sticks to the phone number.
        </p>
      </section>

      {promoters.map((promoter) => (
        <form key={promoter.code} action={savePromoter} className="card space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">{promoter.code}</h2>
            <p className="text-sm">
              {promoter.orders} order{promoter.orders === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold">{naira(promoter.owed)}</span> owed
            </p>
          </div>
          <p className="break-all text-xs text-ink/50">
            Their link: /?ref={promoter.code}
          </p>
          <input type="hidden" name="code" value={promoter.code} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="grow">
              <label className="label">Name</label>
              <input name="name" defaultValue={promoter.name} className="field" />
            </div>
            <div className="w-36">
              <label className="label">Phone</label>
              <input name="phone" defaultValue={promoter.phone} className="field" />
            </div>
            <div className="w-24">
              <label className="label">Rate</label>
              <input name="rate" inputMode="numeric" defaultValue={promoter.rate} className="field" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" name="active" defaultChecked={promoter.active} />
              Active
            </label>
            <button className="btn-quiet">Save</button>
          </div>
        </form>
      ))}

      <form action={savePromoter} className="card space-y-2">
        <h2 className="font-semibold">Add a promoter</h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className="label">Code</label>
            <input name="code" placeholder="TOLU" className="field" />
          </div>
          <div className="grow">
            <label className="label">Name</label>
            <input name="name" className="field" />
          </div>
          <div className="w-36">
            <label className="label">Phone</label>
            <input name="phone" className="field" />
          </div>
          <div className="w-24">
            <label className="label">Rate</label>
            <input name="rate" inputMode="numeric" defaultValue={500} className="field" />
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked />
            Active
          </label>
          <button className="btn-primary">Add</button>
        </div>
      </form>
    </div>
  );
}
