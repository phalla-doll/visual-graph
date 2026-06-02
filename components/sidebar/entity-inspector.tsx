"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowLeftRightIcon,
    ArrowRight01Icon,
} from "@hugeicons/core-free-icons"

import { AISummary } from "@/components/sidebar/ai-summary"
import {
    InspectorProvider,
    useInspector,
} from "@/components/sidebar/entity-inspector-context"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useGraphContext } from "@/store/graph-context"
import type { Cardinality } from "@/types/entity"

function typeColorClass(type: string): string {
    const short = type.split(".").pop()?.toLowerCase() ?? ""
    if (short === "string" || short === "guid")
        return "text-emerald-600 dark:text-emerald-400"
    if (
        short === "int16" ||
        short === "int32" ||
        short === "int64" ||
        short === "decimal" ||
        short === "double" ||
        short === "single" ||
        short === "byte" ||
        short === "sbyte"
    )
        return "text-amber-600 dark:text-amber-400"
    if (short === "boolean") return "text-purple-600 dark:text-purple-400"
    if (
        short === "datetime" ||
        short === "datetimeoffset" ||
        short === "date" ||
        short === "time" ||
        short === "timeofday" ||
        short === "duration"
    )
        return "text-sky-600 dark:text-sky-400"
    if (short === "binary" || short === "stream")
        return "text-rose-600 dark:text-rose-400"
    return "text-muted-foreground"
}

function CardinalityBadge({ cardinality }: { cardinality: Cardinality }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                "h-4 shrink-0 px-1.5 text-[10px]",
                cardinality === "one"
                    ? "border-sky-500/60 text-sky-700 dark:border-sky-400/60 dark:text-sky-300"
                    : "border-amber-500/60 text-amber-700 dark:border-amber-400/60 dark:text-amber-300"
            )}
        >
            {cardinality}
        </Badge>
    )
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
            Select an entity to inspect its properties and relationships.
        </div>
    )
}

function Header() {
    const { entity } = useInspector()
    return (
        <div>
            <h2 className="font-heading text-base font-medium">
                {entity.name}
            </h2>
            {entity.namespace && (
                <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {entity.namespace}
                </p>
            )}
        </div>
    )
}

function Summary() {
    const { entity } = useInspector()
    return <AISummary entity={entity} />
}

function Properties() {
    const { entity } = useInspector()
    const count = entity.properties.length
    return (
        <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Properties
                <Badge variant="outline">{count}</Badge>
            </h3>
            {count === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                    No properties.
                </p>
            ) : (
                <div className="divide-y overflow-hidden rounded-md border text-xs">
                    {entity.properties.map((p) => (
                        <div
                            key={p.name}
                            className="flex items-center gap-2 px-2.5 py-1.5"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                {p.isKey && (
                                    <Badge
                                        variant="secondary"
                                        className="h-4 shrink-0 px-1 text-[10px]"
                                    >
                                        PK
                                    </Badge>
                                )}
                                <span
                                    title={p.name}
                                    className={`truncate ${p.isKey ? "font-medium" : ""}`}
                                >
                                    {p.name}
                                </span>
                            </div>
                            <span
                                title={`${p.type}${p.nullable ? "?" : ""}`}
                                className={cn(
                                    "max-w-[45%] shrink-0 truncate text-right font-mono text-[10px]",
                                    typeColorClass(p.type)
                                )}
                            >
                                {p.type.replace(/^Edm\./, "")}
                                {p.nullable ? "?" : ""}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}

function Outgoing() {
    const { entity, byShortName } = useInspector()
    const { actions, meta } = useGraphContext()
    const count = entity.relationships.length

    function go(id: string) {
        actions.select(id)
        meta.panToNode?.(id)
    }

    return (
        <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-3" />
                Outgoing
                <Badge variant="outline">{count}</Badge>
            </h3>
            {count === 0 ? (
                <p className="text-xs text-muted-foreground italic">None.</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {entity.relationships.map((rel) => {
                        const target = byShortName.get(rel.target)
                        return (
                            <li key={`${rel.name}->${rel.target}`}>
                                <button
                                    type="button"
                                    disabled={!target}
                                    onClick={() => target && go(target.id)}
                                    title={`${rel.name} → ${rel.target}`}
                                    className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted disabled:opacity-60 disabled:hover:bg-transparent"
                                >
                                    <span className="flex min-w-0 flex-1 flex-col">
                                        <span className="truncate font-medium">
                                            {rel.name}
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                            → {rel.target}
                                        </span>
                                    </span>
                                    <CardinalityBadge
                                        cardinality={rel.cardinality}
                                    />
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}

function Incoming() {
    const { incoming } = useInspector()
    const { actions, meta } = useGraphContext()
    const count = incoming.length

    function go(id: string) {
        actions.select(id)
        meta.panToNode?.(id)
    }

    return (
        <section>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <HugeiconsIcon icon={ArrowLeftRightIcon} className="size-3" />
                Incoming
                <Badge variant="outline">{count}</Badge>
            </h3>
            {count === 0 ? (
                <p className="text-xs text-muted-foreground italic">None.</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {incoming.map((rel) => (
                        <li key={`${rel.fromEntity.id}.${rel.name}`}>
                            <button
                                type="button"
                                onClick={() => go(rel.fromEntity.id)}
                                title={`${rel.fromEntity.name}.${rel.name}`}
                                className="flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                            >
                                <span className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate font-medium">
                                        {rel.fromEntity.name}
                                    </span>
                                    <span className="truncate text-muted-foreground">
                                        ← {rel.name}
                                    </span>
                                </span>
                                <CardinalityBadge
                                    cardinality={rel.cardinality}
                                />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}

export function EntityInspector() {
    const { state } = useGraphContext()
    const selected = state.entities.find((e) => e.id === state.selectedEntityId)
    if (!selected) return <EmptyState />
    return (
        <InspectorProvider entity={selected}>
            <ScrollArea className="h-full [&>[data-slot=scroll-area-viewport]>div]:!block">
                <div className="flex flex-col gap-4 p-3">
                    <EntityInspector.Header />
                    <EntityInspector.Summary />
                    <Separator />
                    <EntityInspector.Properties />
                    <Separator />
                    <EntityInspector.Outgoing />
                    <Separator />
                    <EntityInspector.Incoming />
                </div>
            </ScrollArea>
        </InspectorProvider>
    )
}

EntityInspector.Header = Header
EntityInspector.Summary = Summary
EntityInspector.Properties = Properties
EntityInspector.Outgoing = Outgoing
EntityInspector.Incoming = Incoming
