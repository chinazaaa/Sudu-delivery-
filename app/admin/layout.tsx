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
  if (!(await isSignedIn())) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <AdminLogin />
      </div>
    );
  }

  return <AdminShell signOut={logout}>{children}</AdminShell>;
}
