import { EdmxParseError, extractEntities } from "@/parser/edmx-parser"
import { XmlParseError, parseXml } from "@/parser/xml-parser"
import type { Entity } from "@/types/entity"

export type ValidationResult =
    | {
          ok: true
          entityCount: number
          schemaNamespaces: string[]
          entities: Entity[]
      }
    | { ok: false; error: string }

export function validateEdmx(xml: string): ValidationResult {
    if (!xml.trim()) return { ok: false, error: "Empty document." }
    try {
        const parsed = parseXml(xml)
        const entities = extractEntities(parsed)
        const namespaces = Array.from(
            new Set(
                entities
                    .map((e) => e.namespace)
                    .filter((n): n is string => Boolean(n))
            )
        )
        return {
            ok: true,
            entityCount: entities.length,
            schemaNamespaces: namespaces,
            entities,
        }
    } catch (err) {
        const message =
            err instanceof XmlParseError || err instanceof EdmxParseError
                ? err.message
                : err instanceof Error
                  ? err.message
                  : "Failed to parse XML."
        return { ok: false, error: message }
    }
}
