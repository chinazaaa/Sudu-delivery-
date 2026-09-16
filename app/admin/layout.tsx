import Link from "next/link";
import AdminLogin from "@/components/AdminLogin";
import { isSignedIn } from "@/lib/admin-auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isSignedIn())) return <AdminLogin />;

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/admin" className="font-semibold hover:underline">Runs</Link>
        <Link href="/admin/menu" className="hover:underline">Menu</Link>
        <Link href="/admin/promoters" className="hover:underline">Promoters</Link>
        <Link href="/admin/settings" className="hover:underline">Settings</Link>
        <form action={logout} className="ml-auto">
          <button type="submit" className="text-ink/50 hover:underline">Sign out</button>
        </form>
      </nav>
      {children}
    </div>
  );
}
