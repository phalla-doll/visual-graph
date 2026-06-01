import type { Cardinality } from "@/types/entity"

const COLLECTION_RE = /^Collection\((.+)\)$/

export function parseTypeRef(typeRef: string): {
    target: string
    cardinality: Cardinality
} {
    const match = COLLECTION_RE.exec(typeRef.trim())
    const inner = match ? match[1] : typeRef
    const short = inner.split(".").pop() ?? inner
    return { target: short, cardinality: match ? "many" : "one" }
}
