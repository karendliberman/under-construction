import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

/**
 * The signed-in chrome. Both the (app) and (admin) route groups render this, so
 * there is one definition rather than two copies drifting apart.
 *
 * Middleware has already gated these routes; this re-checks because the layout
 * needs the user anyway.
 */
export async function SignedInShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} role={user.role} fullName={user.fullName} />
      {children}
    </div>
  );
}
