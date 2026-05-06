# Enterprise-grade ERP authentication: dev and implementation plan (v2)

This revision **formalizes identity state semantics**, **operational recovery UX**, and **early shared primitives**—per review feedback—without “auth platform theater.”

---

## North star

> Identity interruption must never destroy operational continuity.

Every terminal state exposes **primary CTA**, **secondary escape**, and **preserved intent** (`callbackUrl` / return path). Copy should be **contextual** where ERP state is known (e.g. object or module reference), not generic “Error occurred.”

---

## What stays grounded (unchanged from v1)

- **IAM control plane** stays in [`lib/auth/`](lib/auth/); no `app/iam/*` ([`.cursor/rules/iam-directory.mdc`](.cursor/rules/iam-directory.mdc)).
- **Proxy** stays narrow: cookie presence + safe redirect to `/sign-in?callbackUrl=…` ([`proxy.ts`](proxy.ts)); real validation in RSC / Server Actions ([`AGENTS.md`](AGENTS.md)).
- **Safe redirects**: [`lib/auth/callback-path.ts`](lib/auth/callback-path.ts).
- Prefer **`components/auth/*`** + **`app/*` routes** over a new `features/auth/` module unless [`AGENTS.md`](AGENTS.md) is explicitly updated.

---

## New core: canonical auth status vocabulary (critical)

**Problem:** Scattered query strings (`?reason=expired`, `timeout`, `stepup`, …) become chaos for UI, audit, analytics, and support.

**Solution:** One **shared, server-safe** vocabulary in `lib/auth/` (no React):

- Add something like [`lib/auth/auth-status.shared.ts`](lib/auth/auth-status.shared.ts) exporting:

  - `AUTH_STATUS` const object (string literals), e.g. `SESSION_EXPIRED`, `MFA_REQUIRED`, `EMAIL_UNVERIFIED`, `INVITATION_EXPIRED`, `STEP_UP_REQUIRED`, `ORG_REQUIRED`, `RATE_LIMITED`, …
  - `AuthStatusCode` type + **Zod** schema / parser for **query param validation** (reject unknown reasons at the edge of UI).

**Rules:**

- Redirects, status pages, client copy maps, and (where useful) **audit metadata** reference **only** these codes—not ad hoc strings.
- UI maps `AuthStatusCode` → title, description, trust explanation, CTAs (see error taxonomy below).

No XState required: a **canonical enum + validated params** is the “state machine” mental model.

---

## New core: unified `AuthResult` primitive (build first)

**Highest-leverage UI component.** Implement **early** as [`components/auth/auth-result.tsx`](components/auth/auth-result.tsx).

**Recommended shape (illustrative):**

```tsx
<AuthResult
  variant="warning" // semantic: neutral | warning | destructive — map to tokens, not neon
  title="Session expired"
  description="Sign in again to continue to Procurement."
  trustNote="Sessions expire after a period of inactivity for your organization’s security."
  primaryAction={{ label: "Sign in", href: "/sign-in?callbackUrl=..." }}
  secondaryAction={{ label: "Go to dashboard", href: "/dashboard" }}
  supportReference={optionalReferenceId}
/>
```

**Consumers (same structure):** session expired, invite expired, verify pending, reset success, account locked, step-up required, rate limited, etc.

**Why first:** DRY, consistent enterprise tone, and a single place to enforce **WCAG** (landmarks, headings, live region policy).

---

## Three UX tiers (architectural separation)

Surfaces should **not** feel identical. Calm everywhere, but **density and explanation depth** differ.

| Tier | Purpose | Examples | UX tone |
|------|---------|----------|---------|
| **T1 — Entry auth** | Minimal friction | Sign-in, sign-up, forgot password | Sparse, fast, little governance copy |
| **T2 — Security operations** | User-controlled risk | Sessions, passkeys, MFA, activity, revoke | More detail, confirmations, device context |
| **T3 — Identity governance** | Admin/tenant policy | Invitations, org routing, SSO enforcement, domain rules, step-up gates | Strongest explanations, audit awareness, escalation paths |

Implement via **layout variants** (e.g. different `Card` density, optional side notes) and copy length—not different design systems.

---

## Phase 1 priority stack (immediate — revised order)

Build in this order:

1. **`AuthResult` primitive** ([`components/auth/auth-result.tsx`](components/auth/auth-result.tsx)).
2. **Canonical `AUTH_STATUS` + Zod validation** ([`lib/auth/auth-status.shared.ts`](lib/auth/auth-status.shared.ts)).
3. **Route-level loading** (`loading.tsx` for auth-critical segments; see async transitions below).
4. **OTP UX** — adopt [`components/ui/input-otp.tsx`](components/ui/input-otp.tsx) on email-code flows; paste, grouping, numeric keyboard.
5. **Structured redirect reasons** — only allowed codes from `AUTH_STATUS` in query (e.g. `authStatus` or `reason` **single param name**, documented once).
6. **Error taxonomy** — map Better Auth / HTTP / app errors → `AuthStatusCode` or stable `errorCode` + human + recovery + optional **support reference** (below).

Then: status routes that **compose** `AuthResult` + shared copy module (e.g. `lib/auth/auth-status-copy.ts` or colocated maps—keep strings out of IAM crypto paths).

---

## Async / server transition UX (App Router gap)

Explicitly design for:

- **Server Action pending** (useTransition patterns where client invokes actions).
- **Redirect pending** after sign-in (full-page navigation latency).
- **Session refresh / restoration** (brief “Preparing workspace…” / “Resolving organization access…” **after** success, before showing stale ERP chrome).

**Principle:** After success, show **interstitial copy** (same tier-1 calm tone) when the next screen may be slow—so enterprise auth does not feel “broken.”

Use **`loading.tsx`** and narrow **client** interstitials only where `loading.tsx` cannot cover (e.g. post-mutation client redirect).

---

## Auth interruption recovery (ERP continuity)

**Beyond `callbackUrl`:** when possible, preserve **intent metadata** for copy and return behavior:

- Current **route** (already in `callbackUrl`).
- Optional **workflow label** (e.g. query `context` or signed short token from server—avoid PII in query; prefer opaque id resolved server-side later).
- **Tenant / org** context for messaging (“Your organization requires…”).

**Example outcome:** “Your session expired while reviewing **Approval AP-2044**” when the server can attach a safe display reference—not a generic modal.

**Implementation path:** start with **query params** validated against allowlists; evolve to **server-stored continuation** (DB/encrypted cookie) for sensitive context.

---

## Destructive security confirmation UX (Tier 2)

Revoke flows must show **consequences + device context** before destructive actions ([`app/account/security/`](app/account/security/)):

- **Revoke session:** confirm dialog with browser/OS hint, last active, location (if available), IP mask policy per privacy.
- **Revoke all:** explicit “signs you out everywhere except this device” + primary confirm.

Use [`Dialog`](components/ui/dialog.tsx) + **semantic** buttons; loading on confirm.

---

## Trust explanation UX

For **step-up**, **MFA**, **org block**, **invite invalid**, **forced redirect**, always pair mechanics with a **short trust note** (why this happened). `AuthResult` should accept optional `trustNote` / `policyNote` so product/legal can tune copy without new components.

---

## Supportability UX

For **severe** or **unknown** failures:

- Surface a **support reference** (e.g. correlation id, request digest, or `iam_audit_event` id when safe and non-sensitive).
- Example line: “Reference: **AUTH-7F3A**” — generated server-side, logged in structured auth logs.

Wire to [`instrumentation.ts`](instrumentation.ts) / existing error reporting; **never** log secrets or full PII.

---

## What NOT to do (yet)

Avoid premature:

- Giant `features/auth/` module without [`AGENTS.md`](AGENTS.md) change.
- Auth “SDK” abstraction layer, global client auth context, or deep provider trees.
- Multi-provider orchestration / “state manager” beyond enum + validated params.
- i18n until Tier 1–2 flows are stable ([`AGENTS.md`](AGENTS.md) scale).

Stay in **stabilize operational truth**, not **platformize auth**.

---

## Later phases (summary)

- **Tier 3 flows:** invitation accept, org/SSO policy screens, admin-assisted recovery—each uses `AuthResult` + `AUTH_STATUS`.
- **Session UX hardening:** device labels, revoke-all, activity tied to audit types.
- **i18n:** separate program; touches proxy, callbacks, all copy maps.

---

## Success criteria (unchanged + v2 add-ons)

- One **vocabulary** for status across redirects, UI, and support.
- One **renderer** (`AuthResult`) for terminal and near-terminal auth states.
- **No silent** submit/SSO/passkey/OTP/redirect gaps.
- **Trust** and **recovery** always visible; **no dead ends**.
- **Tier-appropriate** density; **destructive** security actions confirmed with context.
- **Reference IDs** on hard failures for enterprise support.

---

## Implementation todos

- [ ] Add [`lib/auth/auth-status.shared.ts`](lib/auth/auth-status.shared.ts): `AUTH_STATUS`, types, Zod parser for query params
- [ ] Add [`components/auth/auth-result.tsx`](components/auth/auth-result.tsx): tier-aware optional props, token-safe variants
- [ ] Add [`lib/auth/auth-status-copy.ts`](lib/auth/auth-status-copy.ts) (or similar): map `AuthStatusCode` → title, description, trust note, default CTAs
- [ ] Refactor first status route (e.g. session-expired) to use `AuthResult` + vocabulary only
- [ ] Add `loading.tsx` for auth-heavy routes; document post-login interstitial pattern
- [ ] Migrate email OTP to `InputOTP`; a11y pass (aria-describedby, focus)
- [ ] Unify redirect query param name + validation in sign-in and status pages
- [ ] Error taxonomy module + support reference generation for severe errors
- [ ] Security center: revoke session / revoke all confirmation dialogs with device context
- [ ] Document three-tier UX in [`docs/design-system/governance.md`](docs/design-system/governance.md) or [`AGENTS.md`](AGENTS.md) pointer (short subsection only if you want repo contract visibility)
