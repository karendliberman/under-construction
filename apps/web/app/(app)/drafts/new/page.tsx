import { causesOfAction, jurisdictions } from "@/lib/registry";
import { Picker } from "./picker";

export const dynamic = "force-dynamic";

export default function NewDraftPage() {
  // Labels and ids only. No playbook prose crosses this boundary — it isn't
  // even in this container's image.
  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">New draft</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Pick a cause of action and a jurisdiction. Options come from the
        playbook registry, so adding one is a file and a registry entry.
      </p>

      <div className="mt-8">
        <Picker causes={causesOfAction()} jurisdictions={jurisdictions()} />
      </div>

      <p className="mt-10 text-sm">
        <a href="/drafts" className="underline underline-offset-4">Back to drafts</a>
      </p>
    </main>
  );
}
