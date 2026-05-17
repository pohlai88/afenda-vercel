import type { EmployeeMasterSnapshot } from "../../../types"

const REDACTED_VALUE = "[redacted]"

function redactString<T extends string | null>(value: T): T {
  return (value === null ? null : REDACTED_VALUE) as T
}

function redactUnknown<T>(value: T | null): T | null {
  return value === null ? null : (REDACTED_VALUE as T)
}

function isPublicDocument(classification: string): boolean {
  return classification === "public"
}

export function maskEmployeeMasterSnapshotSensitiveFields(
  snapshot: EmployeeMasterSnapshot,
  options: { canReadSensitive: boolean }
): EmployeeMasterSnapshot {
  if (options.canReadSensitive) return snapshot

  return {
    ...snapshot,
    employee: {
      ...snapshot.employee,
      dateOfBirth: null,
      idDocumentNumber: redactString(snapshot.employee.idDocumentNumber),
      address: redactUnknown(snapshot.employee.address),
    },
    personalProfile: snapshot.personalProfile
      ? {
          ...snapshot.personalProfile,
          dateOfBirth: null,
          profilePhotoBlobUrl: redactString(
            snapshot.personalProfile.profilePhotoBlobUrl
          ),
        }
      : null,
    contactProfile: snapshot.contactProfile
      ? {
          ...snapshot.contactProfile,
          personalEmail: redactString(snapshot.contactProfile.personalEmail),
          personalPhone: redactString(snapshot.contactProfile.personalPhone),
          address: redactUnknown(snapshot.contactProfile.address),
          mailingAddress: redactUnknown(snapshot.contactProfile.mailingAddress),
        }
      : null,
    identityDocuments: snapshot.identityDocuments.map((document) => ({
      ...document,
      documentNumber: REDACTED_VALUE,
    })),
    workAuthorizations: snapshot.workAuthorizations.map((authorization) => ({
      ...authorization,
      documentNumber: redactString(authorization.documentNumber),
      notes: redactString(authorization.notes),
    })),
    emergencyContacts: snapshot.emergencyContacts.map((contact) => ({
      ...contact,
      phone: REDACTED_VALUE,
      alternatePhone: redactString(contact.alternatePhone),
      email: redactString(contact.email),
    })),
    payrollProfile: snapshot.payrollProfile
      ? {
          ...snapshot.payrollProfile,
          taxIdentifierNumber: redactString(
            snapshot.payrollProfile.taxIdentifierNumber
          ),
          epfNumber: redactString(snapshot.payrollProfile.epfNumber),
          socsoNumber: redactString(snapshot.payrollProfile.socsoNumber),
          bankAccountTokenized: redactString(
            snapshot.payrollProfile.bankAccountTokenized
          ),
          bankAccountHolderName: redactString(
            snapshot.payrollProfile.bankAccountHolderName
          ),
          statutoryProfileExtras: redactUnknown(
            snapshot.payrollProfile.statutoryProfileExtras
          ),
        }
      : null,
    documents: snapshot.documents.map((document) =>
      isPublicDocument(document.classification)
        ? document
        : {
            ...document,
            blobUrl: REDACTED_VALUE,
            payloadHash: REDACTED_VALUE,
          }
    ),
  }
}
