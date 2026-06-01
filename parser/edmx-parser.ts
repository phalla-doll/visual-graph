import type { Entity, EntityProperty, Relationship } from "@/types/entity"
import { parseTypeRef } from "@/utils/cardinality"

export class EdmxParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "EdmxParseError"
    }
}

type Unknown = Record<string, unknown>

function toArray<T>(value: T | T[] | undefined | null): T[] {
    if (value == null) return []
    return Array.isArray(value) ? value : [value]
}

function asObject(value: unknown): Unknown | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Unknown)
        : null
}

function asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined
}

function coerceBool(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true
        if (value.toLowerCase() === "false") return false
    }
    return fallback
}

function findEdmx(parsed: unknown): Unknown | null {
    const root = asObject(parsed)
    if (!root) return null
    if (root["edmx:Edmx"]) return asObject(root["edmx:Edmx"])
    if (root["Edmx"]) return asObject(root["Edmx"])
    return null
}

function extractSchemas(edmx: Unknown): Unknown[] {
    const services =
        asObject(edmx["edmx:DataServices"]) ?? asObject(edmx["DataServices"])
    if (!services) return []
    const schemas = services["Schema"] ?? services["schema"]
    return toArray(schemas)
        .map(asObject)
        .filter((s): s is Unknown => s !== null)
}

function buildKeySet(entityType: Unknown): Set<string> {
    const keyNode = asObject(entityType["Key"])
    const refs = keyNode ? toArray(keyNode["PropertyRef"]) : []
    const keys = new Set<string>()
    for (const ref of refs) {
        const obj = asObject(ref)
        const name = obj ? asString(obj["@_Name"]) : undefined
        if (name) keys.add(name)
    }
    return keys
}

function buildProperties(
    entityType: Unknown,
    keys: Set<string>
): EntityProperty[] {
    return toArray(entityType["Property"])
        .map(asObject)
        .filter((p): p is Unknown => p !== null)
        .map((p): EntityProperty | null => {
            const name = asString(p["@_Name"])
            const type = asString(p["@_Type"])
            if (!name || !type) return null
            return {
                name,
                type,
                nullable: coerceBool(p["@_Nullable"], true),
                isKey: keys.has(name),
            }
        })
        .filter((p): p is EntityProperty => p !== null)
}

function buildRelationships(entityType: Unknown): Relationship[] {
    return toArray(entityType["NavigationProperty"])
        .map(asObject)
        .filter((n): n is Unknown => n !== null)
        .map((n): Relationship | null => {
            const name = asString(n["@_Name"])
            const rawType = asString(n["@_Type"])
            if (!name || !rawType) return null
            const { target, cardinality } = parseTypeRef(rawType)
            return { name, target, cardinality }
        })
        .filter((r): r is Relationship => r !== null)
}

export function extractEntities(parsed: unknown): Entity[] {
    const edmx = findEdmx(parsed)
    if (!edmx) {
        throw new EdmxParseError(
            "No <edmx:Edmx> root found — is this an EDMX document?"
        )
    }

    const schemas = extractSchemas(edmx)
    if (schemas.length === 0) {
        throw new EdmxParseError("No <Schema> found under <edmx:DataServices>.")
    }

    const entities: Entity[] = []
    for (const schema of schemas) {
        const namespace = asString(schema["@_Namespace"])
        const types = toArray(schema["EntityType"])
            .map(asObject)
            .filter((t): t is Unknown => t !== null)
        for (const type of types) {
            const name = asString(type["@_Name"])
            if (!name) continue
            const keys = buildKeySet(type)
            entities.push({
                id: namespace ? `${namespace}.${name}` : name,
                name,
                namespace,
                properties: buildProperties(type, keys),
                relationships: buildRelationships(type),
            })
        }
    }

    return entities
}
