import CounterShelf from "@/components/CounterShelf";

/**
 * Skincare, which is one counter of several now.
 *
 * The screen itself moved into a component the day the pharmacy wanted
 * the same six hundred lines with a different basket behind them. What is
 * left here is the address and which counter it belongs to.
 */
export default function SkincareScreen() {
  return <CounterShelf counter="skincare" checkout="/skincare-checkout" />;
}
