import PageHeader from "@/components/admin/PageHeader";
import PrintPhoto from "@/components/admin/PrintPhoto";
import { printCount, printInOrder } from "@/lib/printing";
import { printPhotos } from "@/lib/print-photos";

export const dynamic = "force-dynamic";

/**
 * Pictures for the printing catalogue, one at a time.
 *
 * The list itself is in the code: two hundred names and what each one is,
 * with no price on any of them because every one is quoted. What is
 * missing is photographs, and those arrive as the shop actually prints
 * things rather than all at once, so this is a long list of small forms
 * rather than an import.
 */
export default async function AdminPrintingPage() {
  const photos = await printPhotos();
  const done = Object.keys(photos).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Printing"
        detail={`${printCount()} things we can print, every one of them quoted rather than priced.`}
      />

      <div className="card border-2 border-ink bg-volt/20">
        <h2 className="font-bold">
          {done} of {printCount()} have a picture
        </h2>
        <p className="mt-1 text-sm leading-relaxed">
          The ones without wear a drawing, which is honest and a little
          plain. Photograph things as you print them and the shelf fills up
          over time. They are ours rather than the supplier&apos;s on
          purpose: somebody else&apos;s pictures go blank the day they take
          them down.
        </p>
      </div>

      {printInOrder().map((group) => (
        <details key={group.name} className="card">
          <summary className="cursor-pointer font-semibold">
            {group.name}
            <span className="ml-2 text-sm font-normal text-muted">
              {group.items.filter((one) => photos[one.slug]).length} of{" "}
              {group.items.length} done
            </span>
          </summary>
          <div className="mt-2 divide-y divide-black/5">
            {group.items.map((one) => (
              <PrintPhoto
                key={one.slug}
                slug={one.slug}
                name={one.name}
                url={photos[one.slug] ?? ""}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
