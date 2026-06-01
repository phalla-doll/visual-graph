import type { Cardinality, Entity } from "@/types/entity"

export interface IncomingRelationship {
    fromEntity: Entity
    name: string
    cardinality: Cardinality
}

export function collectIncoming(
    target: Entity,
    all: Entity[]
): IncomingRelationship[] {
    const acc: IncomingRelationship[] = []
    for (const other of all) {
        if (other.id === target.id) continue
        for (const rel of other.relationships) {
            if (rel.target === target.name) {
                acc.push({
                    fromEntity: other,
                    name: rel.name,
                    cardinality: rel.cardinality,
                })
            }
        }
    }
    return acc
}
