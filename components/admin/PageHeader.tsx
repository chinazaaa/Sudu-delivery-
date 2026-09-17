import Link from "next/link";

export default function PageHeader({
  title,
  detail,
  backHref,
  backLabel,
  actions,
}: {
  title: string;
  detail?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-5 space-y-2">
      {backHref && (
        <Link href={backHref} className="text-sm font-semibold text-muted hover:text-brand">
          ← {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
          {detail && <p className="text-sm text-muted">{detail}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
