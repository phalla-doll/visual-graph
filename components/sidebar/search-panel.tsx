"use client"

import { RiSearchLine } from "@remixicon/react"

import { Input } from "@/components/ui/input"
import { useGraphContext } from "@/store/graph-context"

export function SearchPanel() {
    const { state, actions } = useGraphContext()

    return (
        <div className="relative">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={state.search}
                onChange={(e) => actions.setSearch(e.target.value)}
                placeholder="Search entities…"
                className="pl-8"
            />
        </div>
    )
}
