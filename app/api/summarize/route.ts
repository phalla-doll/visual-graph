import { NextResponse } from "next/server"

import type { Entity, EntityProperty, Relationship } from "@/types/entity"

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = "openai/gpt-oss-120b"

interface IncomingRef {
    fromName: string
    name: string
    cardinality: "one" | "many"
}

interface SummarizeRequest {
    entity: Entity
    incoming: IncomingRef[]
}

// Cap how many non-key properties we list verbatim. Above this, the tail is
// collapsed into a typed count to keep the prompt short for wide entities.
const MAX_LISTED_NON_KEY_PROPS = 10
// Up to this many example names per type in the collapsed tail.
const TAIL_EXAMPLES_PER_TYPE = 2
// Cap how many relationships (outgoing or incoming) we list verbatim.
const MAX_LISTED_RELS = 8
// Up to this many target/source names in a collapsed relationship tail.
const TAIL_REL_NAMES = 5

function stripEdm(type: string): string {
    return type.startsWith("Edm.") ? type.slice(4) : type
}

function card(c: "one" | "many"): string {
    return c === "many" ? "to-many" : "to-one"
}

function propertyLine(p: EntityProperty): string {
    const flags: string[] = []
    if (p.isKey) flags.push("key")
    if (p.nullable) flags.push("nullable")
    const suffix = flags.length ? ` (${flags.join(", ")})` : ""
    return `- ${p.name}: ${stripEdm(p.type)}${suffix}`
}

function summarizeTail(props: EntityProperty[]): string {
    const byType = new Map<string, string[]>()
    for (const p of props) {
        const t = stripEdm(p.type)
        const arr = byType.get(t)
        if (arr) arr.push(p.name)
        else byType.set(t, [p.name])
    }
    const parts: string[] = []
    for (const [type, names] of byType) {
        const examples = names.slice(0, TAIL_EXAMPLES_PER_TYPE).join(", ")
        const more =
            names.length > TAIL_EXAMPLES_PER_TYPE
                ? `, +${names.length - TAIL_EXAMPLES_PER_TYPE} more`
                : ""
        parts.push(`${names.length} ${type} (${examples}${more})`)
    }
    return parts.join("; ")
}

function propertyLines(entity: Entity): string[] {
    if (!entity.properties.length) return ["- (none)"]
    const keys = entity.properties.filter((p) => p.isKey)
    const nonKeys = entity.properties.filter((p) => !p.isKey)
    const listed = nonKeys.slice(0, MAX_LISTED_NON_KEY_PROPS)
    const tail = nonKeys.slice(MAX_LISTED_NON_KEY_PROPS)
    const lines = [...keys.map(propertyLine), ...listed.map(propertyLine)]
    if (tail.length)
        lines.push(`- +${tail.length} more: ${summarizeTail(tail)}`)
    return lines
}

function outgoingLine(r: Relationship): string {
    return `- ${r.name} → ${r.target} (${card(r.cardinality)})`
}

function incomingLine(r: IncomingRef): string {
    return `- ${r.fromName}.${r.name} (${card(r.cardinality)})`
}

function groupedRelTail(names: string[], label: string): string {
    const counts = new Map<string, number>()
    for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1)
    const entries = Array.from(counts.entries())
    const head = entries
        .slice(0, TAIL_REL_NAMES)
        .map(([n, c]) => (c > 1 ? `${n} ×${c}` : n))
        .join(", ")
    const extra =
        entries.length > TAIL_REL_NAMES
            ? `, +${entries.length - TAIL_REL_NAMES} more ${label}`
            : ""
    return `${head}${extra}`
}

function outgoingLines(rels: Relationship[]): string[] {
    if (!rels.length) return ["- (none)"]
    const listed = rels.slice(0, MAX_LISTED_RELS)
    const tail = rels.slice(MAX_LISTED_RELS)
    const lines = listed.map(outgoingLine)
    if (tail.length) {
        const grouped = groupedRelTail(
            tail.map((r) => r.target),
            "targets"
        )
        lines.push(`- +${tail.length} more → ${grouped}`)
    }
    return lines
}

function incomingLines(refs: IncomingRef[]): string[] {
    if (!refs.length) return ["- (none)"]
    const listed = refs.slice(0, MAX_LISTED_RELS)
    const tail = refs.slice(MAX_LISTED_RELS)
    const lines = listed.map(incomingLine)
    if (tail.length) {
        const grouped = groupedRelTail(
            tail.map((r) => r.fromName),
            "sources"
        )
        lines.push(`- +${tail.length} more from ${grouped}`)
    }
    return lines
}

function buildPrompt({ entity, incoming }: SummarizeRequest): string {
    const header = `Entity: ${entity.name}${entity.namespace ? ` (namespace ${entity.namespace})` : ""}`
    const lines: string[] = [
        header,
        "",
        `Properties (${entity.properties.length}):`,
        ...propertyLines(entity),
        "",
        `Outgoing relationships (${entity.relationships.length}):`,
        ...outgoingLines(entity.relationships),
        "",
        `Incoming relationships (${incoming.length}):`,
        ...incomingLines(incoming),
        "",
        "Write a single paragraph (3–4 sentences) describing what this entity likely represents in the domain and how it connects to its neighbors. Plain prose. No headings, no bullets, no markdown.",
    ]
    return lines.join("\n")
}

function isValidPayload(body: unknown): body is SummarizeRequest {
    if (!body || typeof body !== "object") return false
    const b = body as Record<string, unknown>
    if (!b.entity || typeof b.entity !== "object") return false
    const e = b.entity as Record<string, unknown>
    if (
        typeof e.name !== "string" ||
        !Array.isArray(e.properties) ||
        !Array.isArray(e.relationships)
    )
        return false
    if (!Array.isArray(b.incoming)) return false
    return true
}

export async function POST(request: Request) {
    const apiKey = process.env.NVIDIA_API_KEY
    if (!apiKey) {
        return NextResponse.json(
            {
                error: "AI summaries are not configured: NVIDIA_API_KEY is unset on the server.",
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

    let upstream: Response
    try {
        upstream = await fetch(NVIDIA_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: "user", content: prompt }],
                // gpt-oss-120b is a reasoning model — it spends tokens on
                // chain-of-thought before producing `content`. Need headroom or it hits
                // `finish_reason: "length"` with `content: null`.
                max_tokens: 8192,
                temperature: 0.6,
                top_p: 0.95,
                // Stream so response headers arrive immediately. For large entities
                // (many properties), non-streaming requests can exceed undici's 300s
                // headersTimeout while the model is still reasoning, which surfaces
                // to the user as a 5-minute hang ending in 502.
                stream: true,
            }),
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        return NextResponse.json(
            { error: `Upstream request failed: ${message}` },
            { status: 502 }
        )
    }

    if (!upstream.ok) {
        const text = await upstream.text().catch(() => "")
        return NextResponse.json(
            {
                error: `Upstream returned HTTP ${upstream.status}: ${text.slice(0, 400)}`,
            },
            { status: 502 }
        )
    }

    if (!upstream.body) {
        return NextResponse.json(
            { error: "Upstream returned an empty stream." },
            { status: 502 }
        )
    }

    let contentText = ""
    let reasoningText = ""
    let finishReason: string | undefined
    try {
        const reader = upstream.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let nl: number
            while ((nl = buffer.indexOf("\n")) !== -1) {
                const rawLine = buffer.slice(0, nl)
                buffer = buffer.slice(nl + 1)
                const line = rawLine.trim()
                if (!line.startsWith("data:")) continue
                const payload = line.slice(5).trim()
                if (!payload || payload === "[DONE]") continue
                try {
                    const parsed = JSON.parse(payload) as {
                        choices?: {
                            finish_reason?: string | null
                            delta?: {
                                content?: string | null
                                reasoning_content?: string | null
                            }
                        }[]
                    }
                    const choice = parsed.choices?.[0]
                    if (choice?.delta?.content)
                        contentText += choice.delta.content
                    if (choice?.delta?.reasoning_content)
                        reasoningText += choice.delta.reasoning_content
                    if (choice?.finish_reason)
                        finishReason = choice.finish_reason
                } catch {
                    // Skip malformed SSE frames — keep reading the rest.
                }
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error"
        return NextResponse.json(
            { error: `Upstream stream failed: ${message}` },
            { status: 502 }
        )
    }

    const summary = (contentText || reasoningText).trim()
    if (!summary) {
        return NextResponse.json(
            {
                error: `Upstream did not return a summary (finish_reason=${finishReason ?? "unknown"}).`,
            },
            { status: 502 }
        )
    }
    if (finishReason === "length") {
        return NextResponse.json(
            {
                error: "Model ran out of token budget before completing the summary. Try again.",
            },
            { status: 502 }
        )
    }

    return NextResponse.json({ summary })
}
