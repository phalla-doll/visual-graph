"use client"

import { useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react"
import { useShallow } from "zustand/react/shallow"

import {
    GraphContext,
    type GraphContextValue,
    type GraphMeta,
} from "@/store/graph-context"
import { useGraphStore } from "@/store/graph-store"

let didInit = false

function subscribeHydration(cb: () => void) {
    return useGraphStore.persist.onFinishHydration(cb)
}

function getHydrationSnapshot() {
    return useGraphStore.persist.hasHydrated()
}

function getServerHydrationSnapshot() {
    return false
}

function useHasHydrated(): boolean {
    return useSyncExternalStore(
        subscribeHydration,
        getHydrationSnapshot,
        getServerHydrationSnapshot
    )
}

interface GraphProviderProps {
    children: ReactNode
    meta?: GraphMeta
    fallback?: ReactNode
}

const EMPTY_META: GraphMeta = {}

export function GraphProvider({
    children,
    meta = EMPTY_META,
    fallback = null,
}: GraphProviderProps) {
    useEffect(() => {
        if (didInit) return
        didInit = true
        useGraphStore.persist.rehydrate()
    }, [])

    const hasHydrated = useHasHydrated()

    const state = useGraphStore(
        useShallow((s) => ({
            xml: s.xml,
            entities: s.entities,
            graph: s.graph,
            selectedEntityId: s.selectedEntityId,
            search: s.search,
            parseError: s.parseError,
            parsing: s.parsing,
            layoutDirection: s.layoutDirection,
            sidebarTab: s.sidebarTab,
            summaries: s.summaries,
            summaryStatus: s.summaryStatus,
            collapsedNodes: s.collapsedNodes,
            nodeZ: s.nodeZ,
            nodePositions: s.nodePositions,
        }))
    )

    const actions = useGraphStore(
        useShallow((s) => ({
            setXml: s.setXml,
            parse: s.parse,
            parseDocuments: s.parseDocuments,
            applyEntities: s.applyEntities,
            select: s.select,
            setSearch: s.setSearch,
            setLayoutDirection: s.setLayoutDirection,
            setSidebarTab: s.setSidebarTab,
            requestSummary: s.requestSummary,
            toggleCollapsed: s.toggleCollapsed,
            raiseNode: s.raiseNode,
            setNodePosition: s.setNodePosition,
            clearNodePositions: s.clearNodePositions,
            exportMermaid: s.exportMermaid,
            exportJson: s.exportJson,
            reset: s.reset,
        }))
    )

    const value = useMemo<GraphContextValue>(
        () => ({ state, actions, meta }),
        [state, actions, meta]
    )

    if (!hasHydrated) return <>{fallback}</>

    return <GraphContext value={value}>{children}</GraphContext>
}
