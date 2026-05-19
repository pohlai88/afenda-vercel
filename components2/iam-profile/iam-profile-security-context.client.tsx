"use client"

import { createContext, useContext, type ReactNode } from "react"

import type {
  IamProfileSecurityActivityRow,
  IamProfileSecuritySessionRow,
} from "./iam-profile.types.shared"

export type IamProfileSecurityViewProps = {
  currentSessionId: string
  currentSessionToken: string
  sessions: IamProfileSecuritySessionRow[]
  activity: IamProfileSecurityActivityRow[]
  hasCredential: boolean
}

const IamProfileSecurityContext =
  createContext<IamProfileSecurityViewProps | null>(null)

export function useIamProfileSecurity() {
  const ctx = useContext(IamProfileSecurityContext)
  if (!ctx) {
    throw new Error(
      "useIamProfileSecurity must be used within IamProfileSecurityProvider"
    )
  }
  return ctx
}

/** Serializable session/activity props bridge for compound security panels. */
export function IamProfileSecurityProvider({
  children,
  ...props
}: IamProfileSecurityViewProps & { children: ReactNode }) {
  return (
    <IamProfileSecurityContext.Provider value={props}>
      {children}
    </IamProfileSecurityContext.Provider>
  )
}
