import { safeSettings } from "./settings";

/**
 * What the cleaner charges us, and what we charge for it.
 *
 * The numbers in this file are cost. They are never printed: every price
 * anybody sees is worked out from them by the markup in admin, so the one
 * place the shop's margin lives is a settings field somebody can change
 * without a deploy, and a page can never accidentally publish what we pay.
 *
 * Priced per item rather than by the bag because that is how the trade
 * works here: a blouse and a duvet are not the same job and nobody who has
 * ever paid for laundry in Lagos expects them to cost the same.
 */
export type LaundryItem = { name: string; cost: number };
export type LaundryGroup = { name: string; items: LaundryItem[] };

/** Cost, from the cleaner's own list. Never shown to anybody. */
const COST: LaundryGroup[] = [
  {
    name: "Men - Dry Cleaning",
    items: [
      { name: "Senator/South South 2pcs", cost: 2000 },
      { name: "Dress Shirt – Usually for special occasion", cost: 1500 },
      { name: "All T-shirt & Men polo", cost: 1000 },
      { name: "Men trousers with linen or cotton fabric", cost: 1000 },
      { name: "Suit Jacket & Trouser", cost: 2500 },
      { name: "Suit Jacket, Waistcoat & Trouser", cost: 3000 },
      { name: "Agbada, Buba & Sokoto with cotton or suit material (Drying Cleaning)", cost: 3500 },
      { name: "Suit Jacket & Trouser made with Suede material", cost: 4000 },
      { name: "Suit Jacket & Trouser made with leather material", cost: 6000 },
      { name: "All men trousers made of silk material", cost: 2000 },
      { name: "All non-delicate jacket", cost: 1500 },
      { name: "All non-delicate Blazers", cost: 1500 },
      { name: "All non-delicate Waistcoats", cost: 1000 },
      { name: "Below the knee length coat", cost: 2500 },
      { name: "Above the knee length coat", cost: 1500 },
      { name: "Niger Delta men Buba", cost: 2000 },
      { name: "Cassock – Religious Clerical agbada-like wear", cost: 1500 },
      { name: "Chasuble – Religious clerical agbada-like wear", cost: 2000 },
      { name: "Trouser (Leather)", cost: 3000 },
      { name: "Trouser (Suede)", cost: 2000 },
      { name: "Jacket (Suede)", cost: 2000 },
      { name: "Jacket (Leather)", cost: 4000 },
      { name: "Tie", cost: 500 },
      { name: "Bow Tie", cost: 400 },
      { name: "Hat", cost: 1500 },
      { name: "Academic Gown – Lawyer's robe, choir robe, convocation gown", cost: 1500 },
      { name: "Ishiagu", cost: 2500 },
      { name: "Safari Suit – Safari Jacket and trouser", cost: 3000 },
    ],
  },
  {
    name: "Women - Dry Cleaning",
    items: [
      { name: "Shirt – Folded Formal or Causal Dress Shirt", cost: 1500 },
      { name: "Formal Gown / Dress – All Causal or Day Dresses", cost: 2000 },
      { name: "Trouser (Silk) – Women formal Trousers or Pants", cost: 1200 },
      { name: "Skirt (Plain)", cost: 1000 },
      { name: "Skirt (Pleated)", cost: 2000 },
      { name: "Suit 3pc (Trouser) – Blazer, Waistcoat and Trousers", cost: 3000 },
      { name: "Skirt & Blouse (English)", cost: 2000 },
      { name: "Suit 3pc (Skirt) – Blazer, Waist Coat and Skirt", cost: 3000 },
      { name: "Suit 2pc (Trouser) – Trouser and Blazer/Jacket Suit", cost: 2500 },
      { name: "Pleated skirt", cost: 3500 },
      { name: "Suit 2pc (Skirt) – Blazer/Jacket and Skirt", cost: 2000 },
      { name: "Waist coat", cost: 800 },
      { name: "Jacket or Blazer", cost: 2000 },
      { name: "Boubou (Silk)", cost: 2000 },
      { name: "Caftan (Delicate)", cost: 2500 },
      { name: "Jacket/Coat (Suede)", cost: 4500 },
      { name: "Abaya", cost: 5000 },
      { name: "Long Coat", cost: 2500 },
      { name: "Short Coat", cost: 2150 },
      { name: "Women top made of silk material", cost: 1500 },
      { name: "Cocktail Dress – Embellished Cocktails dress", cost: 2500 },
      { name: "Jacket (Leather)", cost: 3000 },
      { name: "Trouser (Leather)", cost: 400 },
      { name: "Jacket (Fur)", cost: 4500 },
    ],
  },
  {
    name: "Men - Laundry",
    items: [
      { name: "Agbada 3pcs", cost: 3500 },
      { name: "Chinos – All Trousers – includes Silk and Jeans", cost: 1000 },
      { name: "Formal Shirt (Folded)", cost: 1000 },
      { name: "Formal Shirt (Hanged)", cost: 1500 },
      { name: "Formal Shirt (White)", cost: 1500 },
      { name: "Sweat Shirt – All sweat shirt clothes for men", cost: 1500 },
      { name: "Men shorts", cost: 800 },
      { name: "Men shorts (Jeans or Chinos)", cost: 1500 },
      { name: "Agbada 3pc (Lace) – Agbada, Buba & Sokoto made of lace", cost: 3000 },
      { name: "Kaftan (Lace) – Buba & Sokoto with Lace material", cost: 2500 },
      { name: "Kaftan – Buba & Sokoto with Brocade material", cost: 1500 },
      { name: "Agbada Only – Only Agbada with mostly Aso-Oke", cost: 1000 },
      { name: "Sutana", cost: 3000 },
      { name: "Singlet – All men singlet underwear", cost: 700 },
      { name: "Aso-Oke 3pc – Agbada, Buba & Sokoto made of Aso-Oke material", cost: 5000 },
      { name: "Aso-Oke 2pc – Buba & Sokoto made of Aso-Oke material", cost: 4000 },
      { name: "Boxers – Men underwear below the stomach", cost: 700 },
      { name: "Jean – All men normal jean trousers", cost: 1500 },
      { name: "Cardigan/Sweater – Knitwear cardigan and sweaters", cost: 1500 },
      { name: "Coverall/Overall – Workman jumpsuit", cost: 2000 },
      { name: "Motorbike Suit – Jacket & Trouser", cost: 5000 },
      { name: "Tracksuit Set – A set of Jacket & Trouser", cost: 2000 },
      { name: "Rain Coat – Water proof coat", cost: 1500 },
      { name: "Winter Coat – All winter coat with or without hood", cost: 1500 },
      { name: "Motorbike Jacket – Rider's jacket only", cost: 3000 },
      { name: "Ankara Shirt – Men top in ankara fabric", cost: 900 },
      { name: "Tracksuit Jacket – Sportswear jacket only", cost: 1200 },
      { name: "Jean (Delicate) – All special & delicate jean trousers", cost: 1500 },
      { name: "Jeans (Luxury) – All expensive designers jean trousers", cost: 3500 },
      { name: "Chinos (Luxury) – Men expensive designers chinos", cost: 2500 },
      { name: "Handkerchief -Small piece of cloth use in cleaning face", cost: 150 },
      { name: "Muffler – Fabric worn over the shoulder", cost: 800 },
      { name: "Native Cap – Traditional caps worn on the head", cost: 850 },
      { name: "Face cap", cost: 1000 },
      { name: "Suede shoes", cost: 5000 },
      { name: "Shoes – A pair of footwear", cost: 4000 },
      { name: "Handbag carried by men", cost: 2000 },
      { name: "Belt – Worn round the waist", cost: 1000 },
      { name: "A pair of socks", cost: 1500 },
      { name: "Lawyers Gown", cost: 10000 },
      { name: "Lawyers Wig", cost: 3000 },
      { name: "Lawyers Collar", cost: 3000 },
      { name: "Lab-coat – Apron, Hospital gown and lab coats", cost: 2000 },
      { name: "Bathrobe", cost: 700 },
      { name: "Jelabiya", cost: 1500 },
      { name: "Swimsuit/Trunk 1pc", cost: 1200 },
      { name: "Swimsuit/Trunk 2pc – Top and bottom swim wear", cost: 2000 },
    ],
  },
  {
    name: "Women - Laundry",
    items: [
      { name: "Shirts – Folded Formal or Causal Dress Shirt", cost: 1000 },
      { name: "Top / Blouse", cost: 800 },
      { name: "Formal Gown / Dress", cost: 1300 },
      { name: "T-Shirts and Polos", cost: 750 },
      { name: "Jeans – Non-delicate Jeans for Women", cost: 1000 },
      { name: "Skirt and Blouse (Native)", cost: 1300 },
      { name: "Iro & Buba (Delicate) – Two Piece Iro & Buba with Lace Fabrics", cost: 2600 },
      { name: "Iro & Buba (Lace) – Two Piece Iro & Buba with Lace Fabrics", cost: 2150 },
      { name: "Iro & Buba (Plain) – Two Piece Iro and Buba with Plain Fabric", cost: 1300 },
      { name: "Aso-Oke Complete – Iro, Buba, Gele, Ipele with Aso Oke Fabric", cost: 3000 },
      { name: "Aso-Oke Complete (Special) – Iro, Buba, Gele/Ipele with Special Aso Oke Fabric", cost: 3500 },
      { name: "Day Dress with Pleats (Delicate)", cost: 2000 },
      { name: "Bou-Bou or Caftan", cost: 1300 },
      { name: "Tracksuits jacket and trouser", cost: 1600 },
      { name: "Gym Wear Bottom – Tight trouser or short for gym and sports", cost: 800 },
      { name: "Gym Wear Top – Tight sleeveless or singlet for gym and sports", cost: 800 },
      { name: "Sweaters", cost: 800 },
      { name: "Plain Wedding Dress", cost: 5500 },
      { name: "Bridesmaid's Dress", cost: 2600 },
      { name: "Evening Dress with Special Fabric", cost: 3000 },
      { name: "Evening Dress with normal fabric", cost: 2500 },
      { name: "Cardigan or Knitwear", cost: 1000 },
      { name: "Camisole", cost: 700 },
      { name: "Jumpsuit/Catsuit", cost: 2000 },
      { name: "Head Gear (Native) – Native Igele, Ipele or Iborun from all Fabrics", cost: 700 },
      { name: "Jacket (Ankara) – Jacket made with native fabric", cost: 1500 },
      { name: "Skirt (Ankara) – Female skirt made with ankara fabric", cost: 1000 },
      { name: "Tracksuit trouser sportswear", cost: 750 },
      { name: "Wedding Dress with Jacket, Hoops, Sleeves", cost: 20000 },
      { name: "Jelabiya", cost: 1500 },
      { name: "Hijab", cost: 1000 },
      { name: "Pyjamas Set -top and bottom Night", cost: 2000 },
      { name: "Pyjamas Single", cost: 600 },
      { name: "Lingerie 2pc", cost: 900 },
      { name: "Lingerie 1pc", cost: 800 },
      { name: "Swimsuit/Trunk 1pc", cost: 700 },
      { name: "Swimsuit/Trunk 2pc – Top and bottom swim wear", cost: 800 },
    ],
  },
  {
    name: "Household",
    items: [
      { name: "1 Seater Upholstery (Luxury) – Luxury single chair", cost: 15000 },
      { name: "1 Seater Upholstery – Single chair", cost: 10000 },
      { name: "2 Seater Upholstery – 2-seater chair", cost: 15000 },
      { name: "2 Seater Upholstery Luxury – Luxury 2-seater chair", cost: 20000 },
      { name: "3 Seater Upholstery – 3-seater chair", cost: 20000 },
      { name: "3 Seater Upholstery (Luxury) – Luxury 3-seater chair", cost: 25000 },
      { name: "Apron – Kitchen wear", cost: 1500 },
      { name: "Bath Curtain – Bathroom curtain", cost: 3000 },
      { name: "Bath Mat – Foot mat for shower", cost: 4000 },
      { name: "Bath Towel – Body bath towel", cost: 3000 },
      { name: "Bath Towel (Luxury) – Luxury bath towel", cost: 5000 },
      { name: "Bedspread – Bed-sheet (Coloured)", cost: 3000 },
      { name: "Blanket", cost: 5000 },
      { name: "Centre rug", cost: 15000 },
      { name: "Luxury Centre rug made of fur", cost: 20000 },
      { name: "Chef/Baker's Hat – Baker's head cover", cost: 500 },
      { name: "Large window curtain", cost: 2000 },
      { name: "Single window curtains", cost: 1500 },
      { name: "Luxury window curtains", cost: 4000 },
      { name: "Inner Blind Curtain", cost: 1500 },
      { name: "Curtain sash", cost: 2000 },
      { name: "Cushion seat covers", cost: 3000 },
      { name: "Dinning seat made with fabric", cost: 2000 },
      { name: "Luxury dinning seat", cost: 3000 },
      { name: "Dinning mat", cost: 1000 },
      { name: "Duvet", cost: 7000 },
      { name: "Duvet Cover", cost: 2500 },
      { name: "Bed Runner – Duvet decor fabric", cost: 1000 },
      { name: "Quilt/Comforter", cost: 25000 },
      { name: "Face towel", cost: 500 },
      { name: "Foot mat", cost: 2000 },
      { name: "Hand towel", cost: 700 },
      { name: "Handkerchief", cost: 200 },
      { name: "Hat", cost: 1200 },
      { name: "Napkin", cost: 300 },
      { name: "Venetian Blind – Day and night style window blind", cost: 4500 },
      { name: "Overall/Coverall/Workman wear", cost: 2500 },
      { name: "Pillow", cost: 2000 },
      { name: "Pillow case", cost: 500 },
      { name: "Luxury room rug", cost: 20000 },
      { name: "Room rug", cost: 15000 },
      { name: "A pair of shoes", cost: 4000 },
      { name: "Table Cloth – Used in covering tables", cost: 1000 },
      { name: "Table Cloth (Luxury) – Luxury table covers", cost: 2000 },
      { name: "Teddy Bear – Inanimate pet", cost: 7000 },
      { name: "Throw pillows", cost: 3000 },
      { name: "Luxury throw pillows", cost: 3000 },
      { name: "Extra large Duvet", cost: 10000 },
    ],
  },
  {
    name: "Kids - Boys 2-10 years",
    items: [
      { name: "T-Shirt", cost: 450 },
      { name: "Sweat Shirt", cost: 450 },
      { name: "Shirt", cost: 500 },
      { name: "Trouser", cost: 500 },
      { name: "Short/Underwear Pant", cost: 350 },
      { name: "Jeans", cost: 350 },
      { name: "Singlet", cost: 200 },
      { name: "Boxers", cost: 200 },
      { name: "Jacket/Blazer", cost: 750 },
      { name: "Kaftan", cost: 600 },
      { name: "Agbada 3pc", cost: 1100 },
      { name: "Suit 3pc", cost: 1500 },
      { name: "School Jacket – Specifically school uniform", cost: 500 },
      { name: "Suit 2pc", cost: 1250 },
      { name: "Bathrobe", cost: 450 },
      { name: "Cardigan/knitwear", cost: 500 },
      { name: "Waist Coat", cost: 400 },
      { name: "Overall/Jumpsuit", cost: 1000 },
      { name: "Aso-Oke Complete-Agbada, Buba & Sokoto", cost: 1200 },
    ],
  },
  {
    name: "Kids - Babies",
    items: [
      { name: "Sweater for babies", cost: 300 },
      { name: "Bodysuit/Onesies", cost: 350 },
      { name: "All baby trousers and skirts", cost: 300 },
      { name: "Day dress for babies 0-2 years", cost: 450 },
      { name: "Overall/Knitwear Set for babies 0-2years", cost: 350 },
      { name: "Bib", cost: 100 },
      { name: "Cardigans/jackets", cost: 400 },
      { name: "Top/Polo – Top for babies 0-2 years", cost: 350 },
      { name: "Face towel – Used for babies 0-2 years", cost: 200 },
      { name: "Flannel – Used for babies 0-2 years", cost: 500 },
      { name: "Blanket – Used for babies 0-2 years", cost: 500 },
      { name: "Pants – Worn by babies 0-2 years", cost: 200 },
      { name: "Mittens – Used for babies 0-2 years", cost: 200 },
      { name: "Cap – Worn by babies 0-2 years", cost: 200 },
      { name: "Socks – Worn by babies 0-2 years", cost: 200 },
      { name: "Suit 2pc – Jacket and trouser for babies 0-2 years", cost: 1000 },
      { name: "Suit 3pc – Jacket, Waistcoat and trouser for babies 0-2 years", cost: 1000 },
      { name: "Baby Bag – Used for storage of baby outing needs", cost: 3000 },
      { name: "Body strapped baby carrier", cost: 2500 },
      { name: "Baby Seater – For car and home", cost: 3500 },
      { name: "Bed sheet -Used to cover baby bed", cost: 1000 },
      { name: "Bed Bumper – Baby bed cushion", cost: 10000 },
    ],
  },
  {
    name: "Kids - Girls 2-10 years",
    items: [
      { name: "Shirt", cost: 450 },
      { name: "Top/Polo", cost: 400 },
      { name: "Dress", cost: 650 },
      { name: "Blouse", cost: 400 },
      { name: "Camisole", cost: 300 },
      { name: "Trouser", cost: 500 },
      { name: "Jeans", cost: 400 },
      { name: "Skirt (Plain)", cost: 500 },
      { name: "Coat", cost: 1000 },
      { name: "Rain Coat", cost: 1000 },
      { name: "Jacket / Blazer", cost: 750 },
      { name: "Iro & Buba", cost: 700 },
      { name: "Suit 2pc (Skirt)", cost: 1500 },
      { name: "Skirt and Blouse (Native)", cost: 1000 },
      { name: "Punjabi/Sar", cost: 500 },
      { name: "Sweater", cost: 450 },
      { name: "Bathrob", cost: 2500 },
      { name: "Kaftan/Bou-Bou", cost: 2000 },
      { name: "Evening Dress", cost: 1300 },
      { name: "Cardigan/knitwear", cost: 1000 },
      { name: "Jumpsuit/Jumper", cost: 1500 },
      { name: "Cocktail Dress", cost: 1500 },
      { name: "Dress (Ankara)", cost: 1000 },
      { name: "Hijab", cost: 500 },
    ],
  },
  {
    name: "Special Stain Treatment",
    items: [
      { name: "Deep Grease stain", cost: 1500 },
      { name: "storage stain(Mildew)", cost: 1500 },
      { name: "Dye Containing stain", cost: 1200 },
      { name: "Special Bleaching", cost: 1500 },
      { name: "Quick oil stain", cost: 500 },
      { name: "Tannin Containing stain (perf,body cream,drink,wine etc)", cost: 1000 },
      { name: "General Soiling", cost: 1000 },
    ],
  },
  {
    name: "Alteration and Repair",
    items: [
      { name: "Hem Dress or Skirt", cost: 1500 },
      { name: "Normal Button", cost: 1000 },
      { name: "Reverse Shirt Collar – Reverse Collar on Shirt", cost: 1000 },
      { name: "Special Buttons", cost: 2000 },
      { name: "Shorten/Lengthen Sleeves – Shorten/Lengthen Sleeves for jackets", cost: 2000 },
      { name: "Shorten/Lengthen Skirt", cost: 1500 },
      { name: "Small Patches", cost: 2000 },
      { name: "Take-in side ( Top) – Take-in side Shirt or Blouse", cost: 1000 },
      { name: "Take-in Side Wedding Dress", cost: 10000 },
      { name: "Take in Side (Jacket)", cost: 2500 },
      { name: "Waist Alteration – Loosen or tighten waist for trousers, short and skirts", cost: 2000 },
      { name: "Zip Change (Long) – Zip 26\" to 30\"", cost: 2000 },
      { name: "Zip Change (Short) – Zip less than 26\"", cost: 1000 },
    ],
  },
  {
    name: "Ironing",
    items: [
      { name: "Shirts for pressing only", cost: 1000 },
      { name: "T-Shirts", cost: 6002 },
      { name: "Piece suits", cost: 1500 },
      { name: "Native", cost: 10003 },
      { name: "piece suit", cost: 2000 },
      { name: "Pleated skirt", cost: 2000 },
      { name: "Ladies Top", cost: 600 },
      { name: "Ladies Wear", cost: 1000 },
      { name: "Trousers", cost: 600 },
      { name: "Sutana", cost: 1500 },
      { name: "Gown", cost: 700 },
    ],
  },
];

/**
 * The order the sections are shown in.
 *
 * The cleaner's own list leads with dry cleaning, which is their business
 * rather than ours: a student with a bag has shirts and trousers in it,
 * not a suede jacket. So the two ordinary laundry sections go first and
 * the rest keeps the list's own order underneath.
 *
 * A list of names rather than a reshuffled file, so changing this later is
 * one line and not three hundred.
 */
const FIRST = ["Men - Laundry", "Women - Laundry", "Ironing"];

function inOrder(groups: LaundryGroup[]): LaundryGroup[] {
  const rank = (name: string) => {
    const at = FIRST.indexOf(name);
    return at === -1 ? FIRST.length : at;
  };
  return [...groups].sort((a, b) => rank(a.name) - rank(b.name));
}

/** What a cost becomes once the shop has taken its share. */
export function retail(cost: number, markup: number, round: number): number {
  const up = Math.round(cost * (1 + Math.max(0, markup) / 100));
  const step = Math.max(1, round);
  return Math.ceil(up / step) * step;
}

export type Priced = { name: string; price: number };
export type PricedGroup = { name: string; items: Priced[] };

/**
 * The list as a customer sees it.
 *
 * Costs are converted here and nowhere else, so nothing downstream has the
 * chance to hand the wrong number to a page.
 */
export async function laundryList(): Promise<{
  on: boolean;
  groups: PricedGroup[];
  minimum: number;
  note: string;
}> {
  const settings = await safeSettings();
  const markup = Number(settings.laundry_markup);
  const minimum = Number(settings.laundry_minimum);

  return {
    on: settings.laundry_on === "on",
    minimum: Number.isFinite(minimum) ? minimum : 0,
    note: settings.laundry_note ?? "",
    groups: inOrder(COST).map((group) => ({
      name: group.name,
      items: group.items.map((one) => ({
        name: one.name,
        price: retail(one.cost, Number.isFinite(markup) ? markup : 0, 50),
      })),
    })),
  };
}

/** How many things are on the list, for a page that wants to say so. */
export function laundryCount(): number {
  return COST.reduce((total, one) => total + one.items.length, 0);
}
