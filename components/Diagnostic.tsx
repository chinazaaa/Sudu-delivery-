export default function Diagnostic({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <section className="card border-amber-300 bg-amber-50">
      <h2 className="font-semibold text-amber-900">{title}</h2>
      <p className="mt-1 text-sm text-amber-900/80">{detail}</p>
    </section>
  );
}
