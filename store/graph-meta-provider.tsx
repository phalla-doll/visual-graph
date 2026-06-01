"use client"

import { useMemo, type ReactNode } from "react"

import {
    GraphContext,
    useGraphContext,
    type GraphMeta,
} from "@/store/graph-context"

interface GraphMetaProviderProps {
    meta: GraphMeta
    children: ReactNode
}

export function GraphMetaProvider({ meta, children }: GraphMetaProviderProps) {
    const outer = useGraphContext()
    const value = useMemo(
        () => ({ ...outer, meta: { ...outer.meta, ...meta } }),
        [outer, meta]
    )
    return <GraphContext value={value}>{children}</GraphContext>
}
