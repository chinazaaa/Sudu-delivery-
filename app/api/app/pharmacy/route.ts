import { NextResponse } from "next/server";
import { COUNTERS } from "@/lib/counter";
import { counterShelfJson } from "@/lib/counter-api";

export const dynamic = "force-dynamic";

/** The pharmacy shelf, for the app. The counter's own name on the shared answer. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    return await counterShelfJson(COUNTERS.pharmacy, request);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read the shelf." },
      { status: 503 }
    );
  }
}
