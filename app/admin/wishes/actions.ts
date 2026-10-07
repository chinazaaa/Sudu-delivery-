"use server";

import { revalidatePath } from "next/cache";
import { forgetWish } from "@/lib/wishes";

export async function removeWish(form: FormData): Promise<void> {
  await forgetWish(String(form.get("id") ?? ""));
  revalidatePath("/admin/wishes");
}
