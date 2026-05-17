import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import {
  completeFilingFormAction,
  updateFilingFormAction,
  waiveFilingFormAction,
} from "../actions/compliance-filing.actions"
import { listComplianceFilingsForOrg } from "../data/compliance-filing.queries.server"
import type { ComplianceSurfaceCapabilities } from "../data/compliance-capabilities.shared"

type ComplianceFilingsPanelProps = {
  readonly organizationId: string
  readonly orgSlug: string
  readonly capabilities: ComplianceSurfaceCapabilities
}

export async function ComplianceFilingsPanel({
  organizationId,
  orgSlug,
  capabilities,
}: ComplianceFilingsPanelProps) {
  const filings = await listComplianceFilingsForOrg(organizationId)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Regulatory calendar</CardTitle>
        <CardDescription>
          Filing deadlines, submission state, and confirmation evidence.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {filings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No filing obligations are recorded.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {filings.map((filing) => (
              <li key={filing.id} className="flex flex-col gap-3 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{filing.title}</span>
                  <Badge variant="outline">{filing.derivedStatus}</Badge>
                  <Badge variant="secondary">{filing.filingCategory}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {filing.countryCode ?? "Global"} · due{" "}
                  {filing.dueDate.toLocaleDateString()}
                  {filing.legalEntityCode ? ` · ${filing.legalEntityCode}` : ""}
                </p>
                {capabilities.canUpdate ? (
                  <div className="grid gap-2 lg:grid-cols-3">
                    <form action={updateFilingFormAction} className="flex flex-col gap-2">
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="filingId" value={filing.id} />
                      <Input name="submittedAt" type="date" required />
                      <Input
                        name="confirmationReference"
                        placeholder="Submission reference"
                      />
                      <Button type="submit" size="sm" variant="secondary">
                        Mark submitted
                      </Button>
                    </form>
                    <form
                      action={completeFilingFormAction}
                      className="flex flex-col gap-2"
                    >
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="filingId" value={filing.id} />
                      <Input name="confirmedAt" type="date" required />
                      <Input
                        name="confirmationReference"
                        placeholder="Authority confirmation"
                        required
                      />
                      <Button type="submit" size="sm" variant="outline">
                        Confirm
                      </Button>
                    </form>
                    <form action={waiveFilingFormAction} className="flex flex-col gap-2">
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="filingId" value={filing.id} />
                      <Textarea
                        name="waiverReason"
                        required
                        rows={2}
                        placeholder="Waiver reason"
                      />
                      <Input
                        name="approvalReference"
                        required
                        placeholder="Approval reference"
                      />
                      <Button type="submit" size="sm" variant="ghost">
                        Waive
                      </Button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
