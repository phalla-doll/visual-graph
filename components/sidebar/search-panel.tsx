"use client"

import { RiSearchLine } from "@remixicon/react"

import { Input } from "@/components/ui/input"
import { useGraphStore } from "@/store/graph-store"

export function SearchPanel() {
    const search = useGraphStore((s) => s.search)
    const setSearch = useGraphStore((s) => s.setSearch)

    return (
        <div className="relative">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entities…"
                className="pl-8"
            />
        </div>
    )
}
