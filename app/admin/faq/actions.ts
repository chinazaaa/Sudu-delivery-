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

/*
 * The question sections on the landing pages, which are a different thing
 * from the chat's answers above: printed down the bottom of a page and
 * marked up for Google underneath, rather than said one at a time in a
 * chat.
 *
 * Saved as an override. The page goes on working out its own wording,
 * numbers and all, and these say only where somebody wanted different
 * words. Clearing a box is therefore not deleting an answer, it is asking
 * for the automatic one back, which matters because half of them carry a
 * live fee that would otherwise be frozen into a paragraph.
 */
export async function savePageFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const page = String(form.get("page") ?? "").trim();
  const key = String(form.get("key") ?? "").trim();
  if (page === "" || key === "") return;

  await db()
    .from("page_faqs")
    .update({
      question: String(form.get("question") ?? "").trim().slice(0, 300),
      answer: String(form.get("answer") ?? "").trim().slice(0, 2000),
    })
    .eq("page", page)
    .eq("key", key);

  revalidatePath("/admin/faq");
  revalidatePath(`/${page}`);
}

/** Off the page, without losing the wording. */
export async function togglePageFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const page = String(form.get("page") ?? "").trim();
  const key = String(form.get("key") ?? "").trim();
  if (page === "" || key === "") return;

  await db()
    .from("page_faqs")
    .update({ hidden: String(form.get("hidden") ?? "") === "true" })
    .eq("page", page)
    .eq("key", key);

  revalidatePath("/admin/faq");
  revalidatePath(`/${page}`);
}

/**
 * One of your own, under the ones the page writes itself.
 *
 * It has no automatic wording to fall back on, so unlike the others it is
 * gone for good when it is deleted rather than reverting to anything.
 */
export async function addPageFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const page = String(form.get("page") ?? "").trim();
  const question = String(form.get("question") ?? "").trim();
  const answer = String(form.get("answer") ?? "").trim();
  if (page === "" || question === "" || answer === "") return;

  await db()
    .from("page_faqs")
    .upsert(
      {
        page,
        // Its own name, so adding the same question twice edits it rather
        // than making a second copy of it.
        key: `own-${question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70)}`,
        question: question.slice(0, 300),
        answer: answer.slice(0, 2000),
        custom: true,
        // After everything the page writes itself.
        sort: 900,
      },
      { onConflict: "page,key" }
    );

  revalidatePath("/admin/faq");
  revalidatePath(`/${page}`);
}

/** Only ever one of your own. The page's own questions are hidden, never
 *  deleted, because the page would simply write them back. */
export async function deletePageFaq(form: FormData): Promise<void> {
  await assertAdmin();

  const page = String(form.get("page") ?? "").trim();
  const key = String(form.get("key") ?? "").trim();
  if (page === "" || key === "") return;

  await db().from("page_faqs").delete().eq("page", page).eq("key", key).eq("custom", true);

  revalidatePath("/admin/faq");
  revalidatePath(`/${page}`);
}
