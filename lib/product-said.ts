import { naira } from "./money";

/**
 * What a dish says about itself, when its kitchen said nothing.
 *
 * Half the menus the shop imports carry no descriptions, and a Product with
 * no description is one a search engine will not give a rich result to:
 * nineteen of ours were refused for exactly that. A name, a counter and a
 * price is not a flourish, it is the three things anybody actually wants to
 * know, and it is true of every dish without anybody writing anything.
 *
 * Written once because it is said in two places, the dish's own page and
 * the menu it sits on, and two of these would eventually disagree about
 * the same dish.
 */
export function saidAbout(
  item: { name: string; description: string; price: number },
  restaurant: string
): string {
  const said = item.description.trim();
  return (
    (said ? `${said} ` : "") +
    `${item.name} from ${restaurant}, ${naira(item.price)}, ` +
    `delivered to Pan-Atlantic University.`
  );
}
