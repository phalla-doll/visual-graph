"use client"

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react"

import type { Cardinality } from "@/types/entity"

export type RelationshipEdgeProps = EdgeProps & {
    data?: { cardinality: Cardinality; labelOffset?: number }
}

export function RelationshipEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    data,
    style,
}: RelationshipEdgeProps) {
    const [path, midX, midY] = getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        borderRadius: 12,
    })

    const offset = data?.labelOffset ?? 0
    const labelX = midX
    const labelY = midY + offset

    const cardinality = data?.cardinality ?? "one"
    const markerEnd =
        cardinality === "many" ? "url(#vg-marker-many)" : "url(#vg-marker-one)"

    return (
        <>
            <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                        }}
                        className="pointer-events-none absolute rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-xs"
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    )
}

const RELATIONSHIP_MARKERS = (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
            <marker
                id="vg-marker-one"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="12"
                markerHeight="12"
                orient="auto-start-reverse"
            >
                <line
                    x1="9"
                    y1="2"
                    x2="9"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <line
                    x1="2"
                    y1="6"
                    x2="9"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </marker>
            <marker
                id="vg-marker-many"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="14"
                markerHeight="14"
                orient="auto-start-reverse"
            >
                <line
                    x1="2"
                    y1="6"
                    x2="10"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <line
                    x1="10"
                    y1="6"
                    x2="2"
                    y2="2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
                <line
                    x1="10"
                    y1="6"
                    x2="2"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            </marker>
        </defs>
    </svg>
)

export function RelationshipMarkers() {
    return RELATIONSHIP_MARKERS
}
