"use client"

import { Handle, Position, type NodeProps } from "@xyflow/react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useGraphContext } from "@/store/graph-context"
import type { EntityProperty } from "@/types/entity"

export type EntityNodeProps = NodeProps & {
    data: { label: string; properties: EntityProperty[] }
}

export function EntityNode({ id, data }: EntityNodeProps) {
    const { state } = useGraphContext()
    const isSelected = state.selectedEntityId === id

    return (
        <div
            className={cn(
                "min-w-[220px] overflow-hidden rounded-lg border bg-card shadow-sm ring-1 ring-foreground/10 transition-colors",
                isSelected && "border-primary ring-2 ring-primary/40"
            )}
        >
            <div
                className={cn(
                    "border-b bg-muted px-3 py-2 font-heading text-sm font-medium",
                    isSelected && "bg-primary/10 text-primary"
                )}
            >
                {data.label}
            </div>
            <div className="divide-y text-xs">
                {data.properties.length === 0 && (
                    <div className="px-3 py-1.5 text-muted-foreground italic">
                        (no properties)
                    </div>
                )}
                {data.properties.map((p) => (
                    <div
                        key={p.name}
                        className="flex items-center justify-between gap-2 px-3 py-1.5"
                    >
                        <div className="flex min-w-0 items-center gap-1.5">
                            {p.isKey && (
                                <Badge
                                    variant="secondary"
                                    className="h-4 px-1 text-[10px]"
                                >
                                    PK
                                </Badge>
                            )}
                            <span
                                className={cn(
                                    "truncate",
                                    p.isKey && "font-medium"
                                )}
                            >
                                {p.name}
                            </span>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                            {p.type}
                            {p.nullable ? "?" : ""}
                        </span>
                    </div>
                ))}
            </div>
            <Handle
                type="target"
                position={Position.Left}
                className="!h-2 !w-2 !border-0 !bg-muted-foreground"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!h-2 !w-2 !border-0 !bg-muted-foreground"
            />
        </div>
    )
}
