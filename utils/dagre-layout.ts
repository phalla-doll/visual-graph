import dagre from "dagre"
import type {
    Edge as ReactFlowEdge,
    Node as ReactFlowNode,
} from "@xyflow/react"

import type { GraphEdge, GraphNode } from "@/types/graph"
import type { EntityProperty } from "@/types/entity"

const NODE_WIDTH = 240
const NODE_HEIGHT_BASE = 60
const ROW_HEIGHT = 18
const MAX_NODE_HEIGHT = 360

export type EntityNodeData = {
    label: string
    properties: EntityProperty[]
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

    for (const node of nodes) {
        g.setNode(node.id, { width: NODE_WIDTH, height: nodeHeight(node) })
    }
    for (const edge of edges) {
        g.setEdge(edge.source, edge.target)
    }

    dagre.layout(g)

    const rfNodes: ReactFlowNode<EntityNodeData>[] = nodes.map((node) => {
        const positioned = g.node(node.id)
        const height = nodeHeight(node)
        return {
            id: node.id,
            type: "entity",
            position: {
                x: positioned.x - NODE_WIDTH / 2,
                y: positioned.y - height / 2,
            },
            data: { label: node.label, properties: node.properties },
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
