# Afenda OpenStatus

OpenStatus is the public availability authority. Afenda `/status` is only a
branded evidence surface that reflects OpenStatus truth.

Required external setup:

1. Create the OpenStatus Cloud workspace and `Afenda Status` page.
2. Configure the public OpenStatus domain (custom domain must return **HTTP 200** for `/feed/json`; otherwise keep the `*.openstatus.dev` origin until DNS/TLS is correct).
3. Install the OpenStatus CLI on Windows:
   `iwr https://raw.githubusercontent.com/openstatusHQ/cli/refs/heads/main/install.ps1 | iex`
4. Authenticate with `openstatus login` (stores token for the CLI) and/or set
   `OPENSTATUS_API_TOKEN` in `.env.config`, then `pnpm env:sync`.
   Refresh URL/slug hints: `pnpm openstatus:env-hints`.
5. Apply `.openstatus/production.yaml` with
   `openstatus monitors apply --config .openstatus/production.yaml -y`.
6. Refresh `.openstatus/ci.yaml` monitor IDs for GitHub Synthetics:
   `pnpm openstatus:sync-ci` (uses `@openstatus/sdk-node`; filters `nexuscanon.com` URLs).
7. Set GitHub secret `OPENSTATUS_API_TOKEN`.
8. Set Vercel env vars:
   - `OPENSTATUS_API_TOKEN`
   - `OPENSTATUS_STATUS_PAGE_ID`
   - `OPENSTATUS_STATUS_PAGE_SLUG`
   - `OPENSTATUS_PUBLIC_STATUS_URL`

Do not mark `/status` live in the public trust surface until the external
workspace, monitors, incident reports, maintenance workflow, and CI synthetic
checks are in place.
