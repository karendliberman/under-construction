import Link from "next/link";
import { Wordmark } from "./wordmark";
import { SignOutButton } from "./sign-out-button";

export function AppHeader({ email, role }: { email: string; role: string }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/drafts" className="hover:opacity-70">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/drafts" className="text-muted-foreground hover:text-foreground">
              Drafts
            </Link>
            {role === "admin" && (
              <Link href="/admin/requests" className="text-muted-foreground hover:text-foreground">
                Requests
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted-foreground sm:inline">{email}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
