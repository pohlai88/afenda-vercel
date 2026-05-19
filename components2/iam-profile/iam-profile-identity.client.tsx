"use client"

import {
  IamProfileIdentityProvider,
  type IamProfileIdentityViewProps,
} from "./iam-profile-identity-context.client"
import { IamProfileIdentityPanels } from "./iam-profile-identity-panels.client"

export function IamProfileIdentityClient(props: IamProfileIdentityViewProps) {
  return (
    <IamProfileIdentityProvider {...props}>
      <IamProfileIdentityPanels />
    </IamProfileIdentityProvider>
  )
}
