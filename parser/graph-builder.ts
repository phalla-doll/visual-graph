import type { Entity } from "@/types/entity"
import type { GraphEdge, GraphNode, ParsedGraph } from "@/types/graph"

export function buildGraph(entities: Entity[]): ParsedGraph {
    const byShortName = new Map<string, Entity>()
    for (const entity of entities) {
        byShortName.set(entity.name, entity)
    }

    const nodes: GraphNode[] = entities.map((entity) => ({
        id: entity.id,
        label: entity.name,
        properties: entity.properties,
    }))

    const edges: GraphEdge[] = []
    const seen = new Set<string>()

    for (const entity of entities) {
        for (const rel of entity.relationships) {
            const target = byShortName.get(rel.target)
            if (!target) {
                console.warn(
                    `[graph-builder] skipping ${entity.name}.${rel.name} → unknown target "${rel.target}"`
                )
                continue
            }
            const id = `${entity.id}->${target.id}:${rel.name}`
            if (seen.has(id)) continue
            seen.add(id)
            edges.push({
                id,
                source: entity.id,
                target: target.id,
                label: rel.name,
                cardinality: rel.cardinality,
            })
        }
    }

    assignLabelOffsets(edges)

    return { nodes, edges }
}

const PAIR_LABEL_SPACING = 16

function assignLabelOffsets(edges: GraphEdge[]) {
    const groups = new Map<string, GraphEdge[]>()
    for (const edge of edges) {
        const [a, b] =
            edge.source < edge.target
                ? [edge.source, edge.target]
                : [edge.target, edge.source]
        const key = `${a}|${b}`
        const list = groups.get(key)
        if (list) list.push(edge)
        else groups.set(key, [edge])
    }

    for (const list of groups.values()) {
        if (list.length < 2) continue
        list.sort((a, b) => a.id.localeCompare(b.id))
        const center = (list.length - 1) / 2
        list.forEach((edge, i) => {
            edge.labelOffset = (i - center) * PAIR_LABEL_SPACING * 2
        })
    }
}
