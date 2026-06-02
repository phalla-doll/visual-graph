"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Copy01Icon,
    Database02Icon,
    InformationCircleIcon,
    Loading03Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { MentionTextarea } from "@/components/sidebar/mention-textarea"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGraphContext } from "@/store/graph-context"
import type { SqlDialect } from "@/store/graph-store"
import type { Entity } from "@/types/entity"

interface AISqlProps {
    entity: Entity
}

function snakeCaseWord(word: string): string {
    const hasLower = /[a-z]/.test(word)
    const hasUpper = /[A-Z]/.test(word)
    if (!hasLower || !hasUpper) return word
    return word
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
        .toLowerCase()
}

function toSnakeCase(sql: string): string {
    // Split out string literals ('...' with '' as escape), line comments
    // (-- to EOL), and block comments (/* ... */). Even-indexed segments are
    // code we rewrite; odd-indexed segments are preserved verbatim so we
    // don't mangle PascalCase identifiers inside string literals or comments.
    const segments = sql.split(/('(?:[^']|'')*'|--[^\n]*|\/\*[\s\S]*?\*\/)/g)
    return segments
        .map((seg, i) =>
            i % 2 === 0
                ? seg.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, snakeCaseWord)
                : seg
        )
        .join("")
}

const DIALECTS: { value: SqlDialect; label: string }[] = [
    { value: "postgres", label: "PostgreSQL" },
    { value: "mysql", label: "MySQL" },
    { value: "mssql", label: "SQL Server" },
    { value: "sqlite", label: "SQLite" },
    { value: "ansi", label: "Generic ANSI" },
]

export function AISql({ entity }: AISqlProps) {
    const { state, actions } = useGraphContext()
    const question = state.sqlQuestion[entity.id] ?? ""
    const sql = state.sqlResults[entity.id]
    const status = state.sqlStatus[entity.id] ?? { state: "idle" as const }
    const isLoading = status.state === "loading"
    const error = status.state === "error" ? status.error : null
    const [copied, setCopied] = useState(false)
    const [snakeCase, setSnakeCase] = useState(false)
    const validNames = useMemo(
        () => new Set(state.entities.map((e) => e.name)),
        [state.entities]
    )
    const displayedSql = useMemo(
        () => (sql && snakeCase ? toSnakeCase(sql) : sql),
        [sql, snakeCase]
    )

    async function copy() {
        if (!displayedSql) return
        try {
            await navigator.clipboard.writeText(displayedSql)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            // Clipboard unavailable — silently no-op.
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <HugeiconsIcon icon={Database02Icon} className="size-3" />
                    AI SQL
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground"
                                    aria-label="About AI SQL"
                                >
                                    <HugeiconsIcon
                                        icon={InformationCircleIcon}
                                        className="size-3"
                                    />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>
                                Describe what you want and the model will draft
                                a SQL query using this entity and its neighbors.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </h3>
                <Select
                    value={state.sqlDialect}
                    onValueChange={(v) =>
                        actions.setSqlDialect(v as SqlDialect)
                    }
                >
                    <SelectTrigger size="sm" className="!h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DIALECTS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                                {d.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <MentionTextarea
                value={question}
                onValueChange={(next) =>
                    actions.setSqlQuestion(entity.id, next)
                }
                validNames={validNames}
                placeholder={`e.g. all @${entity.name} where ...`}
                rows={3}
                disabled={isLoading}
            />
            <Button
                size="xs"
                onClick={() => actions.requestSql(entity, question)}
                disabled={isLoading || !question.trim()}
            >
                {isLoading ? (
                    <>
                        <HugeiconsIcon
                            icon={Loading03Icon}
                            className="animate-spin"
                        />
                        Generating…
                    </>
                ) : sql ? (
                    "Regenerate"
                ) : (
                    "Generate SQL"
                )}
            </Button>
            {sql && (
                <div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 p-2">
                    <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                        {displayedSql}
                    </pre>
                    <div className="flex items-center justify-end gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Switch
                                size="sm"
                                checked={snakeCase}
                                onCheckedChange={setSnakeCase}
                            />
                            snake_case
                        </label>
                        <Button size="xs" variant="ghost" onClick={copy}>
                            <HugeiconsIcon
                                icon={Copy01Icon}
                                className="size-3"
                            />
                            {copied ? "Copied" : "Copy"}
                        </Button>
                    </div>
                </div>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}
