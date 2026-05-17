# ADR-0028: Single-locale refactor gate (temporary)

| Field | Value |
| ----- | ----- |
| **Status** | Accepted (temporary — remove gate before production deploy) |
| **Date** | 2026-05-18 |
| **Supersedes** | Nothing |
| **Does not supersede** | `localePrefix: "always"`, `app/[locale]/…` route shape, `#i18n/navigation`, `toLocalePath`, multi-catalog launch set (`en`, `zh-CN`, `vi`, `ms`) |
| **Implements in code** | `lib/i18n/locales.shared.ts`, `i18n/request.ts`, `.env.config.example` |
| **Rule** | `.cursor/rules/i18n-directory.mdc` § Refactor gate |
| **Tests** | `tests/unit/i18n/single-locale-refactor.test.ts` |

---

## Context

Large refactors (e.g. metadata UI maturity, governed renderers, shell migration) touch hundreds of routes and message namespaces. With four active locales, each change multiplies:

- `generateStaticParams` and static pre-render work (`en` × `zh-CN` × `vi` × `ms`)
- Pressure to keep `messages/zh-CN.json`, `messages/vi.json`, and `messages/ms.json` in sync while iterating on `messages/en.json`
- next-intl `MISSING_MESSAGE` noise during incomplete catalog work

Afenda **cannot** drop locale-first routing during refactors: `proxy.ts`, auth `callbackUrl` validation, path builders, and `AGENTS.md` all assume `/{locale}/…` URLs. Disabling next-intl or removing `[locale]` would be a separate, breaking migration.

## Decision

Introduce an **opt-in, local-only env gate** that narrows **active** locales to English while preserving the full launch locale union in types and Orama maps.

### Environment variables

Set **both** in `.env.config`, then `pnpm env:sync`:

```env
AFENDA_I18N_SINGLE_LOCALE=1
NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE=1
```

| Variable | Read by |
| -------- | ------- |
| `AFENDA_I18N_SINGLE_LOCALE` | Server (`i18n/request.ts`, RSC, build) |
| `NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE` | Client bundles (`APP_LOCALES` in Client Components) |

Unset or `0` / `false` → full four-locale behavior (default for CI and production).

### Runtime behavior when gate is on

| Concern | Behavior |
| ------- | -------- |
| `APP_LOCALES` | `["en"]` — routing, static params, locale switcher, ask-docs Fumadocs `languages` |
| `FULL_APP_LOCALES` | Unchanged — `["en", "zh-CN", "vi", "ms"]` for types and `ASK_DOCS_ORAMA_LOCALE_MAP` |
| URL shape | Still `/{locale}/…`; non-`en` prefixes redirect via next-intl middleware |
| New copy | Author in `messages/en.json` only during refactor |
| Missing messages | `getMessageFallback` returns `namespace.key`; `onError` suppresses `MISSING_MESSAGE` logs |
| `pnpm lint:fixtures-parity` | Still validates `en.json` only (unchanged) |

### What the gate does **not** do

- Remove `[locale]` from the App Router
- Allow bare `/o/…` or `/sign-in` redirects
- Skip `setRequestLocale` or `#i18n/navigation`
- Disable CI — **never set these vars in GitHub Actions or Vercel**

---

## Consequences

- **Positive:** Faster local builds and less catalog churn while refactoring; locale-first contracts stay intact.
- **Negative:** Easy to merge with gate still enabled locally if env leaks into Vercel (must not); `zh-CN` / `vi` / `ms` pages are not exercised until gate is off.
- **Risk:** Shipping with gate on would serve English-only routes and hide missing translations in non-English catalogs.

---

## Resume full i18n — required before deployment

Complete this checklist **before** opening a production PR or promoting a preview that end users will hit. Treat as a merge blocker for any branch that used the gate.

### 1. Turn off the gate

1. Remove or comment out in `.env.config`:

   ```env
   AFENDA_I18N_SINGLE_LOCALE=1
   NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE=1
   ```

2. Run `pnpm env:sync`.
3. Confirm `.env.local` no longer contains either variable (or they are unset).
4. Restart `pnpm dev` if running.

### 2. Restore message catalogs

1. Diff `messages/en.json` against `messages/zh-CN.json`, `messages/vi.json`, and `messages/ms.json`.
2. Add any new keys introduced during refactor to all three non-English catalogs (English placeholder is acceptable short-term; professional translation follows product process).
3. Run `pnpm lint:fixtures-parity` (fixtures ↔ `en.json`).

### 3. Verify routing and static output

1. `APP_LOCALES` resolves to four entries (smoke: utility-bar language menu lists all locales).
2. Hit `/{locale}/o/{orgSlug}/…` for at least `en` and one non-English locale locally.
3. Run `pnpm build` — confirm static param cardinality includes all locales for surfaces you changed (legal-docs, ask-docs, etc.).

### 4. CI / Vercel

1. **Do not** set `AFENDA_I18N_SINGLE_LOCALE` or `NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE` in Vercel project env or GitHub Actions secrets.
2. Run `pnpm verify:parallel` (or `pnpm verify` pre-merge) on the branch with gate **off**.

### 5. Close the ADR status (optional)

When the refactor ships and the gate is unused team-wide, update this ADR **Status** to `Superseded` or add a note with the merge PR that completed the metadata/shell work. The env gate and code may remain for future refactors.

---

## References

- `lib/i18n/locales.shared.ts` — `isAfendaSingleLocaleRefactorMode()`, `APP_LOCALES`, `FULL_APP_LOCALES`
- `i18n/request.ts` — relaxed `onError` / `getMessageFallback`
- `i18n/routing.ts` — `defineRouting` from `APP_LOCALES`
- `proxy.ts` — `createIntlMiddleware(routing)`
- `.env.config.example` — commented template for the gate
