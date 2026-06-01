import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

import { EdmxParseError, extractEntities } from "@/parser/edmx-parser"
import { buildGraph } from "@/parser/graph-builder"
import { XmlParseError, parseXml } from "@/parser/xml-parser"
import type { Entity } from "@/types/entity"
import type { ParsedGraph } from "@/types/graph"

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

    setXml: (xml: string) => void
    parse: () => void
    parseDocuments: (documents: string[]) => void
    select: (id: string | null) => void
    setSearch: (q: string) => void
    setLayoutDirection: (direction: LayoutDirection) => void
    setSidebarTab: (tab: SidebarTab) => void
    setSummary: (id: string, summary: string) => void
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
                })),

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
                }),
        }),
        {
            name: "visual-graph",
            version: 1,
            storage: createJSONStorage(() =>
                typeof window === "undefined"
                    ? (undefined as unknown as Storage)
                    : window.localStorage
            ),
            partialize: (state) => ({
                xml: state.xml,
                entities: state.entities,
                graph: state.graph,
                selectedEntityId: state.selectedEntityId,
                layoutDirection: state.layoutDirection,
                sidebarTab: state.sidebarTab,
            }),
            skipHydration: true,
        }
    )
)
