"use client"

import { useCallback, useEffect, useMemo, type RefObject } from "react"
import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
    type Edge as ReactFlowEdge,
    type Node as ReactFlowNode,
} from "@xyflow/react"
import { useTheme } from "next-themes"

import "@xyflow/react/dist/style.css"

import { EntityNode } from "@/components/graph/entity-node"
import {
    RelationshipEdge,
    RelationshipMarkers,
} from "@/components/graph/relationship-edge"
import { Toolbar } from "@/components/toolbar/toolbar"
import { useGraphContext } from "@/store/graph-context"
import { layoutGraph } from "@/utils/dagre-layout"

const nodeTypes = { entity: EntityNode }
const edgeTypes = { relationship: RelationshipEdge }

export type PanRef = RefObject<((id: string) => void) | null>

interface GraphCanvasProps {
    panRef?: PanRef
}

function CanvasInner({ panRef }: GraphCanvasProps) {
    const { state, actions } = useGraphContext()
    const { setCenter, getNode } = useReactFlow()
    const { resolvedTheme } = useTheme()
    const colorMode = resolvedTheme === "dark" ? "dark" : "light"

    const { nodes, edges } = useMemo(
        () =>
            layoutGraph(
                state.graph.nodes,
                state.graph.edges,
                state.layoutDirection
            ),
        [state.graph, state.layoutDirection]
    )

    const panToNode = useCallback(
        (id: string) => {
            const node = getNode(id)
            if (!node) return
            const width = node.measured?.width ?? 220
            const height = node.measured?.height ?? 120
            setCenter(
                node.position.x + width / 2,
                node.position.y + height / 2,
                { duration: 400, zoom: 1.2 }
            )
        },
        [setCenter, getNode]
    )

    useEffect(() => {
        if (!panRef) return
        panRef.current = panToNode
        return () => {
            panRef.current = null
        }
    }, [panRef, panToNode])

    function onNodeClick(_: React.MouseEvent, node: ReactFlowNode) {
        actions.select(node.id)
        panToNode(node.id)
    }

    function onPaneClick() {
        actions.select(null)
    }

    return (
        <div className="flex h-full flex-col">
            <Toolbar />
            <div className="min-h-0 flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges as ReactFlowEdge[]}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    fitView
                    colorMode={colorMode}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background gap={20} />
                    <Controls />
                    <MiniMap pannable zoomable />
                    <RelationshipMarkers />
                </ReactFlow>
            </div>
        </div>
    )
}

export function GraphCanvas({ panRef }: GraphCanvasProps) {
    return (
        <ReactFlowProvider>
            <CanvasInner panRef={panRef} />
        </ReactFlowProvider>
    )
}
