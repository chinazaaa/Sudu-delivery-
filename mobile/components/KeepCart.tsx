import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

/**
 * Remembers a cart against the number typed at checkout, so a checkout that
 * was never finished can be chased.
 *
 * The same four second wait the website uses, so the cart is filed as it
 * settles rather than after every keystroke, and the same table at the other
 * end, so a customer who gave up in the app is on the one list of people to
 * ring rather than on a second one nobody thinks to open.
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
    if (digits.length < 10) return;

    /*
     * An empty cart is only worth saying where one was saved first.
     *
     * Taking the last thing out used to stop the saving dead, so the last
     * full snapshot kept its timestamp and turned into a "left behind"
     * alert about food somebody had deliberately removed. Now it is told.
     *
     * But only once this screen has saved something. A cart is read out of
     * the phone's own storage after the screen draws, so every checkout is
     * momentarily empty, and forgetting on that would wipe a real cart
     * every time somebody opened it.
     */
    if (items === 0 && last.current === "") return;

    const snapshot = `${digits}|${batchId}|${items}|${value}|${name}|${hostel}`;
    if (snapshot === last.current) return;

    const timer = setTimeout(() => {
      last.current = snapshot;
      // Nothing to show the customer, and nothing to do if it fails.
      void api.keepCart({ phone, name, hostel, batchId, items, value, summary });
    }, 4000);

    return () => clearTimeout(timer);
  }, [phone, name, hostel, batchId, items, value, summary]);

  return null;
}
