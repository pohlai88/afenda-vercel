# Legal Declarations Truth Refresh

Reviewed on `2026-05-09` against repository evidence and official source pages only.

## Summary

- Added canonical review metadata to each declaration: `reviewedAt` and `sourceRefs`.
- Replaced build-time sitemap freshness with stable declaration review timestamps.
- Added a legal-declaration validator and unit coverage for placeholders, stale route copy, source refs, and trust/sitemap alignment.

## Removed Or Rewritten

- Removed stale support-page language that treated `/legal-docs/subprocessors` and `/legal-docs/data-processing-addendum` as future routes.
- Rewrote DPA copy that overreached into unsupported legal-basis detail and converted it to section-mapped, source-backed public baseline wording.
- Rewrote subprocessor copy to distinguish:
  current production or conditional processors,
  requested but not validated vendors,
  development tooling that is not part of the live production processor set.

## Withheld

- No certification, uptime SLA, or broader trust claim was added.
- No new vendor-region or residency promise was added beyond what the repository and official vendor sources support.
- Development AI tools remain outside the production subprocessor set unless customer data is deliberately submitted through them.

## Official Sources Used

- Malaysia PDPA Act 709:
  `https://www.pdp.gov.my/ppdpv1/en/akta/pdp-act-2010-en/`
- Malaysia PDPA Amendment Act A1727:
  `https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/`
- Vercel DPA:
  `https://vercel.com/legal/dpa`
- Neon subprocessors:
  `https://neon.com/subprocessors`
- OpenAI subprocessor list and DPA:
  `https://openai.com/policies/sub-processor-list/`
  `https://cdn.openai.com/pdf/openai-data-processing-addendum.pdf`
- Upstash DPA:
  `https://upstash.com/trust/dpa.pdf`
- Resend DPA:
  `https://resend.com/legal/dpa`
- Sentry DPA information:
  `https://sentry.zendesk.com/hc/en-us/articles/23856572755611-How-do-I-sign-your-Data-Processing-Addendum`
- Additional reviewed vendor sources are recorded in the `subprocessors` declaration `sourceRefs`.

## Remaining Gaps

- Company identity and mailbox values were retained from current repo canon; they were not replaced from an external company-registry extract in this refresh.
- Customer-specific residency, negotiated DPA terms, and sector-specific compliance obligations still require implementation-specific review.
- The validator checks source reachability and registry consistency. It does not interpret statutory text or vendor contracts on behalf of counsel.
