import { useEffect, useState } from "react";
import { api, keptShop, type Shop } from "@/lib/api";

/**
 * The shop, from what the phone already has, then from the shop itself.
 *
 * A cold start has no menu, so anything priced off it has to say something
 * meanwhile, and "at checkout" where a delivery fee belongs reads as a shop
 * that does not know what it charges. The cart said that for as long as the
 * network took and then changed its mind in front of whoever was reading it.
 *
 * The copy kept on the phone is a day old at most and the fee bands move
 * perhaps twice a year, so it is right nearly always and corrected within
 * the second when it is not.
 */
export function useShop(): Shop | null {
  const [shop, setShop] = useState<Shop | null>(null);

  useEffect(() => {
    let alive = true;

    void keptShop().then((kept) => {
      // Only if the real one has not already beaten it here.
      if (alive && kept) setShop((now) => now ?? kept);
    });
    void api
      .shop()
      .then((fresh) => {
        if (alive) setShop(fresh);
      })
      .catch(() => {
        // Whatever was kept is better than nothing, and if there was nothing
        // kept the screen says so in its own way.
      });

    return () => {
      alive = false;
    };
  }, []);

  return shop;
}
