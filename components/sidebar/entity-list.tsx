"use client"

import { useMemo } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useGraphContext } from "@/store/graph-context"

export function EntityList() {
    const { state, actions, meta } = useGraphContext()

    const filtered = useMemo(() => {
        const sorted = [...state.entities].sort((a, b) =>
            a.name.localeCompare(b.name)
        )
        const q = state.search.trim().toLowerCase()
        if (!q) return sorted
        return sorted.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.id.toLowerCase().includes(q)
        )
    }, [state.entities, state.search])

    if (filtered.length === 0) {
        return (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {state.search.trim() ? "No matches." : "No entities."}
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <ul className="flex flex-col gap-0.5 p-2">
                {filtered.map((entity) => {
                    const isSelected = entity.id === state.selectedEntityId
                    return (
                        <li key={entity.id}>
                            <button
                                type="button"
                                onClick={() => {
                                    actions.select(entity.id)
                                    meta.panToNode?.(entity.id)
                                }}
                                className={cn(
                                    "flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted",
                                    isSelected &&
                                        "bg-primary/10 text-primary hover:bg-primary/15"
                                )}
                            >
                                <span className="font-medium">
                                    {entity.name}
                                </span>
                                {entity.namespace && (
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                        {entity.namespace}
                                    </span>
                                )}
                            </button>
                        </li>
                    )
                })}
            </ul>
        </ScrollArea>
    )
}
