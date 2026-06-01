import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { EdmxParseError, extractEntities } from "@/parser/edmx-parser"
import { buildGraph } from "@/parser/graph-builder"
import { XmlParseError, parseXml } from "@/parser/xml-parser"
import type { SummaryStatus } from "@/store/graph-context"
import type { Entity } from "@/types/entity"
import type { ParsedGraph } from "@/types/graph"
import { collectIncoming } from "@/utils/incoming-relationships"
import { toMermaidER } from "@/utils/mermaid"

const EMPTY_GRAPH: ParsedGraph = { nodes: [], edges: [] }

export type LayoutDirection = "LR" | "TB"
export type SidebarTab = "entities" | "details"

export interface GraphStore {
    xml: string
    entities: Entity[]
    graph: ParsedGraph
    selectedEntityId: string | null
    search: string
    parseError: string | null
    layoutDirection: LayoutDirection
    sidebarTab: SidebarTab
    summaries: Record<string, string>
    summaryStatus: Record<string, SummaryStatus>

    setXml: (xml: string) => void
    parse: () => void
    parseDocuments: (documents: string[]) => void
    select: (id: string | null) => void
    setSearch: (q: string) => void
    setLayoutDirection: (direction: LayoutDirection) => void
    setSidebarTab: (tab: SidebarTab) => void
    setSummary: (id: string, summary: string) => void
    requestSummary: (entity: Entity) => Promise<void>
    exportMermaid: () => string
    exportJson: () => string
    reset: () => void
}

function entitiesFromDocuments(documents: string[]): Entity[] {
    const merged = new Map<string, Entity>()
    for (const doc of documents) {
        const parsed = parseXml(doc)
        for (const entity of extractEntities(parsed)) {
            if (!merged.has(entity.id)) merged.set(entity.id, entity)
        }
    }
    return Array.from(merged.values())
}

function messageFor(err: unknown): string {
    if (err instanceof XmlParseError || err instanceof EdmxParseError)
        return err.message
    if (err instanceof Error) return err.message
    return "Failed to parse XML."
}

export const useGraphStore = create<GraphStore>()(
    persist(
        (set, get) => ({
            xml: "",
            entities: [],
            graph: EMPTY_GRAPH,
            selectedEntityId: null,
            search: "",
            parseError: null,
            layoutDirection: "LR",
            sidebarTab: "entities",
            summaries: {},
            summaryStatus: {},

            setXml: (xml) => set({ xml }),

            parse: () => {
                const { xml } = get()
                if (!xml.trim()) {
                    set({
                        parseError: "Paste or upload an EDMX document first.",
                    })
                    return
                }
                try {
                    const entities = entitiesFromDocuments([xml])
                    set({
                        entities,
                        graph: buildGraph(entities),
                        parseError: null,
                        selectedEntityId: null,
                    })
                } catch (err) {
                    set({
                        parseError: messageFor(err),
                        entities: [],
                        graph: EMPTY_GRAPH,
                    })
                }
            },

            parseDocuments: (documents) => {
                if (documents.length === 0) return
                try {
                    const entities = entitiesFromDocuments(documents)
                    set({
                        xml: documents[0] ?? "",
                        entities,
                        graph: buildGraph(entities),
                        parseError: null,
                        selectedEntityId: null,
                    })
                } catch (err) {
                    set({
                        parseError: messageFor(err),
                        entities: [],
                        graph: EMPTY_GRAPH,
                    })
                }
            },

            select: (id) =>
                set((state) => ({
                    selectedEntityId: id,
                    sidebarTab: id ? "details" : state.sidebarTab,
                })),

            setSearch: (q) => set({ search: q }),

            setLayoutDirection: (direction) =>
                set({ layoutDirection: direction }),

            setSidebarTab: (tab) => set({ sidebarTab: tab }),

            setSummary: (id, summary) =>
                set((state) => ({
                    summaries: { ...state.summaries, [id]: summary },
                    summaryStatus: {
                        ...state.summaryStatus,
                        [id]: { state: "idle" },
                    },
                })),

            requestSummary: async (entity) => {
                const id = entity.id
                set((state) => ({
                    summaryStatus: {
                        ...state.summaryStatus,
                        [id]: { state: "loading" },
                    },
                }))
                const setError = (error: string) =>
                    set((state) => ({
                        summaryStatus: {
                            ...state.summaryStatus,
                            [id]: { state: "error", error },
                        },
                    }))
                try {
                    const incoming = collectIncoming(
                        entity,
                        get().entities
                    ).map((r) => ({
                        fromName: r.fromEntity.name,
                        name: r.name,
                        cardinality: r.cardinality,
                    }))
                    const res = await fetch("/api/summarize", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entity, incoming }),
                    })
                    const data = (await res.json().catch(() => null)) as {
                        summary?: string
                        error?: string
                    } | null
                    if (!res.ok) {
                        setError(
                            data?.error ??
                                `Request failed (HTTP ${res.status}).`
                        )
                        return
                    }
                    if (!data?.summary) {
                        setError("No summary returned.")
                        return
                    }
                    set((state) => ({
                        summaries: {
                            ...state.summaries,
                            [id]: data.summary as string,
                        },
                        summaryStatus: {
                            ...state.summaryStatus,
                            [id]: { state: "idle" },
                        },
                    }))
                } catch (err) {
                    setError(
                        err instanceof Error ? err.message : "Request failed."
                    )
                }
            },

            exportMermaid: () => {
                const { graph, entities } = get()
                return toMermaidER(graph, entities)
            },

            exportJson: () => JSON.stringify(get().graph, null, 2),

            reset: () =>
                set({
                    xml: "",
                    entities: [],
                    graph: EMPTY_GRAPH,
                    selectedEntityId: null,
                    search: "",
                    parseError: null,
                    layoutDirection: "LR",
                    sidebarTab: "entities",
                    summaries: {},
                    summaryStatus: {},
                }),
        }),
        {
            name: "visual-graph",
            version: 2,
            storage: createJSONStorage(() =>
                typeof window === "undefined"
                    ? (undefined as unknown as Storage)
                    : window.localStorage
            ),
            partialize: (state) => ({
                xml: state.xml,
                selectedEntityId: state.selectedEntityId,
                layoutDirection: state.layoutDirection,
                sidebarTab: state.sidebarTab,
                summaries: state.summaries,
            }),
            migrate: (persisted, version) => {
                if (version < 2) {
                    const p = (persisted ?? {}) as {
                        xml?: string
                        selectedEntityId?: string | null
                        layoutDirection?: LayoutDirection
                        sidebarTab?: SidebarTab
                        summaries?: Record<string, string>
                    }
                    return {
                        xml: p.xml ?? "",
                        selectedEntityId: p.selectedEntityId ?? null,
                        layoutDirection: p.layoutDirection ?? "LR",
                        sidebarTab: p.sidebarTab ?? "entities",
                        summaries: p.summaries ?? {},
                    }
                }
                return persisted
            },
            onRehydrateStorage: () => (rehydrated, error) => {
                if (error || !rehydrated?.xml?.trim()) return
                try {
                    const entities = entitiesFromDocuments([rehydrated.xml])
                    useGraphStore.setState({
                        entities,
                        graph: buildGraph(entities),
                        parseError: null,
                    })
                } catch (err) {
                    useGraphStore.setState({
                        parseError: messageFor(err),
                        entities: [],
                        graph: EMPTY_GRAPH,
                    })
                }
            },
            skipHydration: true,
        }
    )
)
