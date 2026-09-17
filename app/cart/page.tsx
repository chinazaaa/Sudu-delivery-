import CartView from "@/components/CartView";
import { openRestaurants } from "@/lib/menu";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  // The cart is where someone realises they forgot the drinks, so the
  // restaurants are right there rather than back through the home page.
  return <CartView restaurants={await openRestaurants()} />;
}
