"use client"

import { memo } from "react"

import { Handle, Position, type NodeProps } from "@xyflow/react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useGraphStore } from "@/store/graph-store"
import type { EntityProperty } from "@/types/entity"

export type EntityNodeProps = NodeProps & {
    data: { label: string; properties: EntityProperty[]; width: number }
}

function EntityNodeImpl({ id, data }: EntityNodeProps) {
    const isSelected = useGraphStore((s) => s.selectedEntityId === id)
    const collapsed = useGraphStore((s) => !!s.collapsedNodes[id])
    const toggleCollapsed = useGraphStore((s) => s.toggleCollapsed)

    function onToggle(e: React.MouseEvent) {
        e.stopPropagation()
        toggleCollapsed(id)
    }

    return (
        <div
            style={{ width: data.width }}
            className={cn(
                "overflow-hidden rounded-lg border bg-card shadow-sm ring-1 ring-foreground/10 transition-colors",
                isSelected && "border-primary ring-2 ring-primary/40"
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-1.5 bg-muted px-3 py-2 font-heading text-sm font-medium",
                    !collapsed && "border-b",
                    isSelected && "bg-primary/10 text-primary"
                )}
            >
                <button
                    type="button"
                    onClick={onToggle}
                    aria-label={collapsed ? "Expand" : "Collapse"}
                    aria-expanded={!collapsed}
                    className="-ml-1 grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                >
                    <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className={cn(
                            "size-3 transition-transform",
                            !collapsed && "rotate-90"
                        )}
                    />
                </button>
                <span className="min-w-0 flex-1 truncate">{data.label}</span>
                {collapsed && data.properties.length > 0 && (
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                        {data.properties.length}
                    </span>
                )}
            </div>
            {!collapsed && (
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
            )}
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

export const EntityNode = memo(EntityNodeImpl)
