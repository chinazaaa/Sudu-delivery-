import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Panel from "@/components/admin/Panel";
import { lookFor, type Found } from "@/lib/admin-search";

export const dynamic = "force-dynamic";

const KINDS = [
  { key: "orders", title: "Orders", empty: "No order matches that." },
  { key: "people", title: "People", empty: "Nobody in the book matches that." },
  { key: "items", title: "On the menu", empty: "Nothing on the menu matches that." },
  { key: "kitchens", title: "Kitchens", empty: "No kitchen matches that." },
] as const;

function Row({ one }: { one: Found }) {
  return (
    <Link
      href={one.href}
      className="flex items-center gap-3 border-t-[1.5px] border-rule py-[11px]"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold">{one.title}</span>
        <span className="hint block truncate">{one.detail}</span>
      </span>
      {one.figure && <span className="font-mono text-[14.5px] font-semibold">{one.figure}</span>}
      <span aria-hidden className="text-[17px] text-muted">
        ›
      </span>
    </Link>
  );
}

/**
 * The one box in the header, and what is behind it.
 *
 * Somebody holding a phone number does not know whether it is a customer
 * question or an order question, and somebody reading a transfer narration
 * has four digits and nothing else. Before this, each page searched only
 * itself, so the answer depended on which page you happened to be standing
 * on when you started looking.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const asked = (await searchParams).q ?? "";
  const found = await lookFor(asked);

  return (
    <div>
      <PageHeader
        title={found.term === "" ? "Search" : `“${found.term}”`}
        search={false}
        detail={
          found.term === ""
            ? "Orders, people, things on the menu and the kitchens, in one box."
            : `${found.total} thing${found.total === 1 ? "" : "s"} match that.`
        }
      />

      {/* The header's box searches from wherever you were. This one is for
          searching again without going back to a page first. */}
      <form action="/admin/search" className="mb-4 flex max-w-xl gap-2.5">
        <input
          name="q"
          defaultValue={found.term}
          autoFocus
          placeholder="A name, a number, four digits off a transfer, a dish"
          className="field min-h-[42px] grow border-[1.5px] border-line bg-paper px-3 py-0 text-[14.5px]"
        />
        <button className="btn-admin">Search</button>
      </form>

      {found.term.length < 2 ? (
        <p className="hint">Two letters or more, otherwise it matches most of the shop.</p>
      ) : found.total === 0 ? (
        <Panel title="Nothing">
          <p className="hint mt-1">
            Nothing matches “{found.term}”. A part of a name works, so does part of a number, and
            an order number with or without its hash.
          </p>
        </Panel>
      ) : (
        <div className="grid items-start gap-[18px] xl:grid-cols-2">
          {KINDS.map((kind) => {
            const rows = found[kind.key];
            if (rows.length === 0) return null;
            return (
              <Panel
                key={kind.key}
                title={kind.title}
                size="sm"
                aside={<span className="hint">{rows.length}</span>}
              >
                <div className="mt-1">
                  {rows.map((one) => (
                    <Row key={`${one.kind}-${one.href}-${one.title}`} one={one} />
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
