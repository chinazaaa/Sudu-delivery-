/**
 * What actually went wrong, written down where it can be read.
 *
 * A server render that throws shows a reference number and keeps the real
 * message in the host's log. That log is a different website, behind a
 * different login, and it cannot be queried. Three crashes in one day each
 * cost a round of reading code and guessing, because the one sentence that
 * would have ended it was somewhere nobody in the conversation could reach.
 *
 * Next hands every server error to this hook. It goes in the shop's own
 * database next to the same reference number the page prints, so somebody
 * can read out a number and have the answer in one query.
 */
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routeType?: string }
): Promise<void> {
  try {
    const { db } = await import("./lib/supabase");
    const bad = error as { message?: string; stack?: string; digest?: string };

    await db()
      .from("app_errors")
      .insert({
        digest: String(bad?.digest ?? ""),
        // Capped: a stack is worth having and a megabyte of it is not.
        message: String(bad?.message ?? error).slice(0, 2000),
        stack: String(bad?.stack ?? "").slice(0, 8000),
        route: String(request?.path ?? ""),
        method: String(request?.method ?? ""),
        source: `${context?.routerKind ?? ""} ${context?.routeType ?? ""}`.trim(),
      });
  } catch {
    // The logger must never be the reason a request fails, and a database
    // that is down is the most likely moment for something else to throw.
  }
}
