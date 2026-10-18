import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/admin-auth";
import { db } from "@/lib/supabase";
import { askFileLink } from "@/lib/uploads";

/**
 * Whatever somebody attached to a request, for admin eyes only.
 *
 * The bucket is private, so there is no address to put in a page: this
 * checks who is asking, mints a link good for an hour, and sends them to
 * it. Doing it per click rather than per page render also means a signed
 * link never sits in the HTML of a list of twenty requests, where it
 * would outlive the look.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!(await isSignedIn())) redirect("/admin");

  const { id } = await params;
  const { data } = await db()
    .from("custom_requests")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  const path = (data as { file_path?: string } | null)?.file_path ?? "";
  if (path === "") redirect("/admin/requests");

  const link = await askFileLink(path);
  redirect(link === "" ? "/admin/requests" : link);
}
