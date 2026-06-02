"use client"

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type RefObject,
} from "react"
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
    const [isDragging, setIsDragging] = useState(false)

    const laidOut = useMemo(
        () =>
            layoutGraph(
                state.graph.nodes,
                state.graph.edges,
                state.layoutDirection
            ),
        [state.graph, state.layoutDirection]
    )

    const nodes = useMemo(() => {
        const z = state.nodeZ
        const pos = state.nodePositions
        const hasZ = Object.keys(z).length > 0
        const hasPos = Object.keys(pos).length > 0
        if (!hasZ && !hasPos) return laidOut.nodes
        return laidOut.nodes.map((n) => {
            const override = pos[n.id]
            const zIndex = z[n.id]
            if (!override && zIndex === undefined) return n
            return {
                ...n,
                ...(override ? { position: override } : {}),
                ...(zIndex !== undefined ? { zIndex } : {}),
            }
        })
    }, [laidOut.nodes, state.nodeZ, state.nodePositions])

    const edges = laidOut.edges

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
        actions.raiseNode(node.id)
        actions.select(node.id)
        panToNode(node.id)
    }

    function onNodeDragStart(_: React.MouseEvent, node: ReactFlowNode) {
        setIsDragging(true)
        actions.raiseNode(node.id)
    }

    function onNodeDragStop(_: React.MouseEvent, node: ReactFlowNode) {
        setIsDragging(false)
        actions.setNodePosition(node.id, {
            x: node.position.x,
            y: node.position.y,
        })
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
                    onNodeDragStart={onNodeDragStart}
                    onNodeDragStop={onNodeDragStop}
                    onPaneClick={onPaneClick}
                    fitView
                    colorMode={colorMode}
                    proOptions={{ hideAttribution: true }}
                >
                    <Background gap={20} />
                    <Controls />
                    {!isDragging && (
                        <MiniMap
                            pannable
                            zoomable
                            nodeColor={
                                colorMode === "dark" ? "#9ca3af" : "#374151"
                            }
                            nodeStrokeColor={
                                colorMode === "dark" ? "#e5e7eb" : "#111827"
                            }
                            nodeStrokeWidth={40}
                            maskColor={
                                colorMode === "dark"
                                    ? "rgba(0, 0, 0, 0.6)"
                                    : "rgba(240, 240, 240, 0.6)"
                            }
                        />
                    )}
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
