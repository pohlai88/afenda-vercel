"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "#components2/ui/field"
import { Input } from "#components2/ui/input"
import { NativeSelect, NativeSelectOption } from "#components2/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components2/ui/tabs"

import {
  assignErpRoleMemberAction,
  assignTenantAuthorityAction,
  createErpRoleAction,
  grantErpPermissionAction,
  removeErpRoleMemberAction,
  revokeErpPermissionAction,
  revokeTenantAuthorityAction,
} from "../actions/access-admin.actions"
import { ERP_PERMISSION_REGISTRY } from "../constants"
import type {
  AccessMemberRow,
  ErpRbacActionState,
  ErpRoleMemberRow,
  ErpRolePermissionRow,
  ErpRoleRow,
  TenantAuthorityAssignmentRow,
} from "../types"

function SubmitButton({
  label,
  pendingLabel,
  variant = "default",
}: {
  label: string
  pendingLabel: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

function ActionStateMessage({ state }: { state: ErpRbacActionState }) {
  if (!state) return null
  if (state.ok) {
    return <p className="text-sm text-muted-foreground">{state.message}</p>
  }
  return (
    <Alert variant="destructive">
      <AlertTitle>Action failed</AlertTitle>
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}

function AuthorityAssignForm({
  members,
}: {
  members: readonly AccessMemberRow[]
}) {
  const [state, formAction] = useActionState(assignTenantAuthorityAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="authority-user">Member</FieldLabel>
          <FieldContent>
            <NativeSelect id="authority-user" name="userId" defaultValue="">
              <NativeSelectOption value="" disabled>
                Select a member
              </NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.userId} value={member.userId}>
                  {member.userName ?? member.userEmail}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="authority-role">Authority</FieldLabel>
          <FieldContent>
            <NativeSelect
              id="authority-role"
              name="role"
              defaultValue="tenant_support_admin"
            >
              <NativeSelectOption value="tenant_support_admin">
                Support admin
              </NativeSelectOption>
              <NativeSelectOption value="tenant_key_admin">
                Key admin
              </NativeSelectOption>
              <NativeSelectOption value="tenant_owner">
                Tenant owner
              </NativeSelectOption>
            </NativeSelect>
            <FieldDescription>
              Tenant authority governs configuration and RBAC management, not
              ERP execution.
            </FieldDescription>
          </FieldContent>
        </Field>
      </FieldGroup>
      <SubmitButton label="Assign authority" pendingLabel="Assigning..." />
      <ActionStateMessage state={state} />
    </form>
  )
}

function CreateRoleForm() {
  const [state, formAction] = useActionState(createErpRoleAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="role-name">Role name</FieldLabel>
          <FieldContent>
            <Input id="role-name" name="name" required />
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="role-description">Description</FieldLabel>
          <FieldContent>
            <Input id="role-description" name="description" />
          </FieldContent>
        </Field>
      </FieldGroup>
      <SubmitButton label="Create ERP role" pendingLabel="Creating..." />
      <ActionStateMessage state={state} />
    </form>
  )
}

function AssignRoleMemberForm({
  members,
  roles,
}: {
  members: readonly AccessMemberRow[]
  roles: readonly ErpRoleRow[]
}) {
  const [state, formAction] = useActionState(assignErpRoleMemberAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="membership-role">ERP role</FieldLabel>
          <FieldContent>
            <NativeSelect id="membership-role" name="roleId" defaultValue="">
              <NativeSelectOption value="" disabled>
                Select a role
              </NativeSelectOption>
              {roles.map((role) => (
                <NativeSelectOption key={role.id} value={role.id}>
                  {role.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="membership-user">Member</FieldLabel>
          <FieldContent>
            <NativeSelect id="membership-user" name="userId" defaultValue="">
              <NativeSelectOption value="" disabled>
                Select a member
              </NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.userId} value={member.userId}>
                  {member.userName ?? member.userEmail}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
      </FieldGroup>
      <SubmitButton label="Assign member" pendingLabel="Assigning..." />
      <ActionStateMessage state={state} />
    </form>
  )
}

function GrantPermissionForm({ roles }: { roles: readonly ErpRoleRow[] }) {
  const [state, formAction] = useActionState(grantErpPermissionAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="grant-role">ERP role</FieldLabel>
          <FieldContent>
            <NativeSelect id="grant-role" name="roleId" defaultValue="">
              <NativeSelectOption value="" disabled>
                Select a role
              </NativeSelectOption>
              {roles.map((role) => (
                <NativeSelectOption key={role.id} value={role.id}>
                  {role.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="grant-permission">Permission</FieldLabel>
          <FieldContent>
            <NativeSelect
              id="grant-permission"
              name="permissionKey"
              defaultValue=""
            >
              <NativeSelectOption value="" disabled>
                Select a permission
              </NativeSelectOption>
              {ERP_PERMISSION_REGISTRY.map((permission) => (
                <NativeSelectOption key={permission.key} value={permission.key}>
                  {permission.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </FieldContent>
        </Field>
      </FieldGroup>
      <SubmitButton label="Grant permission" pendingLabel="Granting..." />
      <ActionStateMessage state={state} />
    </form>
  )
}

function RevokeAuthorityForm({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState(revokeTenantAuthorityAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <SubmitButton
        label="Revoke"
        pendingLabel="Revoking..."
        variant="destructive"
      />
      <ActionStateMessage state={state} />
    </form>
  )
}

function RemoveRoleMemberForm({ membershipId }: { membershipId: string }) {
  const [state, formAction] = useActionState(removeErpRoleMemberAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="membershipId" value={membershipId} />
      <SubmitButton
        label="Remove"
        pendingLabel="Removing..."
        variant="destructive"
      />
      <ActionStateMessage state={state} />
    </form>
  )
}

function RevokePermissionForm({ permissionId }: { permissionId: string }) {
  const [state, formAction] = useActionState(revokeErpPermissionAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="permissionId" value={permissionId} />
      <SubmitButton
        label="Revoke"
        pendingLabel="Revoking..."
        variant="destructive"
      />
      <ActionStateMessage state={state} />
    </form>
  )
}

function roleBadge(legacyRole: string) {
  if (legacyRole === "owner") return "secondary"
  if (legacyRole === "admin") return "default"
  return "outline"
}

export function AccessAdminClient({
  members,
  authorities,
  roles,
  roleMembers,
  rolePermissions,
}: {
  members: readonly AccessMemberRow[]
  authorities: readonly TenantAuthorityAssignmentRow[]
  roles: readonly ErpRoleRow[]
  roleMembers: readonly ErpRoleMemberRow[]
  rolePermissions: readonly ErpRolePermissionRow[]
}) {
  const roleById = new Map(roles.map((role) => [role.id, role]))
  const permissionByKey = new Map(
    ERP_PERMISSION_REGISTRY.map((permission) => [permission.key, permission])
  )

  return (
    <Tabs defaultValue="authorities" className="flex flex-col gap-6">
      <TabsList>
        <TabsTrigger value="authorities">Tenant authority</TabsTrigger>
        <TabsTrigger value="roles">ERP roles</TabsTrigger>
        <TabsTrigger value="grants">Permission grants</TabsTrigger>
      </TabsList>

      <TabsContent value="authorities" className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Assign governance authority</CardTitle>
            <CardDescription>
              Separate tenant governance from ERP execution. All admins must
              remain tenant members.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthorityAssignForm members={members} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active tenant authorities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Legacy member role</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorities
                  .filter((assignment) => assignment.status === "active")
                  .map((assignment) => {
                    const member = members.find(
                      (item) => item.userId === assignment.userId
                    )
                    return (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          {assignment.userName ?? assignment.userEmail}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleBadge(member?.role ?? "member")}>
                            {member?.role ?? "member"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{assignment.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <RevokeAuthorityForm assignmentId={assignment.id} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roles" className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create ERP role</CardTitle>
            <CardDescription>
              Roles carry business permissions. They do not inherit from tenant
              admin status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateRoleForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assign members to ERP roles</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <AssignRoleMemberForm members={members} roles={roles} />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleMembers
                  .filter((membership) => membership.status === "active")
                  .map((membership) => (
                    <TableRow key={membership.id}>
                      <TableCell>
                        {roleById.get(membership.roleId)?.name ??
                          membership.roleId}
                      </TableCell>
                      <TableCell>
                        {membership.userName ?? membership.userEmail}
                      </TableCell>
                      <TableCell>
                        <RemoveRoleMemberForm membershipId={membership.id} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="grants" className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Grant permissions</CardTitle>
            <CardDescription>
              CRUD-SAP permissions are explicit. Lifecycle duties remain split
              by SoD rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GrantPermissionForm roles={roles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current grants</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead>Sensitivity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rolePermissions
                  .filter((permission) => permission.status === "active")
                  .map((permission) => {
                    const key =
                      `${permission.module}.${permission.object}.${permission.function}` as const
                    const definition = permissionByKey.get(key)
                    return (
                      <TableRow key={permission.id}>
                        <TableCell>
                          {roleById.get(permission.roleId)?.name ??
                            permission.roleId}
                        </TableCell>
                        <TableCell>{definition?.label ?? key}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {definition?.sensitivity ?? "standard"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RevokePermissionForm permissionId={permission.id} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
