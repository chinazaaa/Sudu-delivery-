/**
 * Every page of admin, in the order the board files them.
 *
 * Shared because the rail on a desk and the More screen on a phone are the
 * same list read two ways, and two copies of a list of twenty-eight links
 * is one copy that quietly loses a page.
 */

export type Item = { href: string; label: string; badge?: number };
export type Group = { name: string; items: Item[] };

/**
 * The four things open every day, then everything else behind a heading.
 *
 * Twenty-eight links in one list meant the ones that matter sat in the same
 * typography as Secret Santa, and reaching Settings was a scroll. The board
 * puts the daily four at the top and files the rest under six headings that
 * open one at a time.
 */
export const DAILY: Item[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/schedule", label: "Schedule" },
];

export const GROUPS: Group[] = [
  {
    name: "Fulfilment",
    items: [
      { href: "/admin/carts", label: "Left behind" },
      { href: "/admin/groups", label: "Groups" },
      { href: "/admin/subscriptions", label: "Repeats" },
      { href: "/admin/parcels", label: "Parcels" },
    ],
  },
  {
    name: "Catalogue",
    items: [
      { href: "/admin/menu", label: "Restaurants" },
      { href: "/admin/stock", label: "Stock" },
      { href: "/admin/skincare", label: "Skincare" },
      { href: "/admin/occasions", label: "Collections" },
      { href: "/admin/coupons", label: "Offers" },
    ],
  },
  {
    name: "Requests",
    items: [
      // Mail to the shop is somebody asking for something, which is what
      // this heading is, rather than a thing the shop sends.
      { href: "/admin/inbox", label: "Inbox" },
      { href: "/admin/applications", label: "Applications" },
      { href: "/admin/requests", label: "Asked for" },
      { href: "/admin/wishes", label: "Wishes" },
      { href: "/admin/links", label: "Checkout links" },
    ],
  },
  {
    name: "People",
    items: [
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/promoters", label: "Promoter" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    name: "Money",
    items: [
      { href: "/admin/profit", label: "Profit" },
      { href: "/admin/money", label: "Other money" },
      { href: "/admin/analytics", label: "Analytics" },
    ],
  },
  {
    name: "Site",
    items: [
      { href: "/admin/home", label: "Home page" },
      { href: "/admin/santa", label: "Secret Santa" },
      { href: "/admin/email", label: "Email" },
      { href: "/admin/notifications", label: "Notifications" },
      /* Settings and Deleted are not filed here. The board's Site group is
         the four pages above, and both of those belong to the "You" card at
         the bottom of the More screen and to the rail's own footer, so
         listing them in a group printed them twice on a phone. */
    ],
  },
];

/**
 * The two that belong to whoever is signed in, rather than to a group.
 *
 * The board draws these in the "You" card at the bottom of the More screen
 * and pinned into the rail's footer, which is why they are not in GROUPS:
 * a group would print them a second time on the More screen. They are still
 * pages, so they stay in EVERY, which is what names the page in the phone
 * header.
 */
export const YOU: Item[] = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/deletions", label: "Deleted" },
];

export const EVERY = [...DAILY, ...GROUPS.flatMap((one) => one.items), ...YOU];

/**
 * The five the thumb reaches, on a phone.
 *
 * The rail is a desk: twenty-eight links read top to bottom with the mouse
 * already on them. A phone in one hand in a moving car is not that, and a
 * drawer behind a hamburger is two taps and a scroll before the first
 * decision. So the four things open every day sit in a bar at the bottom
 * where the thumb already is, and everything else is behind More.
 *
 * Orders rather than Inbox, because that is what they are: the board calls
 * the screen an inbox and the tab Orders, and the tab is the one somebody
 * reads.
 */
export const TABS: Item[] = [
  { href: "/admin", label: "Dash" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/schedule", label: "Diary" },
  { href: "/admin/more", label: "More" },
];
