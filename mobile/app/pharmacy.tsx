import CounterShelf from "@/components/CounterShelf";

/**
 * The pharmacy shelf, which is the skincare screen with a different
 * basket, a different car and eight hundred different products behind it.
 *
 * The one thing that is not shared is what it has to say about itself.
 * That is written here rather than fetched, so it cannot be switched off
 * from a settings page by somebody who did not mean to.
 */
export default function PharmacyScreen() {
  return (
    <CounterShelf
      counter="pharmacy"
      checkout="/pharmacy-checkout"
      caution="We are not a pharmacy and nobody here is a pharmacist. We fetch what you name and carry it, sealed as the shop sold it. We cannot tell you what to take or how much, and we do not carry anything that needs a prescription."
    />
  );
}
