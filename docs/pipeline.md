# Under Construction — The Drafting Pipeline

**Date:** September 2026 · **Revision 3**
**Companion docs:** `under-construction-architecture.md`, `under-construction-implementation-guide.md`, `under-construction-v0-scope-and-backlog.md`

This is the spec for how a motion to dismiss actually gets built: the node graph, each node's contract, the artifacts on disk, and the orchestration. It is written to be handed to Claude Code a node at a time.

**What revision 3 changed**, all from Karen and Ben:

- **"Topic" is the right word, and it is not a synonym for "count."** Ben's point: some topics are causes of action the plaintiff pleaded; others are threshold defenses that exist independently of what was pleaded, and are worth pursuing only if a precondition holds. Revision 2 collapsed these. They now have distinct handling — §1 and node 01.
- **No human in the loop.** The confirmation step is removed entirely, along with all its plumbing.
- **The complaint arrives as pasted text**, not a PDF. No parsing.
- **Jurisdiction is deferred** — one hardcoded jurisdiction in V0.

---

## 0. The shape in one paragraph

A complaint comes in as text. One agent reads it and identifies the **topics** worth pursuing — some are counts the plaintiff pleaded, some are threshold defenses whose preconditions are satisfied. Each topic fans out to an agent that finds the specific **issues** to argue. Each issue fans out again to a **researcher** (which has web access) and then a **drafter**. The per-issue drafts fan back in to a **combiner**, a **background writer**, a deterministic **assembler**, and a **citation verifier** that checks one citation per call and may answer "uncertain."

Two levels of fan-out, one fan-in, nine nodes, two of them with no model. At a typical three or four topics with two or three issues each, expect roughly **40 agent runs** per motion including verification.

---

## 1. Two kinds of topic

This is the correction that matters most, and it changes what node 01 does.

**Count topics** come from what the plaintiff pleaded. Count I is Breach of Contract; the cause of action is given, and the work is element analysis — which elements did they fail to plead adequately. The attack is Rule 12(b)(6), and the playbook stack is procedural + that cause of action.

**Threshold topics** are defenses available regardless of what was pleaded: personal jurisdiction, venue, subject-matter jurisdiction, service, limitations, arbitration, exhaustion. The plaintiff didn't raise them and won't have pleaded around them. Each one has its **own** framework rather than a list of elements, its own Rule 12(b) subsection, and — Ben's key point — a **precondition** that decides whether it's worth a thought at all.

> Personal jurisdiction can only be argued if the defendant isn't at home in the forum. If the client is headquartered in the forum state, there is nothing to think about, and the pipeline should say so and move on rather than spending a researcher on it.

So node 01's job differs by kind. For a count it asks *what's underpleaded*. For a threshold defense it asks *does the gating condition hold* — and only opens a branch if it does.

### Why the threshold branch has a completeness requirement the count branch doesn't

Worth raising because it changes how node 01 should behave, and it's for Ben to confirm rather than me to assert.

Missing an underpleaded element costs you one argument you could have made. But under Rule 12, several threshold defenses — personal jurisdiction, venue, process, service — are **waived** if they're omitted from the first Rule 12(b) motion, and Rule 12(g)(2) bars raising them in a second one. Subject-matter jurisdiction is the exception and is never waived.

If that's right, then **missing a threshold defense doesn't cost you an argument, it costs you the defense permanently.** Which means node 01 should run threshold defenses as an **exhaustive checklist**, not a creative scan, and record every one it considered with the reason it was ruled out. Two benefits: the lawyer can see the checklist was run, and "considered and ruled out because ¶3 pleads a New York principal place of business" is a genuinely useful output even when the answer is no.

**Ben: is the waiver rule as I've described it, and is this the right list?** A starting checklist for him to correct:

| Defense | Rule | Precondition worth testing | Waived if omitted? |
|---|---|---|---|
| Subject-matter jurisdiction | 12(b)(1) | No federal question; or diversity incomplete or amount at or below the threshold | No — never waived |
| Standing / ripeness / mootness | 12(b)(1) | No concrete injury, causation or redressability pleaded | No |
| Personal jurisdiction | 12(b)(2) | Defendant not at home in the forum, and no forum-directed conduct pleaded | **Yes** |
| Improper venue | 12(b)(3) | No defendant resides in the district and no substantial part of the events occurred there | **Yes** |
| Insufficient process | 12(b)(4) | Summons defective on its face | **Yes** |
| Insufficient service | 12(b)(5) | Service not effected, or not on a proper agent, or out of time | **Yes** |
| Failure to state a claim | 12(b)(6) | — this is the count branch | No |
| Failure to join a required party | 12(b)(7) | An absent party whose absence prejudices someone | No |
| Statute of limitations | 12(b)(6) | Accrual-to-filing interval exceeds the period **on the face of the complaint** | No |
| Rule 9(b) particularity | 12(b)(6) | A fraud-based claim pleaded without the who/what/when/where | No |
| Arbitration clause | motion to compel / dismiss | A contract covering the dispute contains an arbitration clause | Contract-dependent |
| Forum selection clause | 12(b)(3) / transfer | Same, for a forum clause | Contract-dependent |
| Failure to exhaust | varies | A statute requires exhaustion and the complaint doesn't plead it | Varies |
| Preemption | 12(b)(6) | A federal scheme occupies the field | No |
| Immunity | varies | Defendant is a government actor or otherwise immune | Varies |
| Res judicata / collateral estoppel | 12(b)(6) | A prior judgment on the same claim, apparent on the face | No |

**I'm not a lawyer and this table is a scaffold, not authority.** It's the first draft of `analysis/threshold-defenses.md`, which is Ben's file to write.

### The input problem this creates

Several of those preconditions turn on facts the **complaint won't tell you** — where the client is actually incorporated, whether there's a contract with an arbitration clause, when service was effected. The plaintiff's characterisation isn't reliable and sometimes isn't there at all.

So the pipeline needs a second, small input: **a short client-facts form** alongside the pasted complaint. Not a document, not a parse — a handful of fields:

```
state_of_incorporation, principal_place_of_business, date_served,
contract_governs_dispute (bool), contract_has_arbitration_clause (bool),
contract_has_forum_clause (bool), prior_related_judgment (bool),
is_government_actor (bool), notes (free text)
```

Written to `client_facts.md` and read by node 01 alongside the complaint. Cheap to build, and without it the threshold half of the pipeline is guessing. **Open question — worth confirming with Ben which fields actually earn their place.**

---

## 2. The node graph

```
complaint.md  +  client_facts.md
     │
     ▼
  01 Topic Identifier ──────────────► topics.json
     │                                (counts + threshold defenses that passed
     │                                 their precondition, plus the full checklist)
     │
     ├─── fan out, one branch per pursued topic (×N) ─────────┐
     ▼                                                        │
  02 Issue Spotter ─────────────────► topics/<t>/issues.json  │
     │   playbook depends on topic kind                       │
     │                                                        │
     ├─── fan out, one branch per issue (×M) ──────┐          │
     ▼                                            │          │
  03 Issue Researcher   WEB ACCESS ──► cases.json  │          │
     ▼                                            │          │
  04 Research Gate      no model ────► gate.json   │          │
     ▼                                            │          │
  05 Issue Drafter ─────────────────► draft.md     │          │
     └────────────────────────────────────────────-┘          │
     └────────────────────────────────────────────────────────-┘
     │
     ▼   fan in
  06 Draft Combiner ────────────────► argument.md + citations.json
     ▼
  07 Background Writer ─────────────► background.md
     ▼
  08 Assembler          no model ───► motion.md
     ▼
  09 Citation Verifier ─────────────► one verdict per citation
     ▼
  [ repair: re-draft → re-combine → re-assemble → re-verify ]
     ▼
  motion.md + verification.json
```

No human anywhere in it. Node 01's output goes straight to the fan-out.

---

## 3. The working directory — the single authoritative layout

Every path in §4 refers to this tree. **If a path isn't here, it doesn't exist.** One tree per job, created by the worker, deleted in `finally`.

```
/tmp/gen-<generation_id>/
  complaint.md                      pasted text, verbatim
  client_facts.md                   the short form
  topics.json
  playbooks/
    <topic_id>/
      issue_spotter.md              composed per node — layers differ per node
      issue_researcher.md
      issue_drafter.md
    _global/
      topic_identifier.md
      draft_combiner.md
      background_writer.md
      citation_verifier.md
  topics/
    <topic_id>/                     e.g. t1
      issues.json
      issues/
        <issue_id>/                 e.g. t1-i1
          research/
            cases.json
            gate.json
          draft.md
  cases/                            shared, deduplicated, the ONLY copy of case text
    <case_key>.md                   case_key = sha256 of the normalised citation
    <case_key>.meta.json
  argument.md
  citations.json                    the case_keys actually cited, written by node 06
  background.md
  motion.md
  verification.json                 written by the ORCHESTRATOR, not by node 09
```

**Three properties worth preserving.**

**Playbooks are per node, not per branch.** §9 shows the layers genuinely differ — the Spotter needs the procedural standard, the Drafter needs house style and not the procedural standard. One file per branch cannot serve both.

**Case text lives in exactly one place.** *Iqbal* will be found by six researchers. `cases.json` stores a `case_key` — the sha256 of the normalised citation — never a path or a copy. When `fetch_case` resolves a citation already present it returns the existing key rather than re-fetching. This is also why case ids must not be per-issue sequential: `cs1` would collide across branches.

**The trace is in the database, not in this tree.** `generation_nodes` (§7) holds the whole record, and no case facts.

---

## 4. Node contracts

Every node is a separate `query()` call with its own tool allowlist, its own `max_turns`, and its own composed playbook. **Orchestration is your Python code, not a model's decision** — see §6.

### 01 Topic Identifier

| | |
|---|---|
| **Reads** | `complaint.md`, `client_facts.md`, `playbooks/_global/topic_identifier.md` |
| **Writes** | `topics.json` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob` |
| **Playbook layers** | guardrails + `analysis/read-complaint.md` + `analysis/threshold-defenses.md` |
| **Model** | `claude-opus-5`, generous `max_turns` — it runs a checklist, not a single pass |

```jsonc
// topics.json
{
  "case_caption": "Acme Corp. v. Smith, No. 1:26-cv-01234",
  "court_as_captioned": "United States District Court, S.D.N.Y.",

  "topics": [
    {
      "id": "t1",
      "kind": "count",
      "label": "Count I — Breach of Contract",
      "cause_of_action_proposed": "breach-of-contract",
      "rule": "12(b)(6)",
      "complaint_paragraphs": [14, 15, 16, 22],
      "pursue": true,
      "rationale": "Pleads the agreement by reference only; no allegation of Acme's own performance."
    },
    {
      "id": "t2",
      "kind": "threshold",
      "label": "Failure to exhaust administrative remedies",
      "defense_key": "failure-to-exhaust",
      "rule": "12(b)(6)",
      "precondition": {
        "test": "A statute requires exhaustion and the complaint does not plead it",
        "met": true,
        "evidence": "Title VII claim at ¶31; no EEOC charge or right-to-sue letter pleaded anywhere.",
        "source": "complaint",
        "confidence": "high"
      },
      "pursue": true,
      "waiver_risk": false
    }
  ],

  // EVERY threshold defense considered, including the ruled-out ones.
  // This is the completeness record — see §1.
  "threshold_checklist": [
    {
      "defense_key": "personal-jurisdiction",
      "rule": "12(b)(2)",
      "precondition_met": false,
      "reason": "Complaint ¶3 and client_facts both place Acme's principal place of business in New York; forum is S.D.N.Y. Defendant is at home in the forum.",
      "source": "complaint + client_facts",
      "confidence": "high",
      "waiver_risk": true
    },
    {
      "defense_key": "statute-of-limitations",
      "rule": "12(b)(6)",
      "precondition_met": false,
      "reason": "Complaint does not plead an accrual date, so the interval is not apparent on the face.",
      "source": "complaint",
      "confidence": "low",
      "waiver_risk": false
    }
  ],

  "topics_without_playbook": [
    { "label": "Count IV — Unjust Enrichment", "guess": "unjust-enrichment", "kind": "count" }
  ]
}
```

**Five things about this node.**

**`kind` drives everything downstream.** It selects node 02's playbook, and for a count it also selects the cause-of-action layers. The orchestrator resolves `cause_of_action_proposed` and `defense_key` against the registry — the model proposes, the orchestrator validates. Anything unresolvable moves to `topics_without_playbook` and is reported rather than improvised around.

**`threshold_checklist` is the deliverable even when it's all `false`.** Every defense on the list, with the reason. This is the completeness record from §1, and it's useful output on its own — a lawyer reading "PJ ruled out because ¶3 pleads a New York PPB" learns something.

**`waiver_risk: true` deserves loud treatment in the UI.** A defense ruled out at `confidence: low` that's also waivable is the single most dangerous cell in the output: if the pipeline is wrong, the defense is gone for good. Surface those specifically rather than burying them in a list.

**`confidence: low` needs a policy, since nobody is confirming anything.** Two defensible options and it's Ben's call: *pursue anyway* (a wasted branch is cheap; a waived defense is not), or *rule out but flag prominently*. For anything with `waiver_risk: true` I'd default to pursuing — the asymmetry is stark.

**`source` matters.** A precondition answered from `client_facts` is more reliable than one answered from the plaintiff's characterisation, and worth recording so the lawyer knows which is which.

### 02 Issue Spotter — one per pursued topic

| | |
|---|---|
| **Reads** | `complaint.md`, `client_facts.md`, `topics.json`, `playbooks/<t>/issue_spotter.md` |
| **Writes** | `topics/<t>/issues.json` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob` |
| **Model** | `claude-opus-5` |

**The playbook differs by topic kind**, which is the whole reason node 01 records `kind`:

| Topic kind | Playbook layers | What the node is doing |
|---|---|---|
| `count` | guardrails + `procedural/rule-12b6-federal.md` + `causes-of-action/<coa>.md` | Element analysis: which elements are inadequately pleaded |
| `threshold` | guardrails + `procedural/<rule>.md` + `defenses/<defense_key>.md` | Framework analysis: which prongs of this defense's own test are arguable |

Note `procedural/<rule>.md` — a Rule 12(b)(2) motion is not a Rule 12(b)(6) motion, and the standard recited differs. That's one playbook file per rule subsection you support, and node 08 templates the matching legal-standard section.

```jsonc
// topics/t1/issues.json  — a count topic
{
  "topic_id": "t1",
  "kind": "count",
  "issues": [
    {
      "id": "t1-i1",
      "frame": "element",
      "target": "Plaintiff's own performance",
      "deficiency": "No allegation that Acme performed or was excused from performing.",
      "strength": "strong",
      "complaint_paragraphs": [15, 22],
      "argue": true
    }
  ],
  "adequately_pleaded": ["Existence of a contract", "Damages"]
}
```

```jsonc
// topics/t2/issues.json  — a threshold topic
{
  "topic_id": "t2",
  "kind": "threshold",
  "issues": [
    {
      "id": "t2-i1",
      "frame": "prong",
      "target": "No EEOC charge pleaded",
      "deficiency": "Title VII requires a charge and right-to-sue letter; neither appears in the complaint.",
      "strength": "strong",
      "complaint_paragraphs": [31],
      "argue": true
    }
  ],
  "adequately_pleaded": []
}
```

Same shape, one `frame` field distinguishing them, so nodes 03–06 need no special-casing. Recording `adequately_pleaded` is worth the tokens: it stops the next run re-litigating settled ground, and it makes the issue-spotting report useful independently of the draft.

### 03 Issue Researcher — one per issue · the only node with web access

| | |
|---|---|
| **Reads** | `topics/<t>/issues.json`, `complaint.md`, `playbooks/<t>/issue_researcher.md` |
| **Writes** | `topics/<t>/issues/<i>/research/cases.json`; case text via `fetch_case` into `cases/` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob`, `WebSearch` (domain-pinned), **`fetch_case`** (custom) |
| **Playbook layers** | guardrails + `research/finding-authority.md` |
| **Model** | `claude-opus-5`, `max_turns` generous — this node legitimately needs many |

```jsonc
// topics/t1/issues/t1-i1/research/cases.json
{
  "issue_id": "t1-i1",
  "cases": [
    {
      "case_key": "a3f1c8…",            // returned by fetch_case; indexes cases/
      "citation": "Ashcroft v. Iqbal, 556 U.S. 662 (2009)",
      "court": "U.S.", "year": 2009,
      "url": "https://www.courtlistener.com/opinion/...",
      "binding": true,
      "relevance": "Sets the plausibility standard the conclusory performance allegation fails.",
      "key_passages": [
        { "quote": "a complaint must contain sufficient factual matter", "pin_cite": "556 U.S. at 678" }
      ]
    }
  ],
  "gaps": ["No circuit case squarely on excuse-of-performance pleading."]
}
```

**Two hard constraints.**

**Use a custom `fetch_case` tool, not a web-fetch tool, and the reason is functional rather than security.** Claude Code's `WebFetch` converts the page and then runs an extraction prompt through a small model, so what returns is that model's answer rather than the page text. The server-side `web_fetch` tool behaves differently and returns document content — but either way you don't control what lands on disk, and nodes 04 and 09 need the text verbatim to check quotes against. So: `WebSearch` for discovery, `fetch_case` for retrieval. It's an in-process Python tool that fetches the URL, normalises the citation, writes full text to `cases/<case_key>.md` if absent, and returns the key plus a preview.

**Never retrieve Westlaw or Lexis content.** Raw opinions and statutes are public domain — CourtListener, the Caselaw Access Project, govinfo, Cornell LII. Headnotes and editorial content are not. In *Thomson Reuters v. ROSS Intelligence* the court granted partial summary judgment in February 2025 on direct infringement of 2,243 Westlaw headnotes and rejected fair use at that stage; the question went to the Third Circuit on interlocutory appeal, so the holding isn't final. ROSS itself ceased operations in 2021 under the cost of the litigation. **The unsettled appeal is a reason to be more conservative, not less.** Enforce it with an allowlist in code — pin `WebSearch` with `allowed_domains` and hard-allowlist the domains `fetch_case` accepts. A model told not to visit a domain is a request; an allowlist is a control.

**DECIDED, September 2026 (Karen): no legal-database API. Public web only.** `fetch_case` does a plain HTTP GET against an allowlisted public-domain source and extracts the opinion text from the page. No account, no token, no API terms to negotiate.

This resolves the open question that stood here. Per the MTD research memo, CourtListener's *API membership* terms are scoped to personal, research and journalistic use rather than commercial products, and the memo advised contacting Free Law Project before building a commercial product on the API. Not using the API sidesteps that entirely. The underlying opinions are public domain either way; invariant 9 and the domain allowlist are what keep us clear of Westlaw and Lexis editorial content, and neither depends on how we fetch.

Two consequences to build for rather than discover:

- **Extracting text from HTML is more brittle than parsing JSON.** A layout change gives us a page of navigation chrome instead of an opinion. This is precisely what node 04 is for: `text_present` rejects a file that is too short to be an opinion, and `quotes_verbatim` rejects one whose text does not contain the quoted passage. A bad extraction costs that case, not the issue. Do not paper over extraction failures inside `fetch_case`; let the Gate see them.
- **Be a good citizen.** Identify the client in a `User-Agent`, respect `robots.txt`, rate-limit ourselves, and cache by `case_key` so the same opinion is fetched once per job rather than once per researcher. The dedup in §3 was written for token cost; it is now also what keeps our request volume defensible.

### 04 Research Gate — deterministic, no model

| | |
|---|---|
| **Reads** | `research/cases.json`, `cases/<case_key>.md` |
| **Writes** | `research/gate.json` |
| **Tools** | none — plain Python |

```jsonc
{
  "issue_id": "t1-i1",
  "verdicts": [
    { "case_key": "a3f1c8…", "passed": true,
      "checks": { "text_present": true, "citation_parses": true, "quotes_verbatim": true, "domain_allowed": true } },
    { "case_key": "b7d200…", "passed": false, "failed": ["quotes_verbatim"],
      "detail": "key_passages[0] not found in fetched text" }
  ],
  "cases_passed": 1,
  "cases_rejected": 1,
  "proceed": true          // true when cases_passed >= 1
}
```

Per case: does the text file exist and is it non-trivial? Does each `key_passages[].quote` appear **verbatim** after whitespace normalisation? Does the citation parse into a recognisable reporter format? Was the URL allowlisted?

**`proceed` is true when at least one case passes**, not when all do. One invented quote among four good cases should cost that case, not the issue. Only `cases_passed == 0` skips the issue, and that gets recorded and reported.

**Why this node exists.** The end-stage verifier catches these too, but only after paragraphs have been written around them. This gate catches the cheap mechanical class — case doesn't exist, quote was invented — before drafting, using no model at all. The engineering logic stands on its own: a verifier that can hallucinate is not a verifier. Keep this node dumb on purpose.

### 05 Issue Drafter — one per issue

| | |
|---|---|
| **Reads** | `topics/<t>/issues.json`, `research/cases.json`, `research/gate.json`, `cases/<key>.md` for passed keys, `complaint.md`, `playbooks/<t>/issue_drafter.md` |
| **Writes** | `topics/<t>/issues/<i>/draft.md` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob` — **no web access** |
| **Playbook layers** | guardrails + `_shared/house-style.md` + (`causes-of-action/<coa>.md` or `defenses/<defense_key>.md`) |
| **Model** | `claude-opus-5` |

The orchestrator passes the gate-passed key list explicitly; the drafter cites nothing else. Output is markdown with a pin cite on every citation, plus YAML front matter listing the `case_key`s used — which is what lets node 06 build `citations.json` without re-parsing prose.

### 06 Draft Combiner — fan-in

| | |
|---|---|
| **Reads** | every `topics/*/issues/*/draft.md`, `topics.json`, `playbooks/_global/draft_combiner.md` |
| **Writes** | `argument.md`, `citations.json` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob` |
| **Model** | `claude-opus-5` |

Orders the argument, adds headings, removes duplicated recitations of the legal standard, smooths transitions.

**Ordering is now a real decision, not a formatting one.** Threshold defenses conventionally come before merits arguments — a court that lacks jurisdiction never reaches whether a claim is adequately pleaded — so the Combiner should group `kind: threshold` topics ahead of `kind: count` ones and say so in the playbook. Within each group, strongest first or complaint order.

**It must union the front-matter `case_key` lists into `citations.json`.** That file is the authoritative list of what the motion cites; node 08's table of authorities and node 09's work queue both read from it.

**It must not invent citations.** Any `case_key` in `citations.json` that wasn't gate-passed is an immediate failure.

### 07 Background Writer

| | |
|---|---|
| **Reads** | **`complaint.md` (primary)**, `client_facts.md`, `argument.md`, `topics.json` |
| **Writes** | `background.md` |
| **Tools** | `Read`, `Write`, `Grep`, `Glob` |
| **Model** | `claude-opus-5` |

A background section recites the allegations and procedural history, so its primary source is the **complaint**, not the draft and not the precedents. It reads the argument only to know which facts need foregrounding. Drafting the background *from* the argument produces a background that subtly argues, which judges notice.

Convention for the playbook: on a motion to dismiss the allegations are taken as true for argument's sake, so the background is phrased "the Complaint alleges…" throughout, with paragraph cites. Where a threshold defense turns on a client fact rather than an allegation, that needs distinct treatment — it isn't something the complaint says.

### 08 Assembler — deterministic, no model

| | |
|---|---|
| **Reads** | `background.md`, `argument.md`, `citations.json`, `topics.json`, gate verdicts |
| **Writes** | `motion.md` |
| **Tools** | none — plain Python and templates |

Boilerplate, templated rather than generated — a model adds hallucination risk for no upside:

- **Caption and title** — from `topics.json`
- **Preliminary statement** — the most-read page of the brief. Templated skeleton filled from the topics and strongest issues. The one piece here that might later justify a small generative step
- **Legal standard sections** — one per Rule subsection actually invoked, verbatim from `procedural/<rule>.md`. A motion raising both 12(b)(2) and 12(b)(6) recites both standards. Never generate these
- **Argument** — `argument.md`
- **Conclusion and prayer for relief** — templated
- **Table of authorities** — derived from **`citations.json`**, never from the raw union of every `cases.json`. Unioning raw research would put gate-rejected cases into the table of authorities of a filed document

### 09 Citation Verifier — final gate

| | |
|---|---|
| **Reads** | `motion.md`, `citations.json`, `cases/<key>.md` |
| **Writes** | nothing — returns a verdict per call; the **orchestrator** assembles `verification.json` |
| **Tools** | `Read`, `Grep`, `Glob` — **no web access, no Write** |
| **Playbook** | guardrails + `verification/cite-check.md` |
| **Model** | `claude-opus-5`, **one citation per call** |

```jsonc
// verification.json — written by the orchestrator
{
  "citations": [
    {
      "case_key": "a3f1c8…",
      "citation_as_written": "Ashcroft v. Iqbal, 556 U.S. 662, 678 (2009)",
      "proposition_as_drafted": "A complaint must plead facts, not labels.",
      "verdict": "supported",          // supported | partially | unsupported | uncertain
      "notes": "Directly on point at 678."
    }
  ],
  "summary": { "supported": 11, "partially": 2, "unsupported": 1, "uncertain": 1 },
  "gate_rejections": [ { "issue_id": "t1-i1", "case_key": "b7d200…", "failed": ["quotes_verbatim"] } ]
}
```

**Four design points.** *No web access* — a missing case text means the gate let something through, which should surface as an error rather than be silently repaired, and this keeps "exactly one node has web access" true. *No `Write`* — the node stays read-only, a cheap guarantee on the component whose job is to be trustworthy. *`uncertain` is a first-class verdict*, because a verifier permitted to abstain is more useful than one forced to rule. *Adversarial and separate from the drafter* — same model is fine, same context is not: give it the citation, the proposition as drafted, and the case text, never the drafter's reasoning about why the case fits.

### The repair loop

1. Group non-`supported` verdicts by issue.
2. Re-run **that one Issue Drafter** with the verifier's note appended. **Once.**
3. **Re-run the Combiner and the Assembler**, because `argument.md` and `motion.md` are downstream of the drafts.
4. **Re-verify only the citations that changed.**
5. Still not `supported`, or `uncertain`: **do not silently fix.** Leave it, record it, surface it in the UI beside the draft.

Bounded at one retry because an unbounded loop spends money converging on nothing. Flag-rather-than-fix because the strategy memo's observation about the hallucination-sanctions cases is that courts punish lawyers who didn't own the error, not the error itself — so design for graceful failure and easy verification rather than the illusion of perfection.

---

## 5. Tool access, per node

Deny-by-default, **per node** rather than global.

| Node | Read | Write | Grep | Glob | WebSearch | fetch_case | Bash |
|---|---|---|---|---|---|---|---|
| 01 Topic Identifier | ✓ | ✓ | ✓ | ✓ | — | — | — |
| 02 Issue Spotter | ✓ | ✓ | ✓ | ✓ | — | — | — |
| **03 Issue Researcher** | ✓ | ✓ | ✓ | ✓ | **✓ pinned** | **✓** | — |
| 05 Issue Drafter | ✓ | ✓ | ✓ | ✓ | — | — | — |
| 06 Draft Combiner | ✓ | ✓ | ✓ | ✓ | — | — | — |
| 07 Background Writer | ✓ | ✓ | ✓ | ✓ | — | — | — |
| 09 Citation Verifier | ✓ | — | ✓ | ✓ | — | — | — |
| 04 Research Gate · 08 Assembler | *no model, no tools* | | | | | | |

**`Bash` is never granted to any node.** Nothing here needs a shell, and it's the one tool that turns prompt injection into arbitrary code execution.

**Web access reaches exactly one node**, and the complaint — the untrusted input — is in that node's context. Karen has accepted this knowingly. What remains as mitigation:

- A **domain allowlist enforced in code** on both `WebSearch` and `fetch_case`, so an injected instruction can only reach allowlisted legal sources. Required anyway for the Westlaw/Lexis line, so it's free.
- `fetch_case` rejecting and logging any URL not on the allowlist.
- **Log the count of searches and the domains hit to `generation_nodes` — not the query strings.** Query text is model output derived from the complaint, i.e. client case facts, and the architecture doc's field-level-encryption gate applies to it. Same for errors: store a classification, not raw agent output.

**On MCP:** an in-process SDK tool is registered as an SDK MCP server, so `fetch_case` is technically one. The invariant means *no external MCP servers*; an in-process tool you wrote is the sanctioned mechanism.

---

## 6. Orchestration

**Do not implement this as one agent with subagents deciding the plan.** The topology is fixed. Encoding it in Python gets four things that matter for a legal product: **auditability** (you can say exactly what ran, on what inputs — the answer to "how was this motion produced"), **resumability** (a failed Drafter re-runs without redoing research), **per-node cost attribution**, and **bounded retries** per node.

Each *node* is genuinely agentic — the Researcher decides what to search and when it has enough, the Spotter decides what counts as an issue. The *graph* is fixed.

### 6.1 The node wrapper

Every step goes through this, including the two with no model.

```python
async def node(job, name, branch, fn, *, schema=None, needs_slot=True):
    """Run one pipeline step. Records status, bounds concurrency, retries once,
    validates the payload, and NEVER raises. Returns None on failure."""
    slot = sem if needs_slot else nullcontext()      # deterministic steps need no slot
    async with slot:
        for attempt in (1, 2):
            await mark(job, name, branch, "running", attempt=attempt)
            try:
                result = await fn()
                if schema:
                    schema.validate(result)          # malformed JSON is a NODE failure,
                await mark(job, name, branch, "complete", attempt=attempt)
                return result                        # so it gets the retry
            except Exception as err:
                if attempt == 2:
                    await mark(job, name, branch, "failed", attempt=attempt, err=err)
                    return None
                log_retry(job, name, branch, err)
```

`mark(… "running")` is **inside** the retry loop so a second attempt is visible, and `schema.validate` is **inside** the try so a model that omits `pursue` produces a retried node failure rather than a `KeyError` forty minutes in.

### 6.2 The pipeline

No human in the loop, so this runs start to finish in one claimed job.

```python
CONCURRENCY = int(os.environ.get("PIPELINE_CONCURRENCY", "3"))

async def run_pipeline(job, workdir: Path):
    global sem
    sem = asyncio.Semaphore(CONCURRENCY)

    compose_playbooks(workdir, scope="_global")

    topics = await node(job, "topic_identifier", None,
                        lambda: identify_topics(workdir), schema=TOPICS_SCHEMA)
    if topics is None:
        raise PipelineFailed("could not read the complaint")

    topics = resolve_registry_keys(topics)           # orchestrator, not the model
    topics = apply_low_confidence_policy(topics)     # see node 01; waiver_risk pursues
    write_json(workdir / "topics.json", topics)

    live = [t for t in topics["topics"] if t.get("pursue")]
    if not live:
        raise PipelineFailed("no topic worth pursuing — see threshold_checklist")

    for t in live:
        compose_playbooks(workdir, topic=t)          # layers depend on t["kind"]

    async def do_issue(t, i):
        cases = await node(job, "issue_researcher", i["id"],
                           lambda: research(workdir, t, i), schema=CASES_SCHEMA)
        if cases is None:
            return None                              # researcher failed; skip this issue
        gate = await node(job, "research_gate", i["id"],
                          lambda: run_research_gate(workdir, t, i), needs_slot=False)
        if gate is None or not gate["proceed"]:
            await mark(job, "issue_drafter", i["id"], "skipped")
            return None
        return await node(job, "issue_drafter", i["id"],
                          lambda: draft(workdir, t, i, gate))

    async def do_topic(t):
        issues = await node(job, "issue_spotter", t["id"],
                            lambda: spot_issues(workdir, t), schema=ISSUES_SCHEMA)
        if issues is None:
            return []
        arguable = [i for i in issues["issues"] if i.get("argue")]
        return await asyncio.gather(*(do_issue(t, i) for i in arguable))

    per_topic = await asyncio.gather(*(do_topic(t) for t in live))
    drafts = [d for group in per_topic for d in (group or []) if d]

    if not drafts:
        raise PipelineFailed("no issue survived research and drafting")

    async def assemble_document():
        if await node(job, "draft_combiner", None,
                      lambda: combine(workdir), schema=CITATIONS_SCHEMA) is None:
            return False
        if await node(job, "background_writer", None,
                      lambda: write_background(workdir)) is None:
            return False
        return await node(job, "assembler", None,
                          lambda: assemble(workdir), needs_slot=False) is not None

    if not await assemble_document():
        raise PipelineFailed("could not assemble the motion")

    verification = await verify_all(job, workdir)    # bounded fan-out via the semaphore
    verification = await repair_pass(job, workdir, verification,
                                     reassemble=assemble_document, limit=1)
    write_json(workdir / "verification.json", verification)
    return workdir / "motion.md"
```

**The partial-failure rule is the important property.** One failed issue out of nine is skipped, recorded and reported. The run only fails outright if the complaint can't be read, no topic is worth pursuing, no issue survives, or assembly itself fails. A motion with eight of nine arguments plus a note about the ninth is useful; a hard failure at minute forty is not.

`verify_all` does its own bounded fan-out through the same semaphore rather than occupying one slot for fifteen sequential calls. `repair_pass` re-runs affected drafters, then `reassemble`, then re-verifies only what changed.

---

## 7. Progress, cost and the trace

```sql
create table generation_nodes (
  id             bigserial primary key,
  generation_id  uuid not null references generations(id),
  node           text not null,          -- 'issue_researcher'
  branch_key     text,                   -- 't1-i1'
  status         text not null,          -- queued|running|complete|failed|skipped
  attempt        integer not null default 1,
  turns_used     integer,
  input_tokens   integer,
  output_tokens  integer,
  cost_usd       numeric(10,4),
  searches_run   integer,                -- COUNT only, never the query text
  domains_hit    text[],                 -- allowlisted domains, safe to store
  error_class    text,                   -- a classification, not raw agent output
  started_at     timestamptz,
  completed_at   timestamptz
);
create index on generation_nodes (generation_id, node);
```

Progress UI, cost attribution and debugging record in one table, holding no case facts. `generations` also needs revisiting: its singular `cause_of_action` / `jurisdiction` / `input_facts` columns are from the one-shot design, and a motion now covers N topics of two different kinds. No `awaiting_confirmation` status or resume marker is needed — there's no human step.

---

## 8. Concurrency, sizing and latency

**RAM.** Each `query()` spawns a `claude` subprocess; Anthropic's stated starting point is roughly 1 GiB RAM, 1 CPU and 5 GiB disk per concurrent agent — a floor, not a ceiling. Concurrency 3–4 wants **at least 4 GB** (Render's $85 tier), not the $25/2 GB tier, which cannot hold three agents plus the Python parent. Four agents at 5 GiB disk each is ~20 GiB — check instance disk too, and re-verify Render's current upper tiers before purchase.

**Rate limits.** Anthropic's hosting guidance recommends batching parallel fan-outs rather than one wide dispatch. Hence the semaphore, sized by environment variable.

**A runaway loop is still a runaway loop.** "Cost per motion doesn't matter" is not "cost doesn't matter." Forty runs with generous `max_turns` is *more* cost-variable than a single call, so the app-side spend cap and per-node turn ceilings stay mandatory. The threshold changed, not the need.

**Expect 45–90 minutes end to end** at concurrency 3–4. Two consequences to build for rather than retrofit: **notifications become necessary** (nobody watches a tab for an hour — email on completion, and the tab-title trick no longer covers it), and **the status UI needs per-node progress** from `generation_nodes`, because "researching issue 6 of 9" is the difference between a product that feels alive and one that feels broken.

---

## 9. Where the playbooks plug in

`resolve_playbook(node, topic)` — the layers depend on both the node and the topic's `kind`.

```yaml
# playbooks/registry.yaml
layers:
  guardrails:  _shared/guardrails.md
  house_style: _shared/house-style.md

nodes:
  topic_identifier:   [guardrails, analysis/read-complaint.md, analysis/threshold-defenses.md]
  draft_combiner:     [guardrails, house_style]
  background_writer:  [guardrails, house_style]
  citation_verifier:  [guardrails, verification/cite-check.md]
  issue_researcher:   [guardrails, research/finding-authority.md]
  # these two depend on topic kind:
  issue_spotter:
    count:     [guardrails, procedural, substantive]
    threshold: [guardrails, procedural, defense]
  issue_drafter:
    count:     [guardrails, house_style, substantive]
    threshold: [guardrails, house_style, defense]

causes_of_action:
  breach-of-contract:
    label: "Breach of Contract"
    rule: "12(b)(6)"
    procedural: procedural/rule-12b6-federal.md
    substantive: causes-of-action/breach-of-contract.md

defenses:
  failure-to-exhaust:
    label: "Failure to exhaust administrative remedies"
    rule: "12(b)(6)"
    procedural: procedural/rule-12b6-federal.md
    defense: defenses/failure-to-exhaust.md
    waiver_risk: false
  personal-jurisdiction:
    label: "Lack of personal jurisdiction"
    rule: "12(b)(2)"
    procedural: procedural/rule-12b2-federal.md
    defense: defenses/personal-jurisdiction.md
    waiver_risk: true
```

**Jurisdiction is deliberately absent.** V0 hardcodes one jurisdiction in configuration — the circuit gloss, local rules and caption format all come from a single file, and the dimension returns to the registry when there's a second one to support. Note the word collides with two different things: *this* is "which court's law controls" (a registry dimension, deferred), whereas *personal jurisdiction* is a substantive defense (a topic kind, in scope).

New playbook files, all Ben's work and all on the critical path:

| File | For | What it encodes |
|---|---|---|
| `analysis/read-complaint.md` | 01 | Finding counts, mapping paragraphs, judging whether a count is worth challenging |
| **`analysis/threshold-defenses.md`** | 01 | **The checklist: every defense, its precondition, how to test it, whether omission waives it.** The §1 table is a scaffold for this file |
| `defenses/<key>.md` | 02, 05 | One per defense: its framework, its prongs, how to argue each |
| `procedural/rule-12b6-federal.md` | 02, 08 | The 12(b)(6) standard, *and* the verbatim section node 08 templates in |
| `procedural/rule-12b2-federal.md` etc. | 02, 08 | One per Rule subsection supported |
| `causes-of-action/<coa>.md` | 02, 05 | Elements, common pleading failures, how to attack each element |
| `research/finding-authority.md` | 03 | What good authority looks like, binding vs persuasive, when to stop |
| `verification/cite-check.md` | 09 | What "supported" means, and explicit permission to answer `uncertain` |
| `_shared/house-style.md` | 05, 06, 07 | Voice, structure, formatting |
| `_shared/guardrails.md` | all | Never invent citations; flag uncertainty; abstain when unsure |

---

## 10. Build order

Depth-first on a single branch, then widen.

1. **`fetch_case`, the domain allowlist, and the Research Gate** — same code path, and the gate is a pure function that's easy to test. Test both standalone against real public opinion pages before any agent touches them. Public web only, no API: see node 03.
2. **The working-directory layout and `generation_nodes`.**
3. **One hardcoded vertical slice:** skip node 01, hand the pipeline one topic and one issue by hand, and get Researcher → Gate → Drafter producing one paragraph with a real, verified citation. **This is the gate on the whole project.** Use a `count` topic — element analysis is the simpler of the two frames.
4. **The Citation Verifier** on that paragraph. Closed loop on one issue.
5. **Issue Spotter, `count` mode only.** First fan-out — add the semaphore here.
6. **Issue Spotter, `threshold` mode**, with one defense end to end. Pick one with a clean, checkable precondition — failure to exhaust is a good first candidate; personal jurisdiction needs the client-facts form.
7. **Topic Identifier** and registry resolution. Second fan-out. This is where the threshold checklist lands.
8. **Combiner, Background Writer, Assembler.** Fan-in and assembly, including threshold-before-merits ordering.
9. **The repair loop**, including re-combine and re-assemble.
10. **Per-node progress UI and the completion email.**

Step 3 is the real gate. If a researched-and-verified paragraph on one issue isn't clearly better than what Ben writes in twenty minutes, the shape of the rest doesn't matter.

---

## 11. Open questions

Resolved this round: no human in the loop, complaint as pasted text, jurisdiction deferred to a single hardcoded value.

Still open, all for Ben:

1. **Is the waiver rule as §1 describes it, and is the threshold-defense table right?** This is the load-bearing legal premise for treating threshold defenses as an exhaustive checklist rather than a scan.
2. **What goes in the client-facts form?** Several preconditions can't be answered from the complaint. A handful of fields makes the threshold half work; which fields earn their place is Ben's call.
3. **Policy for `confidence: low` with `waiver_risk: true`.** Pursue anyway, or rule out and flag? With nobody confirming, the asymmetry argues for pursuing — a wasted branch is cheap, a waived defense is not.
4. **Weak issues: report or argue?** Assumed reported but not argued. The alternative is to argue everything and let the lawyer cut.
5. **`generations` schema.** Still carries singular `cause_of_action` / `jurisdiction` / `input_facts` from the one-shot design. Needs revisiting before node 01 lands.
