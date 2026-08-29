import Link from "next/link";
import { causesOfAction, jurisdictions } from "@/lib/registry";
import { Picker } from "./picker";

export const dynamic = "force-dynamic";

export default function NewDraftPage() {
  // Labels and ids only. No playbook prose crosses this boundary — it isn't
  // even in this container's image.
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/drafts"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Drafts
      </Link>

      <h1 className="mt-6 font-serif text-3xl tracking-tight">New draft</h1>
      <p className="mt-2 text-muted-foreground">
        Every pairing below has its own playbook. Options come from the registry,
        so adding one is a file and an entry.
      </p>

      <div className="mt-8">
        <Picker causes={causesOfAction()} jurisdictions={jurisdictions()} />
      </div>
    </main>
  );
}
