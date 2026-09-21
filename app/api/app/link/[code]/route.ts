import { NextResponse } from "next/server";
import { linkView } from "@/lib/link-view";
import { safeSettings, whatsappLink } from "@/lib/settings";
import { hostelNames } from "@/lib/hostels";

export const dynamic = "force-dynamic";

/**
 * A basket somebody was sent, for the app.
 *
 * The same view the website draws, worked out by the same code, so the two
 * cannot quietly disagree about what a link says it costs.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  try {
    const view = await linkView((await params).code);
    if ("error" in view) {
      return NextResponse.json(view, { status: view.stopped ? 410 : 404 });
    }

    const settings = await safeSettings();
    return NextResponse.json({
      ...view,
      hostels: await hostelNames(),
      // A way to say something the form cannot hold. Click to send, never
      // sent on anybody's behalf, and it opens with the basket written out.
      askUs:
        whatsappLink(
          settings.whatsapp_number,
          `Hi Sudu, about ${view.title}:\n\n` +
            view.lines.map((line) => `${line.qty}x ${line.name}`).join("\n") +
            "\n\n"
        ) ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read that link." },
      { status: 503 }
    );
  }
}
