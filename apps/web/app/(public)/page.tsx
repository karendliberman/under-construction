import { RequestAccessForm } from "./_components/request-access-form";

export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 sm:pt-28">
        <p className="text-sm font-medium tracking-wide text-accent-foreground uppercase">
          Motions to dismiss
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight sm:text-5xl">
          A first draft that already knows how these motions are won.
        </h1>
        <p className="prose-legal mt-6 text-lg text-muted-foreground">
          Pick a cause of action and a jurisdiction, enter the facts of your
          matter, and get a drafted motion to dismiss — written against a
          playbook built for that specific combination, by litigators who
          bring these motions.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a
            href="#request-access"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Request access
          </a>
          <span className="text-sm text-muted-foreground">
            Accounts are approved by hand.
          </span>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-serif text-2xl tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {[
              {
                n: "01",
                h: "Pick the combination",
                p: "Cause of action and jurisdiction. Each pairing has its own playbook — the procedural standard, the elements, and how that court actually handles them.",
              },
              {
                n: "02",
                h: "Enter the facts",
                p: "A few structured fields and the narrative of the matter. No document upload, no retyping the whole record.",
              },
              {
                n: "03",
                h: "Read the draft",
                p: "A few minutes later, a structured motion you can copy into Word — with the weak points marked rather than papered over.",
              },
            ].map((s) => (
              <li key={s.n}>
                <span className="font-serif text-sm text-accent-foreground">{s.n}</span>
                <h3 className="mt-2 font-medium">{s.h}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The honest part */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl tracking-tight">
              What it will tell you it doesn&apos;t know
            </h2>
            <p className="prose-legal mt-4 text-muted-foreground">
              Most legal AI fails by sounding certain. This one is instructed to
              do the opposite: mark a proposition that needs authority, say when
              a fact required by an element is missing from what you gave it,
              and describe a weak argument as weak.
            </p>
            <p className="prose-legal mt-4 text-muted-foreground">
              You are a litigator. You do not need a confident assistant — you
              need one that shows its seams.
            </p>
          </div>
          <div className="rounded-lg border border-accent bg-accent/40 p-6">
            <h3 className="font-medium text-accent-foreground">
              Citations are not verified
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-accent-foreground/90">
              This is stated plainly because it matters: the draft may cite cases
              that do not exist or do not say what it claims. There is no
              retrieval layer and no citation checker yet. Every citation must be
              checked before anything is filed.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-accent-foreground/90">
              We would rather lose your interest here than have you find out
              from a judge.
            </p>
          </div>
        </div>
      </section>

      {/* Request access */}
      <section id="request-access" className="border-t border-border bg-card">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="max-w-xl">
            <h2 className="font-serif text-2xl tracking-tight">Request access</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We are working with a small number of litigators while the
              playbooks grow. Tell us what you would use it for.
            </p>
            <div className="mt-8">
              <RequestAccessForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
