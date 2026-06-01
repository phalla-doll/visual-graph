import type { Entity } from "@/types/entity"
import type { ParsedGraph } from "@/types/graph"

function sanitizeId(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, "_")
}

function sanitizeType(type: string): string {
    return type.replace(/[^A-Za-z0-9_.]/g, "_")
}

export function toMermaidER(graph: ParsedGraph, entities: Entity[]): string {
    const byId = new Map(entities.map((e) => [e.id, e] as const))
    const lines: string[] = ["erDiagram"]

    for (const node of graph.nodes) {
        const entity = byId.get(node.id)
        const safeName = sanitizeId(node.label)
        if (!entity || entity.properties.length === 0) {
            lines.push(`  ${safeName} {}`)
            continue
        }
        lines.push(`  ${safeName} {`)
        for (const prop of entity.properties) {
            const suffix = prop.isKey ? " PK" : ""
            lines.push(
                `    ${sanitizeType(prop.type)} ${sanitizeId(prop.name)}${suffix}`
            )
        }
        lines.push("  }")
    }

    for (const edge of graph.edges) {
        const source = byId.get(edge.source)
        const target = byId.get(edge.target)
        if (!source || !target) continue
        const left = "||"
        const right = edge.cardinality === "many" ? "o{" : "||"
        lines.push(
            `  ${sanitizeId(source.name)} ${left}--${right} ${sanitizeId(target.name)} : ${sanitizeId(edge.label)}`
        )
    }

    return lines.join("\n")
}
