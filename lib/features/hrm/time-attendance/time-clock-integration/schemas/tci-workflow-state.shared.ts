export const TCI_DEVICE_TYPES = [
  "biometric",
  "card",
  "rfid",
  "kiosk",
  "web",
  "api",
] as const

export type TciDeviceType = (typeof TCI_DEVICE_TYPES)[number]

export const TCI_DEVICE_STATES = ["active", "inactive", "revoked"] as const

export type TciDeviceState = (typeof TCI_DEVICE_STATES)[number]

export const TCI_MAPPING_STATES = ["active", "inactive"] as const

export type TciMappingState = (typeof TCI_MAPPING_STATES)[number]

export const TCI_PUNCH_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
  "correction",
] as const

export type TciPunchEventType = (typeof TCI_PUNCH_EVENT_TYPES)[number]

export const TCI_EXCEPTION_STATES = [
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const

export type TciExceptionState = (typeof TCI_EXCEPTION_STATES)[number]

export const TCI_DETECTION_OUTCOMES = [
  "verified",
  "unknown_employee",
  "inactive_employee",
  "unmapped_device_user",
  "duplicate_punch",
  "outside_shift_window",
  "inactive_device",
] as const

export type TciDetectionOutcome = (typeof TCI_DETECTION_OUTCOMES)[number]

export const TCI_SYNC_SOURCE_KINDS = [
  "api",
  "manual_import",
  "scheduled",
  "offline_replay",
] as const

export type TciSyncSourceKind = (typeof TCI_SYNC_SOURCE_KINDS)[number]
