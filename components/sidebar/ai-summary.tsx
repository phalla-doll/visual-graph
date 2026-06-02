"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Copy01Icon,
    Loading03Icon,
    SparklesIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { useGraphContext } from "@/store/graph-context"
import type { Entity } from "@/types/entity"

interface AISummaryProps {
    entity: Entity
}

export function AISummary({ entity }: AISummaryProps) {
    const { state, actions } = useGraphContext()
    const summary = state.summaries[entity.id]
    const status = state.summaryStatus[entity.id] ?? { state: "idle" as const }
    const isLoading = status.state === "loading"
    const error = status.state === "error" ? status.error : null
    const [copied, setCopied] = useState(false)

    async function copy() {
        if (!summary) return
        try {
            await navigator.clipboard.writeText(summary)
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
                    <HugeiconsIcon icon={SparklesIcon} className="size-3" /> AI
                    Summary
                </h3>
                <Button
                    size="xs"
                    variant="outline"
                    onClick={() => actions.requestSummary(entity)}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <HugeiconsIcon
                                icon={Loading03Icon}
                                className="animate-spin"
                            />
                            Generating…
                        </>
                    ) : summary ? (
                        "Regenerate"
                    ) : (
                        "Summarize"
                    )}
                </Button>
            </div>
            {summary && (
                <div className="flex flex-col gap-1.5 rounded-md border bg-muted/40 p-2">
                    <p className="text-xs leading-relaxed">{summary}</p>
                    <div className="flex justify-end">
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
            {!summary && !error && !isLoading && (
                <p className="text-xs text-muted-foreground italic">
                    Generate a short natural-language description of this
                    entity.
                </p>
            )}
        </div>
    )
}
