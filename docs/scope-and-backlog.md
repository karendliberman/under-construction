# Under Construction — V0 Scope and Build Backlog

**Product:** "Under Construction" (working name)
**Date:** August 2026 · **Revision 2** — rewritten for the agentic worker and the two-service architecture
**Companion docs:** `under-construction-architecture.md`, `under-construction-implementation-guide.md`
**Strategic context:** `legal-ai-startup-strategy-memo.md`, `mtd-direct-to-corporate-thesis-research.md`

---

## 0. What we're building, in one paragraph

A hosted web application. A lawyer logs in, selects a **cause of action** and a **jurisdiction**, enters the facts of the case, and receives a drafted **motion to dismiss**. The drafting is done by an agent — it reads the playbook and the facts, decides what to look at next, summarises as it goes, and writes the document. Public marketing pages sit outside the login. Accounts are request-and-approve, not self-serve.

**V0 users:** Sam and Ben only. **Pilot:** a handful of outside lawyers, roughly three months out.

**The settled stack:** one repo, two services on Render — a Next.js web app in TypeScript and a Python worker running the Claude Agent SDK — with Neon Postgres as the database and as the only interface between them.

---

## 1. The scope discipline

The largest risk to this build is not technical. It is that V0 quietly grows to include document upload, citation checking, an AI that helps pick the cause of action, firm accounts and billing — and then ships in six months instead of six weeks, having proven nothing.

**The V0 question is narrow and answerable:** *does a playbook-driven agent, working from typed case facts, save Ben meaningful time on a real motion to dismiss?*

Everything that doesn't help answer that is not V0. Several things below are genuinely important and will be built — they're in §4 and §5, not deleted.

### The V0 definition of done

> Ben logs in, picks *Breach of Contract / S.D.N.Y.*, types the facts of a real matter, waits a few minutes, and copies out a draft motion to dismiss that is a better starting point than a blank page.

If that works and he says it saved him four hours, the thesis is alive. If it doesn't, no amount of citation verification or record ingestion would have saved it.

### One hard constraint on V0, stated loudly

**V0 output has unverified citations.** There is no retrieval layer and no cite-checker — the agent's tools are deliberately limited to reading the inputs and writing the document, with no web access. It may cite cases that do not exist or do not say what the draft claims. Damien Charlotin's AI Hallucination Cases database listed 1,922 cases as of 16 August 2026 — growing at roughly five a day, and now including filings produced with commercial legal tools, not just chatbots.

Fine for two litigators who know to verify. **Not** fine to hand an outside lawyer without a very explicit warning, which is why citation verification is the first V1 item and gates the pilot. Build the banner into the draft viewer in V0 — not as a fig leaf, but so the habit of verifying is there from the first draft anyone reads.

---

## 2. The backlog, sequenced

Each phase ends at something you can look at. Estimates assume Karen and Claude Code in focused sessions, and are deliberately rough.

### Phase 0 — Foundations (~3–4 sessions)

Nothing user-visible. More setup than the single-service version, because there are two services from the start — but doing it now is much cheaper than splitting later.

| # | Task | Notes |
|---|---|---|
| 0.1 | Create the monorepo: `apps/web` (Next.js + TS), `services/agent` (Python), `packages/db`, `playbooks/` | Layout in the implementation guide §0 |
| 0.2 | A real **Dockerfile for each service** | This is the migration insurance. Everything else follows from getting these right |
| 0.3 | Neon Postgres, dev and prod, with migrations owned by the TypeScript side only | Two migration tools against one database is a nasty failure mode |
| 0.4 | Both services deploying on Render from the one repo, with path-filtered CI | A playbook edit rebuilds only the worker (its image contains `playbooks/`); a CSS change rebuilds only the web app. Check what Render's preview environments need for a multi-service repo before relying on them |
| 0.5 | Secrets as environment variables in local, preview and production. Nothing in git | A leaked Anthropic key is a boring and expensive way to lose money |
| 0.6 | Prove the pipe: the web app writes a row, the worker reads it and writes back, in production | Do this before any real feature depends on it |
| 0.7 | `CLAUDE.md` at the repo root with the invariants | Implementation guide §8 |

**Milestone:** two deployed services passing a message to each other through the database.

> **Status: done, 29 August 2026.** `uc-web` and `uc-agent` are live on Render
> against Neon; a row posted to the web service is claimed by the worker and
> completed in ~3s. Cost is ~$7/month — the worker on starter, the web service
> on free. Phases 1 and 2 do not touch the worker, so it can be suspended until
> Phase 3, which is also when it needs a 1 CPU / 2 GB instance for the ~1 GiB
> per-agent floor. Remaining scaffolding: `pipe_checks` and `/api/pipe`, both
> to be removed when the real `generations` table lands.

### Phase 1 — Walls and doors (~3–4 sessions)

| # | Task | Notes |
|---|---|---|
| 1.1 | Public marketing page | One page. Name, what it does, a "Request access" button. Do not design a website |
| 1.2 | `users` table with a password hash and a `status` of approved / suspended | bcrypt or argon2. Two lines. Users are only created on approval, so there is no pre-approval state |
| 1.3 | Login, logout, session cookie with a real expiry | A couple of weeks, not forever |
| 1.4 | Middleware gating `/drafts/*`, `/admin/*` and `/api/generations/*` on a valid session **and** `status = 'approved'` | One choke point. Two separate questions |
| 1.5 | "Request access" form → `access_requests` row | Unauthenticated — rate-limit it |
| 1.6 | Admin page: list requests, approve, deny | Ugly is fine. A table and two buttons |
| 1.7 | Approval creates the user and emails a set-your-password link | No self-serve reset in V0 — they email us |

**Milestone:** request an account, approve yourself, set a password, log in, land on an empty home screen.

### Phase 2 — The playbook layer (~2–3 sessions)

Deliberately before the generation code, because the generation code is straightforward once this shape is settled.

| # | Task | Notes |
|---|---|---|
| 2.1 | Playbook directory layout and `registry.yaml` | Architecture doc §5 |
| 2.2 | `resolve_playbook(cause_of_action, jurisdiction) → text`, in the **worker** | **One** module, and only the worker reads playbook prose — so the text never enters the web service at all |
| 2.3 | Ben authors the first **two** playbooks end to end | Two, not ten. You discover the shape by writing two and noticing what they share |
| 2.4 | The picker UI reads its options from `registry.yaml` — labels and filenames only, no prose | Adding a cause of action becomes "add a file" |
| 2.5 | A preview **CLI** that prints the composed playbook without calling the model | How Ben checks his own work, and how you debug bad output. A script rather than a web page, so prompt text stays out of the web tier |

**Milestone:** the preview CLI prints the exact playbook text the worker *would* use for any valid combination — and the web app can list the combinations without ever seeing that text.

> **Sequencing note, from the strategy memo:** "the encoding work is not preparation for building the product — it is the product." Ben writing playbooks is not blocked on engineering. It should run in parallel from week one, and it is the critical path.

### Phase 3 — The agent worker (~4–5 sessions)

The heart of it, and the phase that grew when we went agentic.

| # | Task | Notes |
|---|---|---|
| 3.0 | **Set the spend controls before the first API call:** a budget alert in the Anthropic console, and an app-side cap computed from the `generations` table that refuses new jobs above a threshold | The console gives you an *alert*, not a hard stop — the refusal has to live in your code. Agent cost is variable; an overnight retry loop is expensive and avoidable |
| 3.1 | `matters` and `generations` tables, with `status` doubling as the queue | Architecture doc §7 |
| 3.2 | Case-facts form: a few structured fields plus a large free-text narrative | Don't over-engineer it. The narrative does most of the work in V0 |
| 3.3 | `POST /api/generations` → row with `status = 'queued'`, returns an id immediately | Async is not optional with an agent |
| 3.4 | Worker job loop: claim with `SELECT … FOR UPDATE SKIP LOCKED`, set `running` | Gives you free concurrency when a second worker is added |
| 3.5 | Per-job working directory: create, write `playbook.md` and `facts.md`, pass as `cwd` | Lifecycle is a security control — see 3.9 |
| 3.6 | The Agent SDK call: minimal tool allowlist, `maxTurns`, isolation env vars | Architecture doc §6. Get this configuration right the first time |
| 3.7 | Read `motion.md`, write it and the cost record to the row, set `complete` | Turns used, tokens, cost, latency |
| 3.8 | Failure path: `failed` with a plain-language message, plus a retry button | The most-used feature of any V0 |
| 3.9 | **Delete the working directory on success and on failure** | Client facts should not accumulate on a container's disk |
| 3.10 | Stale-job sweeper: `running` past a wall-clock limit → `failed` | So a crashed worker doesn't strand jobs forever |
| 3.11 | Status polling endpoint, and a client that polls every 3s with elapsed time shown | A silent two-minute wait feels broken |
| 3.12 | Draft viewer: rendered text, copy button, unverified-citations banner | Copy is the deliverable |

**Milestone:** V0 is done. Ben drafts a real motion.

### Phase 4 — Sharp edges before anyone else touches it (~2–3 sessions)

Small, cheap, and the difference between an internal toy and something you'd let a colleague use. More important than it was under the single-call design, because agent cost is variable and agent behaviour is not fully predictable.

| # | Task |
|---|---|
| 4.1 | Cost dashboard: spend to date, cost per draft, and an alert when a single run exceeds a threshold (the cap itself went in at 3.0) |
| 4.2 | Per-user rate limit on generation |
| 4.3 | Generation history — every draft a user has made, most recent first |
| 4.4 | Structured logging per run: turns used, tools called, cost, latency. Errors to Sentry with an alert that reaches your phone |
| 4.5 | Eval fixtures: N saved fact patterns per cause of action, a script to run them, a diff against the last run. Expect variance — the agent is non-deterministic by design |
| 4.6 | Audit log table: who did what, when |
| 4.7 | A worker concurrency limit sized to the instance's RAM (Anthropic's floor is ~1 GiB per concurrent agent) |

**Milestone:** you'd let a friendly outside lawyer use it without wincing.

---

## 3. What is explicitly NOT in V0

| Not in V0 | Why | When |
|---|---|---|
| Case-law retrieval and citation verification | The most valuable V1 feature, and it means adding a tool to the agent — a deliberate widening of §6's allowlist | **V1, first** |
| Web access for the agent | Same reason. Deny-by-default until a feature requires it | V1 |
| AI that helps pick the cause of action | The picker is a dropdown | V1+ |
| Document / record upload | Large scope: parsing, storage, PII handling. MTDs are drafted off the complaint and the facts | V1 |
| Resumable agent sessions (`SessionStore`) | Would mean persisting client facts and model reasoning into a new store — needs a deliberate confidentiality decision | V1, if at all |
| Playbooks as Agent SDK Skills | Attractive, and a real change in agent behaviour. Not while V0's job is to establish whether the playbooks work at all | V1 |
| In-app editing, `.docx` export | They copy into Word, which is where they work | V1 |
| Playbook admin UI | Decided: files first. Revisit when Ben's editing friction bites | V1 |
| Firm accounts, tenancy, billing | Building tenancy before tenants is the classic waste | V1/V2 |
| Notifications, streaming output | See parking lot | V1 |

---

## 4. V1 — the pilot-ready list (roughly months 2–4)

**Gates the pilot — must exist before an outside lawyer's client facts touch the system:**

1. **Citation verification.** A separate, *non-generative* pass that checks every citation exists and stands for what's claimed. The memo is emphatic: Clearbrief's wedge is deliberately classic-AI rather than generative, so the checker can't itself hallucinate. Paxton's benchmark accuracy comes substantially from abstention — the agent should be able to say "I'm not sure about this one."
2. **Confidentiality posture.** A Zero Data Retention agreement with Anthropic — requires their approval, arranged per organisation, so **start it early**. A signed DPA, encryption of case-fact fields at rest, a deletion path, and a written data-handling summary for a firm's malpractice carrier. The memo notes carriers now ask what AI tools firms use; having this ready is a *sales asset*.
3. **Terms of service and engagement terms**, drafted by an actual lawyer. The memo calls this the one place to spend real money on outside counsel before launch. Also unresolved: whether the product is a tool the firm uses or work product we deliver. The MTD research memo flags *United States v. Heppner* (S.D.N.Y., Feb 2026), which held that AI-drafted legal-strategy material produced **independently of** counsel's direction gets no privilege and no work-product protection, and does not become privileged retroactively by being sent to counsel — while *Warner v. Gilbarco* (E.D. Mich., Feb 2026) reached the opposite result on different facts. So this is an open split, not settled law, and it is a question for an ethics lawyer rather than for us.
4. **Eval harness with a real golden set** per cause of action, tolerant of the agent's run-to-run variance, so a playbook edit that makes output worse is caught before a lawyer sees it.
5. **MFA**, at which point moving to Clerk is probably cheaper than building it.

**Makes it good:**

6. Playbook admin UI with versioning, draft/publish and rollback
7. Draft history with re-run and version diffing
8. `.docx` export with the firm's formatting
9. Structured complaint upload — parse the complaint being dismissed rather than typing its allegations
10. Streaming the agent's progress, and notifications when a long job finishes
11. Per-firm tenancy and per-seat or per-motion metering
12. **Outcome tracking** — granted, denied, granted in part. The memo's real moat. The column exists from V0; this is the UI and the habit

---

## 5. Parking lot — the far-future list

### "Can we connect to their SSHs? Is there a point?"

Almost certainly not SSH, but the underlying want is real. SSH is a remote shell into a machine, and no law firm should give a vendor shell access to their systems. What you actually want is **access to where their documents live**, and that has proper answers: the Clio API (and the Clio App Directory, which the strategy memo names as free distribution into the small-firm installed base), NetDocuments, iManage, SharePoint/OneDrive, Dropbox. All OAuth, scoped and revocable.

So: yes, there's a point, and the answer is document-system integrations. Worth doing when a customer says "I don't want to retype facts already in my matter file" — which will happen, and is a good problem.

### Security and hardening

Three things that get conflated:

- **Prompt injection.** The live surface, and sharper now that the drafting is agentic: case facts are untrusted input, and an agent takes *actions* based on what it reads. The V0 mitigations are configuration, not filtering — a deny-by-default tool allowlist, a per-job working directory, `maxTurns`, no network beyond Anthropic, and settings isolation. Architecture doc §6. Beyond that: output validation, and never letting model output trigger a side effect without a human in between.
- **Credential security.** Hashing is in V0. MFA, lockout and self-serve reset arrive with outside users.
- **Encryption and compliance.** TLS (free), encryption at rest (Neon's default), field-level encryption of case facts (V1), audit logging (Phase 4), SOC 2 Type II when a customer asks — and it will be a customer, not a regulator, who asks first. Treat the package as a sales asset.

A penetration test before outside users is premature. Before paying firms, it isn't.

### Notifications when a draft is done

Small, worth doing in V1, and more valuable with an agent because runs are longer and more variable. Three tiers, cheapest first: change the tab title and favicon while running (pure client-side, ~20 lines — do this early, it's nearly free and it's what people actually notice); a browser notification via the Notification API; an email when the job finishes, which works everywhere and needs no permission.

### Also parked

- **The judge layer** — the memo's fourth playbook layer: this judge's prior rulings, preferences, page limits. Premium feature, real differentiation, needs data we don't have.
- **Opposition mode** — given a motion to dismiss, draft the opposition. Same playbooks, inverted. Doubles the work per matter.
- **Model routing and fallback** — one provider is a single point of failure for the whole product.
- **Managed Agents** — Anthropic's hosted agent runtime would remove most of the worker's hosting complexity. As of August 2026 it is in beta and ineligible for ZDR or a HIPAA BAA, which is disqualifying today. Re-check before the pilot.
- **Cloud Run** — cheaper at scale and a better fit once we outgrow Render. Because both services are plain containers, this should be days rather than weeks whenever the hosting bill or a security review makes it worthwhile.

---

## 6. Where the real risk sits

**The playbooks are the critical path, not the code.** Technically this is a form, a queue, and an agent loop. Karen and Claude Code can build it. Whether it's worth anything depends on whether Ben's playbooks make the agent's output meaningfully better than Sam pasting the same facts into a Claude subscription. That is the experiment; the software is the apparatus. If the schedule slips, it should slip on the software side.

**Do the cheap comparison before Phase 3.** Take one real matter and have Ben produce a motion two ways: with the playbook pasted in by hand, and with no playbook. If the playbook version isn't clearly better, you've learned the most important thing in the plan for the price of an afternoon — and no architecture fixes it.

**Agent cost is variable, and that's new.** A single call has a cost you can predict. An agent that decides to re-read the facts four times can cost several times as much, and the variance is the point. The spend cap in Phase 4.1 should be set before the first API call, not after the first surprising bill.

**The legal housekeeping in the strategy memo gates all of this.** §7.4 and §V2.10: Karen's Palantir IP assignment, Sam and Ben's outside-activity restrictions. Cheap to check now, existential later. Confirm they've been checked before Phase 0, not after Phase 4.
