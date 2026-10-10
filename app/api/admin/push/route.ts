import { NextResponse } from "next/server";
import { isSignedIn } from "@/lib/admin-auth";
import { forget, subscribe } from "@/lib/admin-alerts";

export const dynamic = "force-dynamic";

/**
 * Putting a phone on the list, and taking one off.
 *
 * A route handler rather than a server action because the subscription itself
 * only exists inside a browser: the phone asks for permission on a tap, gets
 * an endpoint and two keys back from the push service, and posts them here.
 * None of that can start on the server.
 *
 * Behind the admin cookie, like everything else under /api/admin. An open
 * version of this would let anybody subscribe their own phone to the shop's
 * order notifications, which is the whole run sheet.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const sent = (body ?? {}) as {
    endpoint?: unknown;
    p256dh?: unknown;
    auth?: unknown;
    label?: unknown;
  };

  const result = await subscribe({
    endpoint: String(sent.endpoint ?? ""),
    p256dh: String(sent.p256dh ?? ""),
    auth: String(sent.auth ?? ""),
    label: String(sent.label ?? ""),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Forgetting one, by the id the settings page lists it under. */
export async function DELETE(request: Request): Promise<NextResponse> {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Which phone?" }, { status: 400 });

  // The row going is the whole of it. The phone keeps its browser-side
  // subscription until somebody turns notifications off there, but with no
  // row here nothing is ever sent to it again.
  if (!(await forget(id))) {
    return NextResponse.json({ error: "Could not remove that one." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
