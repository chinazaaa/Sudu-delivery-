"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/supabase";
import { isSignedIn } from "@/lib/admin-auth";

async function assertAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

function done(): void {
  revalidatePath("/admin/faq");
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
}

/**
 * One answer, written or rewritten.
 *
 * Both halves have to be there. An entry with a question and no answer is
 * an entry that matches somebody's sentence and then says nothing, which is
 * worse than no entry: the chat would look like it had understood and then
 * dried up.
 */
export async function saveFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const id = String(form.get("id") ?? "").trim();
  const question = String(form.get("question") ?? "").trim();
  const answer = String(form.get("answer") ?? "").trim();
  if (question === "" || answer === "") return;

  const row = {
    question: question.slice(0, 300),
    answer: answer.slice(0, 2000),
    keywords: String(form.get("keywords") ?? "").trim().slice(0, 500),
    active: String(form.get("active") ?? "") !== "off",
    sort_order: Number(form.get("sort_order") ?? 100) || 100,
  };

  if (id === "") await db().from("faqs").insert(row);
  else await db().from("faqs").update(row).eq("id", id);

  done();
}

/** On or off without opening it, for the one anybody is unsure about. */
export async function toggleFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const id = String(form.get("id") ?? "").trim();
  if (id === "") return;
  await db()
    .from("faqs")
    .update({ active: String(form.get("active") ?? "") === "true" })
    .eq("id", id);

  done();
}

export async function deleteFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const id = String(form.get("id") ?? "").trim();
  if (id === "") return;
  await db().from("faqs").delete().eq("id", id);

  done();
}

/**
 * A question nobody could answer, turned into one the chat can.
 *
 * This is the whole way the list is meant to grow. Somebody asks the chat
 * something it has never heard of, it takes the question and hands it to a
 * person, that person answers them properly on WhatsApp, and then presses
 * this. The next person asking it is answered in a second, for ever.
 *
 * The request is marked done at the same time, because it is: it was
 * answered, and now it is answered for everybody.
 */
export async function faqFromRequest(form: FormData): Promise<void> {
  await assertAdmin();

  const requestId = String(form.get("request_id") ?? "").trim();
  const question = String(form.get("question") ?? "").trim();
  const answer = String(form.get("answer") ?? "").trim();
  if (question === "" || answer === "") return;

  await db().from("faqs").insert({
    question: question.slice(0, 300),
    answer: answer.slice(0, 2000),
    keywords: String(form.get("keywords") ?? "").trim().slice(0, 500),
    active: true,
    sort_order: 100,
    from_request_id: requestId || null,
  });

  if (requestId !== "") {
    await db()
      .from("custom_requests")
      .update({ status: "done", answered_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  done();
}
