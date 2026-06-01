import dagre from "dagre"
import type {
    Edge as ReactFlowEdge,
    Node as ReactFlowNode,
} from "@xyflow/react"

import type { GraphEdge, GraphNode } from "@/types/graph"
import type { EntityProperty } from "@/types/entity"

const NODE_MIN_WIDTH = 240
const NODE_MAX_WIDTH = 520
const NODE_HEIGHT_BASE = 60
const ROW_HEIGHT = 18
const MAX_NODE_HEIGHT = 360

const CHAR_W_LABEL = 7.5
const CHAR_W_NAME = 6.5
const CHAR_W_TYPE = 6
const PADDING_X = 24
const ROW_GAP = 8
const PK_BADGE = 26
const HEADER_TOGGLE = 24

export type EntityNodeData = {
    label: string
    properties: EntityProperty[]
    width: number
}

export type RelationshipEdgeData = {
    cardinality: "one" | "many"
}

export type LayoutedGraph = {
    nodes: ReactFlowNode<EntityNodeData>[]
    edges: ReactFlowEdge<RelationshipEdgeData>[]
}

function nodeHeight(node: GraphNode): number {
    return Math.min(
        NODE_HEIGHT_BASE + node.properties.length * ROW_HEIGHT,
        MAX_NODE_HEIGHT
    )
}

function estimateNodeWidth(node: GraphNode): number {
    const headerW = PADDING_X + HEADER_TOGGLE + node.label.length * CHAR_W_LABEL
    let rowW = 0
    for (const p of node.properties) {
        const left = (p.isKey ? PK_BADGE : 0) + p.name.length * CHAR_W_NAME
        const typeText = p.nullable ? p.type.length + 1 : p.type.length
        const right = typeText * CHAR_W_TYPE
        const total = PADDING_X + left + ROW_GAP + right
        if (total > rowW) rowW = total
    }
    const estimated = Math.ceil(Math.max(headerW, rowW))
    return Math.min(Math.max(NODE_MIN_WIDTH, estimated), NODE_MAX_WIDTH)
}

export function layoutGraph(
    nodes: GraphNode[],
    edges: GraphEdge[],
    direction: "LR" | "TB" = "LR"
): LayoutedGraph {
    const g = new dagre.graphlib.Graph()
    g.setGraph({
        rankdir: direction,
        nodesep: 60,
        ranksep: 100,
        marginx: 24,
        marginy: 24,
    })
    g.setDefaultEdgeLabel(() => ({}))

    const widths = new Map<string, number>()
    for (const node of nodes) {
        const width = estimateNodeWidth(node)
        widths.set(node.id, width)
        g.setNode(node.id, { width, height: nodeHeight(node) })
    }
    for (const edge of edges) {
        g.setEdge(edge.source, edge.target)
    }

    dagre.layout(g)

    const rfNodes: ReactFlowNode<EntityNodeData>[] = nodes.map((node) => {
        const positioned = g.node(node.id)
        const width = widths.get(node.id) ?? NODE_MIN_WIDTH
        const height = nodeHeight(node)
        return {
            id: node.id,
            type: "entity",
            position: {
                x: positioned.x - width / 2,
                y: positioned.y - height / 2,
            },
            data: {
                label: node.label,
                properties: node.properties,
                width,
            },
        }
    })

    const rfEdges: ReactFlowEdge<RelationshipEdgeData>[] = edges.map(
        (edge) => ({
            id: edge.id,
            type: "relationship",
            source: edge.source,
            target: edge.target,
            label: edge.label,
            data: { cardinality: edge.cardinality },
        })
    )

    return { nodes: rfNodes, edges: rfEdges }
}
