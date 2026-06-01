import type { Cardinality, EntityProperty } from "./entity"

export interface GraphNode {
    id: string
    label: string
    properties: EntityProperty[]
}

export interface GraphEdge {
    id: string
    source: string
    target: string
    label: string
    cardinality: Cardinality
}

export interface ParsedGraph {
    nodes: GraphNode[]
    edges: GraphEdge[]
}
