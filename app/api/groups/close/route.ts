import { NextResponse } from "next/server";
import { closeDueGroups } from "@/lib/groups";

export const dynamic = "force-dynamic";

/**
 * Closes every shared delivery whose fifteen minutes are up.
 *
 * This is the safety net, not the usual path: most groups close because
 * everybody said they were done or because the leader closed it. But a group
 * nobody closes has no delivery fee, so nobody in it can pay, so none of it
 * travels. Left alone that is a car of food that quietly never happens.
 *
 * Meant to be called on a schedule, the same way the abandoned cart check is.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const given = new URL(request.url).searchParams.get("key");
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}` && given !== secret) {
      return NextResponse.json({ error: "Not allowed" }, { status: 401 });
    }
  }

  try {
    return NextResponse.json({ closed: await closeDueGroups() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not close them." },
      { status: 500 }
    );
  }
}
