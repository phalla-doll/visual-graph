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

    return { nodes, edges }
}
