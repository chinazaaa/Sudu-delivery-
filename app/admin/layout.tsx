import type { Metadata } from "next";
import AdminShell from "@/components/admin/Shell";
import AdminLogin from "@/components/AdminLogin";
import RegisterWorker from "@/components/admin/RegisterWorker";
import { isSignedIn } from "@/lib/admin-auth";
import { waitingCounts } from "@/lib/admin";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

/*
 * Admin's own manifest, so adding it to a home screen adds admin.
 *
 * The shop's manifest starts at "/", which is right for a customer and wrong
 * for the owner: installing from the dashboard made an icon that opened the
 * landing page, and nothing on the landing page leads back here. Pointing at
 * admin's own manifest is all it takes, and the title is what iOS writes
 * under the icon.
 *
 * Deeper than the root layout, so this replaces the shop's rather than
 * joining it: a page gets one manifest link, and the deepest one wins.
 */
export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Sudu Admin", statusBarStyle: "default" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The login screen covers the shop's header and footer entirely: signing in
  // to admin is not a page of the shop.
  if (!(await isSignedIn())) return <AdminLogin />;

  return (
    <AdminShell signOut={logout} waiting={await waitingCounts()}>
      {/* Only here, because only admin is notified of anything. */}
      <RegisterWorker />
      {children}
    </AdminShell>
  );
}
