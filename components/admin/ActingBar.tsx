/**
 * The shop, worn as somebody else.
 *
 * Taking an order for a customer means being signed in as them on the real
 * shop, which is the whole point and also the whole danger: the one way
 * this goes wrong is somebody walking away still wearing it, and the next
 * order placed on that browser goes onto her account.
 *
 * So it says so, on every page, in a colour nothing else on the shop uses,
 * with the way out beside it. Not a toast and not a corner badge: a strip
 * that cannot be scrolled past or mistaken for part of the shop.
 */
export default function ActingBar({
  name,
  phone,
  stop,
}: {
  name: string;
  phone: string;
  stop: (form: FormData) => void;
}) {
  return (
    <div className="sticky top-0 z-[60] border-b-2 border-ink bg-volt text-ink">
      <div className="shell flex flex-wrap items-center justify-between gap-2 py-2">
        <p className="text-sm font-bold">
          You are ordering as {name || phone}.{" "}
          <span className="font-normal">
            Anything you put in the cart is theirs.
          </span>
        </p>
        <form action={stop}>
          <input type="hidden" name="phone" value={phone} />
          <button
            type="submit"
            className="rounded-full border-2 border-ink bg-paper px-3 py-1 text-sm font-bold"
          >
            Stop
          </button>
        </form>
      </div>
    </div>
  );
}
