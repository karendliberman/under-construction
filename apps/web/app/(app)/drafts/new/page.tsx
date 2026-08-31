import { causesOfAction, jurisdictions } from "@/lib/registry";
import { StepRail } from "@/components/step-rail";
import { Picker } from "./picker";

export const dynamic = "force-dynamic";

export default function NewDraftPage() {
  // Labels and ids only — playbook prose is not in this container's image.
  return (
    <main className="mx-auto max-w-[940px] px-6 pt-12 pb-20 sm:px-8 sm:pt-[52px]">
      <StepRail current={1} />

      <h1 className="mt-7 font-serif text-[clamp(2.25rem,6vw,52px)] leading-tight tracking-[-0.01em]">
        Pick the combination
      </h1>
      <p className="mt-3 max-w-[620px] text-[16px] leading-[1.7] text-[var(--text-secondary)] text-pretty">
        You only see pairings that have a playbook behind them. The playbook
        decides the structure of the motion, not a generic template.
      </p>

      <div className="mt-10">
        <Picker causes={causesOfAction()} jurisdictions={jurisdictions()} />
      </div>
    </main>
  );
}
