/** Plain shapes handed from server components to client components. */

export type MenuView = {
  restaurant: { id: string; name: string; closesAt: string };
  items: { id: string; name: string; price: number; available: boolean }[];
};

export type BatchView = {
  id: string;
  label: string;
  cutOffISO: string;
  cutOffLabel: string;
  deliveryWindow: string;
  full: boolean;
};
