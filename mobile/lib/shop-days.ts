import { useEffect, useState } from "react";
import { BASE } from "@/lib/api";

export type Delivery = { said: string; today: boolean };

/**
 * When each restaurant next delivers, from the same server rule the website
 * uses. Any failure leaves it empty, so a pill is simply not shown.
 */
export function useShopDays(ids: string[]): Record<string, Delivery> {
  const [days, setDays] = useState<Record<string, Delivery>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (key === "") return;
    let live = true;
    void fetch(`${BASE}/api/shop-days?ids=${encodeURIComponent(key)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (live && body && typeof body.days === "object" && body.days) setDays(body.days);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [key]);
  return days;
}
