"use client"

import { createContext, use, useMemo, type ReactNode } from "react"

import { useGraphContext } from "@/store/graph-context"
import type { Entity } from "@/types/entity"
import {
    collectIncoming,
    type IncomingRelationship,
} from "@/utils/incoming-relationships"

interface InspectorContextValue {
    entity: Entity
    byShortName: Map<string, Entity>
    incoming: IncomingRelationship[]
}

const InspectorContext = createContext<InspectorContextValue | null>(null)

export function useInspector(): InspectorContextValue {
    const ctx = use(InspectorContext)
    if (!ctx)
        throw new Error("Inspector subcomponent used outside <EntityInspector>")
    return ctx
}

interface InspectorProviderProps {
    entity: Entity
    children: ReactNode
}

export function InspectorProvider({
    entity,
    children,
}: InspectorProviderProps) {
    const { state } = useGraphContext()
    const byShortName = useMemo(
        () => new Map(state.entities.map((e) => [e.name, e] as const)),
        [state.entities]
    )
    const incoming = useMemo(
        () => collectIncoming(entity, state.entities),
        [entity, state.entities]
    )
    const value = useMemo(
        () => ({ entity, byShortName, incoming }),
        [entity, byShortName, incoming]
    )
    return <InspectorContext value={value}>{children}</InspectorContext>
}
