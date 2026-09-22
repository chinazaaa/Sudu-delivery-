import { NextResponse } from "next/server";
import { hostelNames } from "@/lib/hostels";
import { lagosToday } from "@/lib/time";
import { liveRoutes, parcels } from "@/lib/parcels";
import { namedPromoters } from "@/lib/promoters";
import { placeParcel } from "@/lib/parcel-order";

export const dynamic = "force-dynamic";

/**
 * Carrying a parcel, for the app.
 *
 * One call for what the shop carries and what it charges, and a post to send
 * one. Every rule is the server's: the phone draws the form and nothing else,
 * so the value cap, the weight bands and what a real route is cannot be
 * argued with from a phone somebody has taken apart.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const setup = await parcels();
    const routes = liveRoutes(setup.routes);

    return NextResponse.json({
      on: setup.on && routes.length > 0,
      blurb: setup.blurb,
      terms: setup.terms,
      maxValue: setup.maxValue,
      today: lagosToday(),
      hostels: await hostelNames(),
      promoters: await namedPromoters(),
      routes: routes.map((one) => ({
        id: one.id,
        label: one.label,
        toPau: one.toPau,
        bands: one.bands,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read that." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const said = (name: string) => String(body[name] ?? "");

    const result = await placeParcel({
      name: said("name"),
      phone: said("phone"),
      hostel: said("hostel"),
      room: said("room"),
      routeId: said("route"),
      item: said("item"),
      shop: said("shop"),
      address: said("address"),
      value: Number(said("value").replace(/[^\d]/g, "")),
      kg: Number(said("kg")),
      wantedOn: said("wantedOn"),
      toName: said("toName"),
      toPhone: said("toPhone"),
      note: said("note"),
      heardFrom: said("heardFrom"),
      paymentMethod: said("paymentMethod") === "card" ? "card" : "transfer",
    });

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ orderId: result.orderId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send that." },
      { status: 500 }
    );
  }
}
