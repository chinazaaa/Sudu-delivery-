import { isSignedIn } from "@/lib/admin-auth";
import { csvResponse, type Row } from "@/lib/csv";
import { customerRows, orderFeed } from "@/lib/admin-data";
import { everyApplication } from "@/lib/promoter-applications";
import { profitBetween } from "@/lib/profit";
import { lagosToday } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * A spreadsheet of whatever page asked for one.
 *
 * Three boards draw an Export button. A route rather than a server action
 * because the answer is a file the browser saves, and one route rather
 * than four because every one of these is the same job: take the rows a
 * page is already showing, and write them out with the filters that were
 * on the screen still applied. An export that quietly ignores the filter
 * somebody set is an export they have to redo by hand.
 */
export async function GET(request: Request): Promise<Response> {
  if (!(await isSignedIn())) {
    return new Response("Sign in again.", { status: 401 });
  }

  const asked = new URL(request.url).searchParams;
  const what = asked.get("what") ?? "";

  try {
    switch (what) {
      case "orders":
        return csvResponse("orders", await orders(asked));
      case "customers":
        return csvResponse("customers", await customers(asked));
      case "applications":
        return csvResponse("applications", await applications());
      case "profit":
        return csvResponse("profit", await profit(asked));
      default:
        return new Response("Nothing by that name to export.", { status: 400 });
    }
  } catch {
    // A failed export must not look like an empty one: a spreadsheet with
    // only headings in it is the kind of thing somebody acts on.
    return new Response("That did not come out. Try again in a moment.", { status: 500 });
  }
}

async function orders(asked: URLSearchParams): Promise<Row[]> {
  const status = asked.get("status") ?? "all";
  const rows = await orderFeed({
    status: (status === "" ? "all" : status) as "all",
    search: asked.get("q") ?? undefined,
    promoter: asked.get("promoter") || null,
    limit: 2000,
  });

  return rows.map((order) => ({
    Order: order.order_no ?? order.id,
    Placed: order.created_at?.slice(0, 10) ?? "",
    Run: order.runDate ?? "",
    Slot: order.slot ?? "",
    Name: order.customer_name,
    Phone: order.customer_phone,
    Block: order.hostel,
    Status: order.status,
    "Paid by": order.payment_method ?? "",
    Food: order.subtotal_food ?? 0,
    Delivery: order.fee ?? 0,
    Discount: order.discount ?? 0,
    Total: order.total,
    Items: order.lines.reduce((count, line) => count + line.qty, 0),
    Kitchens: [...new Set(order.lines.map((line) => line.restaurant).filter(Boolean))].join("; "),
    "Brought by": order.promoter?.name ?? "",
    Came: order.source ?? "",
  }));
}

async function customers(asked: URLSearchParams): Promise<Row[]> {
  const rows = await customerRows(asked.get("q") ?? undefined);
  const by = (asked.get("by") ?? "").trim();
  const kept =
    by === ""
      ? rows
      : by === "none"
        ? rows.filter((row) => !row.promoterCode)
        : rows.filter((row) => row.promoterCode === by);

  return kept.map((row) => ({
    Name: row.name,
    Phone: row.phone,
    Block: row.hostel,
    PIN: row.pin,
    Orders: row.orders,
    Spent: row.spend,
    "Last ordered": row.lastOrder?.slice(0, 10) ?? "",
    "Pays by": row.pays,
    "Brought by": row.promoterCode ?? "",
    Reviewed: row.reviewed,
    Uses: row.uses,
    Note: row.note,
  }));
}

async function applications(): Promise<Row[]> {
  const rows = await everyApplication();
  return rows.map((one) => ({
    Name: one.name,
    Phone: one.phone,
    "Who they will share it with": one.reach,
    "What they said": one.said,
    "Code they were given": one.code,
    Status: one.status,
    Asked: one.created_at?.slice(0, 10) ?? "",
    Answered: one.decided_at?.slice(0, 10) ?? "",
  }));
}

/**
 * The ledger, run by run, which is the shape somebody wants in a
 * spreadsheet: the totals are one line each and the runs are the rows
 * anybody would sort or chart.
 */
async function profit(asked: URLSearchParams): Promise<Row[]> {
  const today = lagosToday();
  const from = asked.get("from") || today;
  const to = asked.get("to") || today;
  const ledger = await profitBetween(from, to);

  return ledger.byRun.map((run) => ({
    Run: run.runDate,
    Slot: run.slot ?? "",
    Orders: run.orders,
    Took: run.took,
    "Food at the counters": run.food,
    Delivery: run.delivery,
    Costs: run.costs,
    Profit: run.profit,
    Estimated: run.estimated,
  }));
}
