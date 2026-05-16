import dagre from "@dagrejs/dagre"

export const ORG_CHART_ROOT_ID = "org-chart-root"

export type OrgChartNodeKind = "department" | "position" | "employee"

export type OrgChartHeadcount = {
  readonly budgeted: number | null
  readonly occupied: number
  readonly open: number | null
}

export type OrgChartNode = {
  readonly id: string
  readonly kind: OrgChartNodeKind
  readonly parentId: string | null
  readonly label: string
  readonly secondaryLabel: string | null
  readonly headcount?: OrgChartHeadcount
  readonly resourceId: string
}

export type OrgChartLayoutDirection = "TB" | "LR"

export type OrgChartLayoutNode = {
  readonly id: string
  readonly kind: OrgChartNodeKind
  readonly label: string
  readonly secondaryLabel: string | null
  readonly headcount?: OrgChartHeadcount
  readonly resourceId: string
  readonly position: { readonly x: number; readonly y: number }
}

export type OrgChartLayoutEdge = {
  readonly id: string
  readonly source: string
  readonly target: string
}

export type OrgChartLayoutResult = {
  readonly nodes: readonly OrgChartLayoutNode[]
  readonly edges: readonly OrgChartLayoutEdge[]
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 72

function layoutNodeSize(kind: OrgChartNodeKind): {
  width: number
  height: number
} {
  if (kind === "employee") {
    return { width: 168, height: 56 }
  }
  return { width: NODE_WIDTH, height: NODE_HEIGHT }
}

/**
 * Deterministic dagre layout for org-chart nodes. Pure function — safe for unit tests.
 */
export function layoutOrgChartNodes(
  nodes: readonly OrgChartNode[],
  direction: OrgChartLayoutDirection = "TB"
): OrgChartLayoutResult {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: direction, nodesep: 48, ranksep: 64 })

  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  for (const node of nodes) {
    const size = layoutNodeSize(node.kind)
    graph.setNode(node.id, { width: size.width, height: size.height })
  }

  const edges: OrgChartLayoutEdge[] = []
  for (const node of nodes) {
    const parentId = node.parentId ?? ORG_CHART_ROOT_ID
    if (!nodeById.has(parentId) && parentId !== ORG_CHART_ROOT_ID) {
      continue
    }
    if (parentId === ORG_CHART_ROOT_ID) {
      graph.setNode(ORG_CHART_ROOT_ID, { width: 1, height: 1 })
    }
    const edgeId = `${parentId}->${node.id}`
    graph.setEdge(parentId, node.id)
    edges.push({ id: edgeId, source: parentId, target: node.id })
  }

  dagre.layout(graph)

  const layoutedNodes: OrgChartLayoutNode[] = nodes.map((node) => {
    const positioned = graph.node(node.id)
    const size = layoutNodeSize(node.kind)
    return {
      id: node.id,
      kind: node.kind,
      label: node.label,
      secondaryLabel: node.secondaryLabel,
      headcount: node.headcount,
      resourceId: node.resourceId,
      position: {
        x: positioned.x - size.width / 2,
        y: positioned.y - size.height / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}
