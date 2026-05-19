"use client"

import type { IamProfileSecurityViewProps } from "./iam-profile-security-context.client"
import { IamProfileSecurityProvider } from "./iam-profile-security-context.client"
import { IamProfileSecurityPanels } from "./iam-profile-security-panels.client"

export function IamProfileSecurityClient(props: IamProfileSecurityViewProps) {
  return (
    <IamProfileSecurityProvider {...props}>
      <IamProfileSecurityPanels
        currentSessionId={props.currentSessionId}
        currentSessionToken={props.currentSessionToken}
        sessions={props.sessions}
        activity={props.activity}
        hasCredential={props.hasCredential}
      />
    </IamProfileSecurityProvider>
  )
}
