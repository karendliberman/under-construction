import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already gated this, but the layout needs the user anyway and a
  // second check costs nothing.
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} role={user.role} />
      {children}
    </div>
  );
}
