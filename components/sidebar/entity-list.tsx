"use client"

import { useMemo, useState } from "react"

import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useGraphContext } from "@/store/graph-context"
import type { Entity } from "@/types/entity"

const NO_NAMESPACE = "—"

export function EntityList() {
    const { state, actions, meta } = useGraphContext()
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

    const groups = useMemo(() => {
        const q = state.search.trim().toLowerCase()
        const filtered = q
            ? state.entities.filter(
                  (e) =>
                      e.name.toLowerCase().includes(q) ||
                      e.id.toLowerCase().includes(q) ||
                      (e.namespace?.toLowerCase().includes(q) ?? false)
              )
            : state.entities

        const map = new Map<string, Entity[]>()
        for (const e of filtered) {
            const key = e.namespace ?? NO_NAMESPACE
            const bucket = map.get(key)
            if (bucket) bucket.push(e)
            else map.set(key, [e])
        }

        return [...map.entries()]
            .map(([namespace, items]) => ({
                namespace,
                items: items.sort((a, b) => a.name.localeCompare(b.name)),
            }))
            .sort((a, b) => a.namespace.localeCompare(b.namespace))
    }, [state.entities, state.search])

    const isSearching = state.search.trim().length > 0

    if (groups.length === 0) {
        return (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                {isSearching ? "No matches." : "No entities."}
            </div>
        )
    }

    function toggle(namespace: string) {
        setCollapsed((prev) => {
            const next = new Set(prev)
            if (next.has(namespace)) next.delete(namespace)
            else next.add(namespace)
            return next
        })
    }

    return (
        <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]>div]:!block">
            <div className="flex flex-col gap-1 p-2">
                {groups.map(({ namespace, items }) => {
                    const open = isSearching || !collapsed.has(namespace)
                    return (
                        <Collapsible
                            key={namespace}
                            open={open}
                            onOpenChange={() =>
                                !isSearching && toggle(namespace)
                            }
                        >
                            <CollapsibleTrigger
                                className="group flex w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-muted"
                                title={namespace}
                            >
                                <HugeiconsIcon
                                    icon={ArrowRight01Icon}
                                    className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90"
                                />
                                <span
                                    dir="rtl"
                                    className="min-w-0 flex-1 truncate text-left font-mono text-[10px] text-muted-foreground"
                                >
                                    <bdi>{namespace}</bdi>
                                </span>
                                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                                    {items.length}
                                </span>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <ul className="mt-0.5 flex flex-col gap-0.5">
                                    {items.map((entity) => {
                                        const isSelected =
                                            entity.id === state.selectedEntityId
                                        return (
                                            <li key={entity.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        actions.select(
                                                            entity.id
                                                        )
                                                        meta.panToNode?.(
                                                            entity.id
                                                        )
                                                    }}
                                                    className={cn(
                                                        "flex w-full min-w-0 items-center rounded-md py-1 pr-2.5 pl-6 text-left text-sm transition-colors hover:bg-muted",
                                                        isSelected &&
                                                            "bg-primary/10 text-primary hover:bg-primary/15"
                                                    )}
                                                >
                                                    <span className="w-full truncate font-medium">
                                                        {entity.name}
                                                    </span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </CollapsibleContent>
                        </Collapsible>
                    )
                })}
            </div>
        </ScrollArea>
    )
}
