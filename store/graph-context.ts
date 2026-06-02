"use client"

import { createContext, use } from "react"

import type {
    LayoutDirection,
    SidebarTab,
    SqlDialect,
} from "@/store/graph-store"
import type { Entity } from "@/types/entity"
import type { ParsedGraph } from "@/types/graph"

export type SummaryStatus =
    | { state: "idle" }
    | { state: "loading" }
    | { state: "error"; error: string }

export type SqlStatus =
    | { state: "idle" }
    | { state: "loading" }
    | { state: "error"; error: string }

export interface GraphState {
    xml: string
    entities: Entity[]
    graph: ParsedGraph
    selectedEntityId: string | null
    search: string
    parseError: string | null
    parsing: boolean
    layoutDirection: LayoutDirection
    sidebarTab: SidebarTab
    summaries: Record<string, string>
    summaryStatus: Record<string, SummaryStatus>
    sqlResults: Record<string, string>
    sqlStatus: Record<string, SqlStatus>
    sqlQuestion: Record<string, string>
    sqlDialect: SqlDialect
    collapsedNodes: Record<string, boolean>
    nodeZ: Record<string, number>
    nodePositions: Record<string, { x: number; y: number }>
}

export interface GraphActions {
    setXml(xml: string): void
    parse(): void
    parseDocuments(documents: string[]): void
    applyEntities(entities: Entity[]): void
    select(id: string | null): void
    setSearch(q: string): void
    setLayoutDirection(direction: LayoutDirection): void
    setSidebarTab(tab: SidebarTab): void
    requestSummary(entity: Entity): Promise<void>
    requestSql(entity: Entity, question: string): Promise<void>
    setSqlQuestion(id: string, question: string): void
    setSqlDialect(dialect: SqlDialect): void
    toggleCollapsed(id: string): void
    raiseNode(id: string): void
    setNodePosition(id: string, position: { x: number; y: number }): void
    clearNodePositions(): void
    exportMermaid(): string
    exportJson(): string
    reset(): void
}

export interface GraphMeta {
    panToNode?(id: string): void
}

export interface GraphContextValue {
    state: GraphState
    actions: GraphActions
    meta: GraphMeta
}

export const GraphContext = createContext<GraphContextValue | null>(null)

export function useGraphContext(): GraphContextValue {
    const ctx = use(GraphContext)
    if (!ctx)
        throw new Error("useGraphContext must be used inside <GraphProvider>")
    return ctx
}
