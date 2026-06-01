"use client"

import { useMemo, useRef } from "react"
import dynamic from "next/dynamic"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

import { XmlEditor } from "@/components/editor/xml-editor"
import { Sidebar } from "@/components/sidebar/sidebar"
import { useGraphContext, type GraphMeta } from "@/store/graph-context"
import { GraphMetaProvider } from "@/store/graph-meta-provider"

function LoadingIndicator({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="animate-spin">
                <HugeiconsIcon icon={Loading03Icon} className="size-6" />
            </div>
            <p className="text-sm">{label}</p>
        </div>
    )
}

function CanvasLoading() {
    return (
        <div className="flex h-full items-center justify-center bg-muted/20">
            <LoadingIndicator label="Loading graph…" />
        </div>
    )
}

const GraphCanvas = dynamic(
    () => import("@/components/graph/graph-canvas").then((m) => m.GraphCanvas),
    { ssr: false, loading: () => <CanvasLoading /> }
)

function ParsingScreen() {
    return (
        <main className="flex min-h-svh flex-col items-center justify-center p-6">
            <LoadingIndicator label="Parsing document…" />
        </main>
    )
}

export default function Page() {
    const { state } = useGraphContext()
    const hasGraph = state.entities.length > 0
    const entityCount = state.entities.length
    const edgeCount = state.graph.edges.length

    const panRef = useRef<((id: string) => void) | null>(null)
    const meta = useMemo<GraphMeta>(
        () => ({
            panToNode: (id: string) => panRef.current?.(id),
        }),
        []
    )

    if (state.parsing) {
        return <ParsingScreen />
    }

    if (!hasGraph) {
        return (
            <main className="flex min-h-svh items-center justify-center p-6">
                <XmlEditor />
            </main>
        )
    }

    return (
        <GraphMetaProvider meta={meta}>
            <main className="flex h-svh flex-col">
                <header className="flex items-center justify-between border-b px-4 py-2">
                    <div className="flex items-baseline gap-3">
                        <h1 className="font-heading text-base font-medium">
                            XML Visual Graph
                        </h1>
                        <span className="text-xs text-muted-foreground">
                            {entityCount} entities · {edgeCount} relationships
                        </span>
                    </div>
                </header>
                <div className="flex min-h-0 flex-1">
                    <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
                        <Sidebar />
                    </aside>
                    <div className="min-w-0 flex-1">
                        <GraphCanvas panRef={panRef} />
                    </div>
                </div>
            </main>
        </GraphMetaProvider>
    )
}
