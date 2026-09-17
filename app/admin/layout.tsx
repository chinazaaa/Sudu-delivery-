import AdminShell from "@/components/admin/Shell";
import AdminLogin from "@/components/AdminLogin";
import { isSignedIn } from "@/lib/admin-auth";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The login screen covers the shop's header and footer entirely: signing in
  // to admin is not a page of the shop.
  if (!(await isSignedIn())) return <AdminLogin />;

  return <AdminShell signOut={logout}>{children}</AdminShell>;
}
