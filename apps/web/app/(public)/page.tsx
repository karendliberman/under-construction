import { RequestAccessForm } from "./_components/request-access-form";
import { PlaybookIndex } from "./_components/playbook-index";

const STEPS = [
  {
    n: "01",
    h: "Pick the combination",
    p: "Cause of action and jurisdiction. Only pairings with a written playbook appear — the procedural standard, the elements, and how that bench actually handles them.",
  },
  {
    n: "02",
    h: "Enter the facts",
    p: "A few structured fields and the narrative of the matter in your own words. No document upload, no retyping the record.",
  },
  {
    n: "03",
    h: "Read the finished draft",
    p: "A structured motion with headings, standard, argument and prayer — copied into Word in one click. Weak points marked rather than papered over.",
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
              The agent drafts. You review.
            </p>
            <h1 className="mt-5 font-serif text-[clamp(3rem,8vw,94px)] leading-[.95] tracking-[-0.02em] text-balance">
              It writes the motion.
              <br />
              <span className="text-[var(--plum)] italic">Not notes toward one.</span>
            </h1>
            <p className="mt-6 max-w-[560px] text-[19px] leading-[1.6] text-[var(--text-secondary)] text-pretty">
              Pick a cause of action and a jurisdiction. Enter the facts. A few
              minutes later there is a complete motion to dismiss on the page —
              argued against a playbook built for that exact pairing by
              litigators who bring these motions. Not a chat, not a checklist,
              not a co-pilot.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-6">
              <a
                href="#request"
                className="shadow-offset-dark bg-[var(--plum)] px-7 py-3.5 text-[15px] font-medium text-[var(--on-plum)] no-underline hover:bg-[var(--plum-hover)]"
              >
                Request access
              </a>
              <span className="font-mono text-[11.5px] tracking-[0.14em] text-[var(--text-muted)] uppercase">
                Reviewed by hand
              </span>
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

      {/* ── Honesty band ─────────────────────────────────────────────── */}
      <section className="bg-[var(--blue)] px-6 py-20 text-[var(--on-dark)] sm:px-10 sm:py-[88px]">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-2 lg:gap-[72px]">
          <div>
            <h2 className="font-serif text-[clamp(2rem,5vw,48px)] leading-tight tracking-[-0.01em] text-balance">
              It will tell you what it doesn&apos;t know.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.75] text-[rgba(246,243,238,.8)] text-pretty">
              Most legal AI fails by sounding certain. This one is instructed to
              do the opposite: mark a proposition that needs authority, say when
              a fact required by an element is missing from what you gave it,
              and describe a weak argument as weak.
            </p>
            <p className="mt-7 font-serif text-[25px] leading-[1.4] text-[var(--apricot)] italic text-pretty">
              You are a litigator. You don&apos;t need a confident assistant —
              you need one that shows its seams.
            </p>
          </div>

          <div className="border-l-[5px] border-[var(--plum)] bg-[var(--surface)] p-8 text-[var(--chocolate)] sm:p-10">
            <p className="font-mono text-[11.5px] tracking-[0.16em] text-[var(--text-muted)] uppercase">
              Stated plainly
            </p>
            <h3 className="mt-3 text-[26px] font-semibold">
              Citations are not verified
            </h3>
            <p className="mt-4 text-[16px] leading-[1.75] text-[var(--text-secondary)]">
              The draft may cite cases that do not exist, or that do not say
              what it claims. There is no retrieval layer and no citation
              checker yet. Every citation must be checked before anything is
              filed.
            </p>
            <p className="mt-5 text-[16px] leading-[1.75] font-medium text-[var(--plum)]">
              We would rather lose your interest here than have you find out
              from a judge.
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
              We are working with a small number of litigators while the
              playbooks grow. Tell us what you would use it for — a person reads
              every request.
            </p>
            <ul className="mt-8 space-y-3">
              {["Reviewed by hand", "No self-serve signup"].map((item) => (
                <li
                  key={item}
                  className="border-l-2 border-[var(--plum)] pl-4 font-mono text-[11.5px] tracking-[0.14em] text-[var(--text-muted)] uppercase"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-[var(--hairline)] bg-[var(--surface)] p-7 sm:p-10">
            <RequestAccessForm />
          </div>
        </div>
      </section>
    </main>
  );
}
