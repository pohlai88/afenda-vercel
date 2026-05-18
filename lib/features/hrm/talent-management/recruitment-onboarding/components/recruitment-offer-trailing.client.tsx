"use client"

import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"

import {
  acceptJobOfferAction,
  approveJobOfferAction,
  convertAcceptedOfferToEmployeeFormAction,
  rejectJobOfferAction,
  sendJobOfferAction,
  withdrawJobOfferAction,
} from "../actions/recruitment.actions"
import type { JobOfferRow } from "../data/recruitment.queries.server"

type RecruitmentOfferTrailingProps = {
  orgSlug: string
  offer: JobOfferRow
  labels: {
    approveOffer: string
    sendOffer: string
    acceptOffer: string
    rejectOffer: string
    withdrawOffer: string
    convertHire: string
    fieldEmployeeNumber: string
    converted: string
  }
}

function OfferStatusForm({
  orgSlug,
  offerId,
  action,
  label,
  variant = "secondary",
}: {
  orgSlug: string
  offerId: string
  action: (formData: FormData) => Promise<void>
  label: string
  variant?: "secondary" | "outline"
}) {
  return (
    <form action={action}>
      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="offerId" value={offerId} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  )
}

export function RecruitmentOfferTrailing({
  orgSlug,
  offer,
  labels,
}: RecruitmentOfferTrailingProps) {
  return (
    <div className="flex min-w-[12rem] flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {offer.status === "draft" ? (
          <OfferStatusForm
            orgSlug={orgSlug}
            offerId={offer.id}
            action={approveJobOfferAction}
            label={labels.approveOffer}
          />
        ) : null}
        {offer.status === "approved" ? (
          <OfferStatusForm
            orgSlug={orgSlug}
            offerId={offer.id}
            action={sendJobOfferAction}
            label={labels.sendOffer}
          />
        ) : null}
        {offer.status === "sent" ? (
          <>
            <OfferStatusForm
              orgSlug={orgSlug}
              offerId={offer.id}
              action={acceptJobOfferAction}
              label={labels.acceptOffer}
            />
            <OfferStatusForm
              orgSlug={orgSlug}
              offerId={offer.id}
              action={rejectJobOfferAction}
              label={labels.rejectOffer}
              variant="outline"
            />
          </>
        ) : null}
        {offer.status === "draft" ||
        offer.status === "approved" ||
        offer.status === "sent" ? (
          <OfferStatusForm
            orgSlug={orgSlug}
            offerId={offer.id}
            action={withdrawJobOfferAction}
            label={labels.withdrawOffer}
            variant="outline"
          />
        ) : null}
      </div>
      {offer.status === "accepted" && !offer.convertedEmployeeId ? (
        <form
          action={convertAcceptedOfferToEmployeeFormAction}
          className="flex flex-col gap-2"
        >
          <input type="hidden" name="orgSlug" value={orgSlug} />
          <input type="hidden" name="offerId" value={offer.id} />
          <div className="flex flex-col gap-1">
            <Label htmlFor={`emp-${offer.id}`} className="text-xs">
              {labels.fieldEmployeeNumber}
            </Label>
            <Input
              id={`emp-${offer.id}`}
              name="employeeNumber"
              required
              maxLength={64}
            />
          </div>
          <Button type="submit" size="sm">
            {labels.convertHire}
          </Button>
        </form>
      ) : null}
      {offer.convertedEmployeeId ? (
        <p className="text-xs text-muted-foreground">
          {labels.converted}: {offer.convertedEmployeeId}
        </p>
      ) : null}
    </div>
  )
}
