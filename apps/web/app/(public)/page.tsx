import { RequestAccessForm } from "./_components/request-access-form";
import { PlaybookIndex } from "./_components/playbook-index";

const STEPS = [
  {
    n: "01",
    h: "Pick the combination",
    p: "Cause of action and court. Only pairings with a written playbook appear — the procedural standard, the elements, and how that bench actually handles them.",
  },
  {
    n: "02",
    h: "Upload the complaint",
    p: "Add the posture, who you represent, and any strategy you want the argument to take — including how hard to push, from measured to aggressive. No need to supply the surrounding law.",
  },
  {
    n: "03",
    h: "Send it",
    p: "A complete motion — caption, standard, argument and prayer — formatted and ready to go out. One click into Word.",
  },
];

export default function Home() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--hairline-warm)] bg-[var(--apricot-wash)] px-6 pt-16 pb-14 sm:px-10 sm:pt-[84px] sm:pb-[76px]">
        <div className="mx-auto grid max-w-[1240px] items-end gap-10 lg:grid-cols-[1.12fr_.88fr] lg:gap-[60px]">
          <div>
            <p className="font-mono text-[11.5px] tracking-[0.16em] text-[var(--plum)] uppercase">
              For in-house legal teams
            </p>
            <h1 className="mt-5 font-serif text-[clamp(3rem,8vw,94px)] leading-[.95] tracking-[-0.02em] text-balance">
              Send the complaint.
              <br />
              <span className="text-[var(--plum)] italic">Get back a filed-ready motion.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-[19px] leading-[1.6] text-[var(--text-secondary)] text-pretty">
              Upload the complaint, add a few details about the matter, and a
              few minutes later there is a complete motion to dismiss on the
              page — built with a playbook written for that exact cause of
              action and court. The same document outside counsel bills you
              thousands for, at a fraction of the cost.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <a
                href="#request"
                className="shadow-offset-dark bg-[var(--plum)] px-7 py-3.5 text-[15px] font-medium text-[var(--on-plum)] no-underline hover:bg-[var(--plum-hover)]"
              >
                Request access
              </a>
            </div>
          </div>

          <PlaybookIndex />
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:px-10 sm:py-[88px]">
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-serif text-[clamp(2rem,5vw,48px)] leading-tight tracking-[-0.01em]">
              Three inputs, one draft
            </h2>
            <span className="font-mono text-[11.5px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
              How it works
            </span>
          </div>

          {/* Hairline-joined grid: 1px gaps over a hairline background. */}
          <div className="mt-12 grid gap-px bg-[var(--hairline)] sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="bg-[var(--paper)] p-8 transition-colors hover:bg-[var(--apricot-wash)] sm:p-10"
              >
                <p className="font-serif text-[66px] leading-none text-[var(--plum)]">
                  {s.n}
                </p>
                <h3 className="mt-5 text-[21px] font-semibold">{s.h}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-[var(--text-secondary)] text-pretty">
                  {s.p}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The argument ────────────────────────────────────────────── */}
      <section className="bg-[var(--blue)] px-6 py-20 text-[var(--on-dark)] sm:px-10 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-2 lg:gap-[72px]">
          <div>
            <h2 className="font-serif text-[clamp(2rem,5vw,48px)] leading-tight tracking-[-0.01em] text-balance">
              Better than the brief you&apos;re paying for.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.75] text-[rgba(246,243,238,.8)] text-pretty">
              The playbooks are written by federal clerks who read motions to
              dismiss every day — the people who see which arguments land on
              this bench and which ones get denied. That judgment is encoded
              once and applied to every matter, consistently.
            </p>
            <p className="mt-5 text-[17px] leading-[1.75] text-[rgba(246,243,238,.8)] text-pretty">
              This is not an assistant that helps your team write. It produces
              the finished motion — which means the work that currently leaves
              your department at outside-counsel rates doesn&apos;t have to.
            </p>
            <p className="mt-7 font-serif text-[25px] leading-[1.4] text-[var(--apricot)] italic text-pretty">
              Thousands of dollars a motion, and a document that reads like it
              came from someone who does this every day.
            </p>
          </div>

          <div className="border-l-[5px] border-[var(--plum)] bg-[var(--surface)] p-8 text-[var(--chocolate)] sm:p-10">
            <p className="font-mono text-[11.5px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
              Where the quality comes from
            </p>
            <h3 className="mt-3 text-[26px] font-semibold">
              Encoded by the people who grade these
            </h3>
            <p className="mt-4 text-[16px] leading-[1.75] text-[var(--text-secondary)]">
              A general-purpose model writes a generic motion. This one works
              from a playbook built for one cause of action in one court — the
              procedural standard, the elements worth attacking, and how that
              court actually handles them.
            </p>
            <p className="mt-4 text-[16px] leading-[1.75] text-[var(--text-secondary)]">
              A separate citation-verification pass — independent of the model
              that writes the draft, so it cannot vouch for its own work — is
              being added now.
            </p>
          </div>
        </div>
      </section>

      {/* ── Request access ───────────────────────────────────────────── */}
      <section id="request" className="px-6 py-20 sm:px-10 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[.8fr_1.2fr] lg:gap-[60px]">
          <div>
            <h2 className="font-serif text-[clamp(2rem,5vw,48px)] leading-tight tracking-[-0.01em]">
              Request access
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-[var(--text-secondary)] text-pretty">
              Tell us which causes of action and courts you need. We add
              playbooks based on what people ask for, so the list grows toward
              the work you actually have.
            </p>
          </div>

          <div className="border border-[var(--hairline)] bg-[var(--surface)] p-7 sm:p-10">
            <RequestAccessForm />
          </div>
        </div>
      </section>
    </main>
  );
}
