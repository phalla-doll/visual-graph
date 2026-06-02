import { NextResponse } from "next/server"

import { streamNvidiaCompletion } from "@/lib/nvidia-stream"
import type { Entity, EntityProperty } from "@/types/entity"

interface IncomingRef {
    fromName: string
    name: string
    cardinality: "one" | "many"
}

type SqlDialect = "postgres" | "mysql" | "mssql" | "sqlite" | "ansi"

const DIALECT_LABEL: Record<SqlDialect, string> = {
    postgres: "PostgreSQL",
    mysql: "MySQL",
    mssql: "Microsoft SQL Server (T-SQL)",
    sqlite: "SQLite",
    ansi: "ANSI SQL",
}

interface SqlRequest {
    entity: Entity
    neighbors: Entity[]
    incoming: IncomingRef[]
    question: string
    dialect: SqlDialect
}

// Match summarize route's bound for prompt-size control.
const MAX_LISTED_NON_KEY_PROPS = 10

function stripEdm(type: string): string {
    return type.startsWith("Edm.") ? type.slice(4) : type
}

function columnLine(p: EntityProperty): string {
    const flags: string[] = []
    if (p.isKey) flags.push("PK")
    flags.push(p.nullable ? "NULL" : "NOT NULL")
    return `  ${p.name} ${stripEdm(p.type)} [${flags.join(", ")}]`
}

function entityBlock(entity: Entity): string {
    const keys = entity.properties.filter((p) => p.isKey)
    const nonKeys = entity.properties.filter((p) => !p.isKey)
    const listed = nonKeys.slice(0, MAX_LISTED_NON_KEY_PROPS)
    const omitted = nonKeys.length - listed.length
    const lines: string[] = []
    lines.push(`TABLE ${entity.name} (`)
    for (const p of keys) lines.push(columnLine(p))
    for (const p of listed) lines.push(columnLine(p))
    if (omitted > 0) lines.push(`  -- (+${omitted} more columns omitted)`)
    lines.push(")")
    return lines.join("\n")
}

function relationshipLines(entity: Entity, incoming: IncomingRef[]): string[] {
    const lines: string[] = []
    for (const r of entity.relationships) {
        const arrow = r.cardinality === "many" ? "→ many" : "→ one"
        lines.push(`  ${entity.name}.${r.name} ${arrow} ${r.target}`)
    }
    for (const r of incoming) {
        const arrow = r.cardinality === "many" ? "← many" : "← one"
        lines.push(`  ${r.fromName}.${r.name} ${arrow} ${entity.name}`)
    }
    return lines
}

function buildPrompt({
    entity,
    neighbors,
    incoming,
    question,
    dialect,
}: SqlRequest): string {
    const dialectLabel = DIALECT_LABEL[dialect]
    const sections: string[] = []
    sections.push(
        `You are a SQL expert. Generate a single ${dialectLabel} query that answers the user's question, using the schema below.`
    )
    sections.push("")
    sections.push("Schema:")
    sections.push("")
    sections.push(entityBlock(entity))
    for (const n of neighbors) {
        sections.push("")
        sections.push(entityBlock(n))
    }
    const relLines = relationshipLines(entity, incoming)
    if (relLines.length) {
        sections.push("")
        sections.push("Relationships (use these to derive JOIN keys):")
        sections.push(...relLines)
    }
    sections.push("")
    sections.push(`Focus entity: ${entity.name}`)
    sections.push("")
    sections.push("Question:")
    sections.push(question.trim())
    sections.push("")
    sections.push(
        "Return ONLY the SQL statement. No prose, no explanation, no markdown code fences."
    )
    return sections.join("\n")
}

function isValidEntity(v: unknown): v is Entity {
    if (!v || typeof v !== "object") return false
    const e = v as Record<string, unknown>
    return (
        typeof e.name === "string" &&
        Array.isArray(e.properties) &&
        Array.isArray(e.relationships)
    )
}

function isValidPayload(body: unknown): body is SqlRequest {
    if (!body || typeof body !== "object") return false
    const b = body as Record<string, unknown>
    if (!isValidEntity(b.entity)) return false
    if (!Array.isArray(b.neighbors)) return false
    if (!b.neighbors.every(isValidEntity)) return false
    if (!Array.isArray(b.incoming)) return false
    if (typeof b.question !== "string" || !b.question.trim()) return false
    if (typeof b.dialect !== "string") return false
    if (!(b.dialect in DIALECT_LABEL)) return false
    return true
}

function cleanSql(raw: string): string {
    let s = raw.trim()
    // Strip markdown code fences if the model included them despite instructions.
    const fence = /^```(?:sql)?\s*\n([\s\S]*?)\n```$/i
    const match = s.match(fence)
    if (match) s = match[1].trim()
    return s
}

export async function POST(request: Request) {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
        return NextResponse.json(
            {
                error: "AI SQL is not configured: NVIDIA_API_KEY is unset on the server.",
            },
            { status: 503 }
        )
    }

    let body: unknown
    try {
        body = await request.json()
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body." },
            { status: 400 }
        )
    }

    if (!isValidPayload(body)) {
        return NextResponse.json(
            { error: "Invalid request payload." },
            { status: 400 }
        )
    }

    const prompt = buildPrompt(body)
    const result = await streamNvidiaCompletion({ prompt, apiKey })
    if (!result.ok) {
        return NextResponse.json(
            { error: result.error },
            { status: result.status }
        )
    }

    const sql = cleanSql(result.content || result.reasoning)
    if (!sql) {
        return NextResponse.json(
            {
                error: `Upstream did not return SQL (finish_reason=${result.finishReason ?? "unknown"}).`,
            },
            { status: 502 }
        )
    }
    if (result.finishReason === "length") {
        return NextResponse.json(
            {
                error: "Model ran out of token budget before completing the query. Try again.",
            },
            { status: 502 }
        )
    }

    return NextResponse.json({ sql })
}
