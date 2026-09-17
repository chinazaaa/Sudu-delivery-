"use client";

import { useEffect, useRef } from "react";
import { keepCart } from "@/app/actions";

/**
 * Remembers a cart against the number typed at checkout, so a checkout that
 * was never finished can be chased. It waits a few seconds after typing stops,
 * to save the cart as it settles rather than after every keystroke.
 */
export default function KeepCart({
  phone,
  name,
  hostel,
  batchId,
  items,
  value,
  summary,
}: {
  phone: string;
  name: string;
  hostel: string;
  batchId: string;
  items: number;
  value: number;
  summary: string;
}) {
  const last = useRef("");

  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || items === 0) return;

    const snapshot = `${digits}|${batchId}|${items}|${value}|${name}|${hostel}`;
    if (snapshot === last.current) return;

    const timer = setTimeout(() => {
      last.current = snapshot;
      const form = new FormData();
      form.set("phone", phone);
      form.set("name", name);
      form.set("hostel", hostel);
      form.set("batch_id", batchId);
      form.set("items", String(items));
      form.set("value", String(value));
      form.set("summary", summary);
      // Nothing to show the customer, and nothing to do if it fails.
      keepCart(form).catch(() => {});
    }, 4000);

    return () => clearTimeout(timer);
  }, [phone, name, hostel, batchId, items, value, summary]);

  return null;
}
