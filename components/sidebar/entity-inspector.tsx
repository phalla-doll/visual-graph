"use client"

import { RiArrowLeftRightLine, RiArrowRightLine } from "@remixicon/react"

import { AISummary } from "@/components/sidebar/ai-summary"
import {
    InspectorProvider,
    useInspector,
} from "@/components/sidebar/entity-inspector-context"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useGraphContext } from "@/store/graph-context"

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
                <p className="font-mono text-[10px] text-muted-foreground">
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
    if (entity.properties.length === 0) {
        return (
            <section>
                <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Properties
                </h3>
                <p className="text-xs text-muted-foreground italic">
                    No properties.
                </p>
            </section>
        )
    }
    return (
        <section>
            <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Properties
            </h3>
            <div className="overflow-hidden rounded-md border">
                <table className="w-full text-xs">
                    <tbody className="divide-y">
                        {entity.properties.map((p) => (
                            <tr key={p.name}>
                                <td className="px-2.5 py-1.5">
                                    <div className="flex items-center gap-1.5">
                                        {p.isKey && (
                                            <Badge
                                                variant="secondary"
                                                className="h-4 px-1 text-[10px]"
                                            >
                                                PK
                                            </Badge>
                                        )}
                                        <span
                                            className={
                                                p.isKey ? "font-medium" : ""
                                            }
                                        >
                                            {p.name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-2.5 py-1.5 text-right font-mono text-[10px] text-muted-foreground">
                                    {p.type}
                                    {p.nullable ? "?" : ""}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    )
}

function Outgoing() {
    const { entity, byShortName } = useInspector()
    const { actions, meta } = useGraphContext()

    function go(id: string) {
        actions.select(id)
        meta.panToNode?.(id)
    }

    return (
        <section>
            <h3 className="mb-1.5 flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <RiArrowRightLine className="size-3" /> Outgoing
            </h3>
            {entity.relationships.length === 0 ? (
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
                                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted disabled:opacity-60 disabled:hover:bg-transparent"
                                >
                                    <span>
                                        <span className="font-medium">
                                            {rel.name}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {" "}
                                            → {rel.target}
                                        </span>
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="h-4 px-1 text-[10px]"
                                    >
                                        {rel.cardinality}
                                    </Badge>
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

    function go(id: string) {
        actions.select(id)
        meta.panToNode?.(id)
    }

    return (
        <section>
            <h3 className="mb-1.5 flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <RiArrowLeftRightLine className="size-3" /> Incoming
            </h3>
            {incoming.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">None.</p>
            ) : (
                <ul className="flex flex-col gap-1">
                    {incoming.map((rel) => (
                        <li key={`${rel.fromEntity.id}.${rel.name}`}>
                            <button
                                type="button"
                                onClick={() => go(rel.fromEntity.id)}
                                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                            >
                                <span>
                                    <span className="text-muted-foreground">
                                        {rel.fromEntity.name}.
                                    </span>
                                    <span className="font-medium">
                                        {rel.name}
                                    </span>
                                </span>
                                <Badge
                                    variant="outline"
                                    className="h-4 px-1 text-[10px]"
                                >
                                    {rel.cardinality}
                                </Badge>
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
            <ScrollArea className="h-full">
                <div className="flex flex-col gap-4 p-3">
                    <EntityInspector.Header />
                    <EntityInspector.Summary />
                    <Separator />
                    <EntityInspector.Properties />
                    <Separator />
                    <EntityInspector.Outgoing />
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
