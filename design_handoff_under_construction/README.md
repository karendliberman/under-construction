# Handoff: Under Construction — motion-to-dismiss drafting app

## Overview
"Under Construction" is a web app for litigators. A lawyer signs in, picks a cause of action + jurisdiction (only pairings with a written playbook are offered), enters the facts of the matter, and an agent drafts a complete motion to dismiss against that playbook. Drafting takes a few minutes; the lawyer copies the finished draft into Word. Accounts are request-and-approve, not self-serve. Citations are NOT verified, and the draft viewer carries a non-dismissible notice saying so.

Positioning to preserve in copy: the agent **drafts on its own** — it is not an assistant that helps you write. Second theme: it is honest about its seams (marks propositions needing authority, missing facts, weak arguments).

## About the Design Files
`Under Construction.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing intended look and behaviour, not production code to copy. Recreate these screens in the target codebase using its existing framework, component library and patterns (React/Next, Vue, etc.). If no environment exists yet, pick the appropriate stack and implement there. It is a single file containing all ten screens with a fixed bottom "Screens" index bar for navigation — **that index bar is a prototype affordance only; do not ship it.**

Sample data in the file (drafts, access requests, the drafted motion text, playbook list) is placeholder content for layout purposes.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, states and copy. Recreate pixel-accurately with the codebase's own primitives. Note two deliberate style rules: **no border radius anywhere** (every corner is square) and **offset hard shadows** instead of blurred shadows on primary buttons.

## Design Tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| plum (primary) | `#8E4B57` | primary buttons, links, active step, progress bar, timer, "flagged" accents |
| plum-hover | `#743C46` | primary button hover |
| chocolate (ink) | `#3C2A22` | body text, top bar, footer, screen index bar, 1px "strong" rules |
| blue | `#2F3A4F` | one deep marketing band; jurisdiction/court labels; "Ready" status; approval-link block |
| apricot | `#EFC3AC` | hero wash accents, hover fills, citations banner, offset shadows, app-bar CTA |
| apricot wash | `#F7E7DC` | hero background, section fills, row hover, generating backdrop |
| paper | `#FCFBFA` | page background |
| card | `#FFFFFF` | cards, inputs on paper |
| input fill | `#F7F5F2` | inputs inside white cards |
| hairline | `#E5E2DD` | default borders/dividers |
| hairline warm | `#E4D6CB` / `#EDE5DC` / `#E0CFC2` | borders inside apricot areas |
| text secondary | `#6C5B52` | body copy |
| text muted | `#8A7A70` | mono labels |
| text faint | `#A89A90` / `#9A8A80` | metadata |
| on-dark text | `#F6F3EE`; on-plum text `#FBF6F2` | |
| grey (weak-argument mark) | `#A89A90` | third callout type |

Dark surfaces are used sparingly on purpose: only the 60px top bar, the footer, one marketing band, and the prototype index bar. Everything else is light.

### Typography
- Display / headings: **Instrument Serif** 400 (Google). Italic used for the hero's second line and pull quotes.
- UI / body: **IBM Plex Sans** 400/500/600/700.
- Labels, metadata, numbers, links-as-data: **IBM Plex Mono** 400/500/600, uppercase, letter-spacing .06–.20em, sizes 10–13px.
- Scale in use: h1 hero 94px/.95 (letter-spacing -.02em); page h1 52px; section h2 46–52px; card h3 21–26px; body 15–19px/1.6–1.85; draft body 16.5px/1.85; mono labels 10–13px.
- `text-wrap: pretty` on long headings and paragraphs.

### Spacing / geometry
- Page gutters 32px (app) / 40px (marketing). Content max-widths: 1240px marketing, 1180px lists + draft viewer, 1060px facts form, 940px step one, 720px generating card, 700px failure card, 420px auth form.
- Section padding 78–96px vertical. Card padding 30–52px. Field padding 13–16px.
- Grid gaps 1–2px for hairline-joined card grids (grid with `background: #E5E2DD`), 20–28px for form grids, 48–72px for two-column sections.
- **Border radius: 0 everywhere** (only exceptions: the 50% pulse dot and spinner).
- Shadows: `6px 6px 0 rgba(60,42,34,.16)` (hero CTA), `5px 5px 0 #EFC3AC` (plum buttons on paper) → grows to 8–10px offset with `translate(-2px,-2px)` on hover. No blur.
- Transitions: `.16s`–`.20s` on colour/background/border/transform. Entry animation `ucRise` (opacity 0→1, translateY 14px→0, .5s cubic-bezier(.2,.7,.3,1)) on newly revealed blocks. Spinner `ucSpin` .9s linear infinite. Live dot `ucPulse` 1.6s (opacity .3→1).

## Screens / Views

### 1. Marketing (logged out)
Purpose: explain the product and collect access requests.
Layout, top to bottom:
1. **Top bar** — chocolate, 15px/40px padding. Left: 11px apricot square + "UNDER CONSTRUCTION" (mono, .16em, uppercase). Right: "MOTIONS TO DISMISS" (mono, muted) + ghost "Sign in" button (1px `rgba(246,243,238,.35)` border → apricot fill on hover).
2. **Hero** — `#F7E7DC` background, bottom hairline `#E4D6CB`, padding 84/40/76. Grid `1.12fr .88fr`, gap 60, `align-items: end`.
   - Left: plum mono eyebrow "THE AGENT DRAFTS. YOU REVIEW."; h1 "It writes the motion." + italic plum "Not notes toward one."; 19px paragraph (max 560px); plum "Request access" button (scrolls to the form) + mono note "Approved by hand · 2–3 days".
   - Right: **Live playbook index** card — white, 1px `#2F3A4F` border; header strip is blue with cream mono title and a pulsing apricot dot; then 5 rows, grid `34px 1fr auto` (playbook number, claim, court in blue mono), row hover fills apricot wash; footer row "+ 34 pairings drafting today".
3. **How it works** — h2 "Three inputs, one draft" + right-aligned mono "HOW IT WORKS"; 3-column grid joined by 1px hairlines (grid gap 1px over `#E5E2DD` background). Each card: Instrument Serif 66px plum numeral (01/02/03), 21px heading, 15px body; hover fills apricot wash.
4. **Honesty band** — blue `#2F3A4F`, cream text, 2-column. Left: h2 "It will tell you what it doesn't know." + body + 25px italic apricot pull quote. Right: white card with 5px plum left border — mono "STATED PLAINLY", h3 "Citations are not verified", body, closing plum line.
5. **Request access** — id `request`; grid `.8fr 1.2fr`. Left: h2, intro, plum-ruled mono list (REVIEWED BY HAND / NO SELF-SERVE SIGNUP / PILOT · 12 SEATS OPEN). Right: white card, 1px hairline. Fields: Full name, Work email, Firm, Where do you practise? (2-col grid), then "What would you use it for?" textarea (4 rows). Mono uppercase labels above each field; inputs `#F7F5F2`, focus → plum border + white fill. Plum "Send request" button + mono hint.
   - **Submitted state** replaces the card in place: apricot-wash panel, `ucRise`, "Request received." + explanation + ghost plum button "Preview the approval link →" (prototype shortcut to screen 3 — in production this is an emailed link).
6. **Footer** — chocolate, 24/40 padding, left product line, right apricot mono "Drafts are starting points. Verify before you file."

### 2. Sign in
Two-column, `.9fr 1.1fr`, full height.
- Left panel: apricot wash, right hairline; top logo lockup (plum square), middle Instrument Serif 58px "It writes the motion." + plum mono subtitle, bottom mono facts (ACCESS IS APPROVED BY HAND. / CITATIONS ARE NOT VERIFIED.).
- Right: 420px form on paper. h1 "Sign in" (44px), 15px sub with inline link "Request it here". Email + Password fields (white fill, plum focus). Plum full-width button with 5px apricot offset shadow, hover translate. Below: mono "FORGOT PASSWORD?" / "SSO — NOT YET".
- Validation: empty email or password → plum mono inline error under the fields. Success → Drafts.

### 3. Set password
Same split. Right column: plum mono "SINGLE-USE LINK · EXPIRES IN 72H", h1 "Set your password", line naming the approved email (bold), "New password" field, **3-segment strength meter** (empty `#E4DDD4`; <8 chars 1 plum bar "TOO SHORT"; 8–11 2 apricot bars "ACCEPTABLE"; ≥12 3 blue bars "STRONG"), "Confirm password", plum full-width "Set password and sign in" → Drafts.

### 4. Drafts (signed in)
**App shell** (screens 4–9): 60px sticky chocolate bar. Left: logo lockup (10px apricot square, clickable → Drafts) + text nav "Drafts", "Access requests" (hover apricot). Right: apricot "New draft" button (hover white) + 30px plum avatar square "DO".
Body: max 1180px, padding 52/32/80. Header row: h1 "Drafts" 52px + mono "5 DRAFTS · MOST RECENT FIRST"; right a ghost mono toggle that switches to the empty state (prototype control — omit or keep behind a flag).
List: 1px chocolate top rule; each row grid `88px 1fr 200px 130px 28px`, 22px vertical padding, hairline bottom. Cells: mono draft id (`D-1184`), title (18px 600) + claim/counts (14px secondary), court (blue mono), status (mono uppercase — Ready `#2F3A4F`, Failed `#8E4B57`), "→". Row hover: apricot wash + `padding-left: 16px` shift. Click: Ready → Draft viewer, Failed → Failed screen.
**Empty state**: dashed `#CBBFB4` border, white fill, centred — 54px square plum-bordered "§" mark, h2 "No drafts yet", 16px explanation, plum CTA "Draft your first motion".

### 5. New draft — step one
Mono step rail "01 COMBINATION — 02 FACTS — 03 DRAFT" (current in plum). h1 "Pick the combination", explanation. Two selects (max 940px, gap 26): "Cause of action" (1px chocolate border = the active input) and "Jurisdiction" (hairline border, disabled until a claim is chosen; placeholder "Pick a cause of action first"). Changing the claim resets the jurisdiction to that playbook's first court — **only pairings with a playbook may be offered.**
When a valid pair is selected, a **Playbook matched** panel animates in (`ucRise`): apricot wash, 5px plum left border — mono "PLAYBOOK MATCHED" + right-aligned ref (`PB-041 · rev 12`), Instrument Serif 32px "<claim> · <court>", then a 3-column footer (Standard / Elements attacked / Drafts on record) above a warm hairline.
Footer: plum "Continue to facts" + mono hint ("Playbook found for this pairing." / "Pick a pairing with a playbook.").

Playbook data used in the prototype: Breach of contract (N.D. Cal., S.D.N.Y., Cal. Superior), Fraud/misrepresentation (N.D. Cal., S.D.N.Y.), Wrongful termination (N.D. Cal., C.D. Cal.), Unfair competition § 17200 (Cal. Superior), Negligence (N.D. Cal., Cal. Superior).

### 6. New draft — step two (facts)
Max 1060px. Step rail with 02 in plum. Header row: h1 "The facts" + sub; right, a 3px plum right-ruled block "DRAFTING AGAINST" + the matched playbook title.
Structured fields, 3-column grid gap 20: Case caption, Docket no., We represent (select: Defendant / Defendants (joint) / Third-party defendant), Complaint filed, Response due, Counts challenged.
**Narrative** block: 1px chocolate border, white. Header strip: mono "NARRATIVE OF THE MATTER" + live word count. Textarea 12 rows, 16px/1.7, transparent, no border, resize vertical. Footer strip (apricot wash): mono "PROMPTS" + four chips that append a labelled stub to the narrative ("+ What plaintiff has NOT alleged", "+ Procedural posture", "+ Prior related actions", "+ Documents referenced"); chip hover → plum border + plum text.
Actions: ghost "Back", plum "Draft the motion" (offset shadow), mono note "Takes 3–5 minutes. You can leave this page."

### 7. Generating
Apricot-wash backdrop, centred white card (max 720px, 1px `#E4D6CB`, 44/46 padding).
Spinner (20px, 2px `#E4D6CB` ring, plum top) + plum mono "DRAFTING". h1 52px "The agent is writing your motion." Sub: "<playbook> · <caption>. Nothing to supervise — close the tab if you like, it will be in Drafts."
**Elapsed timer**: plum IBM Plex Mono 62px `m:ss`, ticking every second from 0 on entry, beside mono "ELAPSED · EST. 4:00". Progress bar 6px on `#EDEAE5`, plum fill `min(96%, 8% + seconds*3%)`, `width` transition .4s linear.
**Stage list** (5 rows, grid `26px 1fr auto`): stage index advances every 8s. Done rows `✓` + timestamp in `#6C5B52`; current row `▸` + "running" in plum; queued rows `·` + "queued" in `#B0A49B`. Stages: loaded playbook and procedural standard / mapped your facts onto the elements / drafting the argument, count by count / marking propositions that need authority / assembling caption, prayer and signature block.
Two prototype-only buttons at the bottom jump to the viewer and the failure state — remove in production; the real screen advances on completion.

### 8. Draft viewer
- **Non-dismissible banner**, sticky under the 60px app bar (top: 60px): apricot background, chocolate text, 3px plum bottom border, 13/32 padding. Content: 10px plum square, mono uppercase bold "CITATIONS ARE NOT VERIFIED", then 14px sentence "This draft may cite cases that do not exist or do not say what it claims. Check every citation before filing. This notice cannot be dismissed." **No close control — must not be dismissible or collapsible.**
- Body grid `1fr 260px`, gap 48, max 1180px.
- Document column: header row above a 1px chocolate rule — mono "DRAFT D-1184 · N.D. CAL.", h1 42px title; right, plum "Copy to Word" button that switches to "Copied for Word ✓" for 2.2s.
- Motion text: centred mono court caption block, Instrument Serif 30px centred document title, then `I. INTRODUCTION` … `V. CONCLUSION` as 16.5px/1.85 paragraphs with bold roman-numeral headings and italic sub-headings.
- **Three callout types** interleaved in the text, each a 3px left border + 7–14% tinted background + mono uppercase label + 15px explanation: plum "FLAGGED BY THE AGENT — NEEDS AUTHORITY"; blue "MISSING FACT — ELEMENT NOT SATISFIED BY YOUR INPUT"; grey "WEAK ARGUMENT — STATED AS SUCH".
- Sidebar (sticky, top 128px): "Agent's seams" card — mono header, three legend rows with 8px plum/blue/grey squares and counts, then an apricot-wash mono footer (DRAFTED IN 4M 12S / 2,140 WORDS · 9 CITATIONS / plum "0 CITATIONS VERIFIED"). Below the card, ghost "Back to drafts".

### 9. Failed draft
Max 700px, 88px top padding. White card, 1px `#E4D6CB` with a 5px plum left border. Plum mono "DRAFT FAILED · NOTHING WAS SAVED"; h1 44px "The agent stopped partway and we threw the draft away."; two 16.5px paragraphs in plain language (what happened; facts are kept, retry usually works, nothing about the input caused it); plum "Retry the draft" (returns to Generating with the timer reset) + ghost "Edit the facts first" (→ step two); mono footer above a hairline with error ref/timestamp and "NOTHING TO REPORT — WE ALREADY HAVE IT."

### 10. Admin — access requests
Max 1180px. Plum mono "ADMIN" eyebrow, h1 "Access requests"; right-aligned mono counters ("3 PENDING", "12 SEATS · 4 TAKEN").
1px chocolate top rule; each request row grid `1fr 240px 220px`, 24px padding, hairline bottom:
- Left: name (19px 600), email (mono), quoted use-case (15px, max 62ch).
- Middle: firm (600), where they practise, mono age ("2 days ago").
- Right: stacked plum "Approve" and ghost "Deny" (hover → chocolate).
Approving expands an apricot-wash block below the row (`ucRise`) with a 4px blue left border: blue mono "APPROVED — SEND THIS SINGLE-USE LINK", the link in mono (word-break: break-all), and a blue "Copy link" button → "Copied ✓" for 2s. Denying replaces the buttons with a mono outlined "DENIED" chip. Both actions are optimistic and local; wire to the real endpoints.

## Interactions & Behavior
- Navigation is client-side screen switching; scroll resets to top on change. In production these are routes: `/`, `/sign-in`, `/set-password/:token`, `/drafts`, `/drafts/new`, `/drafts/new/facts`, `/drafts/:id` (generating / ready / failed variants), `/admin/requests`.
- Hero "Request access" scrolls to `#request`.
- Request form submit → in-place success panel (no navigation).
- Sign-in requires both fields; otherwise inline error.
- Jurisdiction select is disabled until a cause of action is chosen and resets when it changes.
- Generating: 1s interval timer, 8s stage advance, progress capped at 96% until done. Must survive leaving the page — poll or subscribe server-side, since the draft continues.
- Copy buttons use the clipboard API and show a 2s confirmation label.
- Hover: rows shift 16px left-padding and fill apricot; cards fill apricot; primary buttons translate(-2px,-2px) and grow their offset shadow.
- Responsive behaviour is not designed yet — the prototype targets ≥1280px. Ask before shipping narrow layouts.

## State Management
- `screen` (route), `form` (name, email, firm, where, use, pw, newpw, confirm, claim, court), `facts` (caption, docket, side, filed, due, counts, narrative), `requestSent`, `signinError`, `emptyDrafts` (prototype toggle), `copied`, `copiedLink`, `seconds` + `running` (generating timer), `requests[]` with status pending|approved|denied.
- Real data needs: session/auth, playbook catalogue (claim → permitted jurisdictions + metadata), drafts list, draft detail + generation job status (queued/running/ready/failed), access requests CRUD, single-use password tokens.

## Assets
None. No images, no icon set — all marks are CSS squares, the "§" glyph, and text arrows. Fonts are Google Fonts: Instrument Serif, IBM Plex Sans, IBM Plex Mono.

## Files
- `Under Construction.dc.html` — all ten screens (design reference).
- `support.js` — prototype runtime only; not part of the design and not to be ported.
