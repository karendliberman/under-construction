import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function DraftsPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight">Drafts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every motion you&apos;ve drafted, most recent first.
          </p>
        </div>
        <Link href="/drafts/new" className={buttonVariants()}>
          New draft
        </Link>
      </div>

      <div className="mt-10 rounded-lg border border-dashed border-border p-16 text-center">
        <p className="font-serif text-lg">No drafts yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Start one and it will appear here. Generation arrives in Phase 3 —
          the picker works now.
        </p>
        <Link
          href="/drafts/new"
          className={buttonVariants({ variant: "outline", className: "mt-6" })}
        >
          Start a draft
        </Link>
      </div>
    </main>
  );
}
