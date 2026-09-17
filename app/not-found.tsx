import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-8 flex max-w-md flex-col items-center px-5 py-10 text-center">
      <span className="mb-4 grid size-16 place-items-center rounded-full bg-brand-tint text-2xl font-extrabold text-brand">
        404
      </span>

      <h1 className="text-xl font-extrabold">This page has gone</h1>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted">
        The link may be old, or the run it pointed at may have been and gone.
        Everything on the menu is still where it was.
      </p>

      <Link href="/" className="btn-primary mt-5 px-6">
        Back to the menu
      </Link>

      <p className="mt-4 text-sm text-muted">
        Looking for an order you placed?{" "}
        <Link href="/orders" className="font-semibold text-brand underline">
          My orders
        </Link>
      </p>
    </div>
  );
}
