"use client"

import { useCallback, useMemo, useState } from "react"
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { useTranslations } from "next-intl"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#components2/ui/dialog"
import { Link } from "#i18n/navigation"

import {
  layoutOrgChartNodes,
  type OrgChartLayoutDirection,
  type OrgChartLayoutNode,
  type OrgChartNode,
  type OrgChartNodeKind,
} from "../data/org-chart.shared"
import type { OrgStructureSurfaceCapabilities } from "../data/org-structure-capabilities.shared"

import {
  OrganizationDepartmentArchiveForm,
  OrganizationPositionArchiveForm,
} from "./organization-structure-forms"

type OrgChartCanvasProps = {
  readonly orgSlug: string
  readonly capabilities: OrgStructureSurfaceCapabilities
  readonly sourceNodes: readonly OrgChartNode[]
}

type OrgChartFlowData = {
  readonly kind: OrgChartNodeKind
  readonly label: string
  readonly secondaryLabel: string | null
  readonly headcount?: OrgChartLayoutNode["headcount"]
  readonly resourceId: string
}

function OrgChartFlowNode({
  data,
  selected,
}: NodeProps<Node<OrgChartFlowData>>) {
  const t = useTranslations("Dashboard.Hrm.organization.chart")
  const kindLabel =
    data.kind === "department"
      ? t("kindDepartment")
      : data.kind === "position"
        ? t("kindPosition")
        : t("kindEmployee")

  return (
    <div
      className={`min-w-[10rem] border bg-card px-3 py-2 shadow-sm ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {kindLabel}
      </div>
      <div className="mt-1 text-sm leading-tight font-semibold">
        {data.label}
      </div>
      {data.secondaryLabel ? (
        <div className="text-xs text-muted-foreground">
          {data.secondaryLabel}
        </div>
      ) : null}
      {data.kind === "position" && data.headcount ? (
        <div className="mt-2 flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            {t("headcount.budgeted")}: {data.headcount.budgeted ?? "—"}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {t("headcount.occupied")}: {data.headcount.occupied}
          </Badge>
          {data.headcount.open !== null ? (
            <Badge variant="outline" className="text-[10px]">
              {t("headcount.open")}: {data.headcount.open}
            </Badge>
          ) : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

const nodeTypes = { orgChart: OrgChartFlowNode }

function OrgChartFlow({
  orgSlug,
  capabilities,
  sourceNodes,
}: OrgChartCanvasProps) {
  const t = useTranslations("Dashboard.Hrm.organization.chart")
  const [direction, setDirection] = useState<OrgChartLayoutDirection>("TB")
  const [selected, setSelected] = useState<OrgChartFlowData | null>(null)

  const layout = useMemo(
    () => layoutOrgChartNodes(sourceNodes, direction),
    [direction, sourceNodes]
  )

  const flowNodes: Node<OrgChartFlowData>[] = useMemo(
    () =>
      layout.nodes.map((node) => ({
        id: node.id,
        type: "orgChart",
        position: node.position,
        data: {
          kind: node.kind,
          label: node.label,
          secondaryLabel: node.secondaryLabel,
          headcount: node.headcount,
          resourceId: node.resourceId,
        },
      })),
    [layout.nodes]
  )

  const flowEdges = useMemo(
    () =>
      layout.edges
        .filter(
          (edge) =>
            edge.source !== "org-chart-root" && edge.target !== "org-chart-root"
        )
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep" as const,
        })),
    [layout.edges]
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<OrgChartFlowData>) => {
      setSelected(node.data)
    },
    []
  )

  if (sourceNodes.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("empty")}</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={direction === "TB" ? "default" : "outline"}
          onClick={() => setDirection("TB")}
        >
          {t("layoutVertical")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={direction === "LR" ? "default" : "outline"}
          onClick={() => setDirection("LR")}
        >
          {t("layoutHorizontal")}
        </Button>
      </div>

      <div className="h-[min(32rem,70vh)] w-full border border-border">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={onNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.label}</DialogTitle>
                {selected.secondaryLabel ? (
                  <DialogDescription>
                    {selected.secondaryLabel}
                  </DialogDescription>
                ) : null}
              </DialogHeader>
              <div className="flex flex-col gap-3">
                {selected.kind === "employee" ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/o/${orgSlug}/dashboard/hrm/employees/${selected.resourceId}`}
                    >
                      {t("openEmployee")}
                    </Link>
                  </Button>
                ) : null}
                {selected.kind === "employee" ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/o/${orgSlug}/dashboard/hrm/organization?tab=assignments`}
                    >
                      {t("openAssignments")}
                    </Link>
                  </Button>
                ) : null}
                {capabilities.canDelete && selected.kind === "department" ? (
                  <OrganizationDepartmentArchiveForm
                    orgSlug={orgSlug}
                    departmentId={selected.resourceId}
                  />
                ) : null}
                {capabilities.canDelete && selected.kind === "position" ? (
                  <OrganizationPositionArchiveForm
                    orgSlug={orgSlug}
                    positionId={selected.resourceId}
                  />
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function OrgChartCanvas(props: OrgChartCanvasProps) {
  return (
    <ReactFlowProvider>
      <OrgChartFlow {...props} />
    </ReactFlowProvider>
  )
}
