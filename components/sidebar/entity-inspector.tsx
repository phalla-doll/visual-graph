"use client";

import { useMemo } from "react";
import { RiArrowLeftRightLine, RiArrowRightLine } from "@remixicon/react";

import { AISummary } from "@/components/sidebar/ai-summary";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useGraphStore } from "@/store/graph-store";
import type { Entity } from "@/types/entity";

interface IncomingRelationship {
  fromEntity: Entity;
  name: string;
  cardinality: "one" | "many";
}

export function EntityInspector() {
  const entities = useGraphStore((s) => s.entities);
  const selectedEntityId = useGraphStore((s) => s.selectedEntityId);
  const select = useGraphStore((s) => s.select);

  const selected = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) ?? null,
    [entities, selectedEntityId],
  );

  const byShortName = useMemo(() => new Map(entities.map((e) => [e.name, e] as const)), [entities]);

  const incoming = useMemo<IncomingRelationship[]>(() => {
    if (!selected) return [];
    const acc: IncomingRelationship[] = [];
    for (const other of entities) {
      if (other.id === selected.id) continue;
      for (const rel of other.relationships) {
        if (rel.target === selected.name) {
          acc.push({ fromEntity: other, name: rel.name, cardinality: rel.cardinality });
        }
      }
    }
    return acc;
  }, [entities, selected]);

  if (!selected) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Select an entity to inspect its properties and relationships.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-4 p-3">
        <div>
          <h2 className="font-heading text-base font-medium">{selected.name}</h2>
          {selected.namespace && (
            <p className="font-mono text-[10px] text-muted-foreground">{selected.namespace}</p>
          )}
        </div>

        <AISummary entity={selected} />

        <Separator />

        <section>
          <h3 className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Properties
          </h3>
          {selected.properties.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No properties.</p>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {selected.properties.map((p) => (
                    <tr key={p.name}>
                      <td className="px-2.5 py-1.5">
                        <div className="flex items-center gap-1.5">
                          {p.isKey && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                              PK
                            </Badge>
                          )}
                          <span className={p.isKey ? "font-medium" : ""}>{p.name}</span>
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
          )}
        </section>

        <Separator />

        <section>
          <h3 className="mb-1.5 flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <RiArrowRightLine className="size-3" /> Outgoing
          </h3>
          {selected.relationships.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">None.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {selected.relationships.map((rel) => {
                const target = byShortName.get(rel.target);
                return (
                  <li key={`${rel.name}->${rel.target}`}>
                    <button
                      type="button"
                      disabled={!target}
                      onClick={() => target && select(target.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <span>
                        <span className="font-medium">{rel.name}</span>
                        <span className="text-muted-foreground"> → {rel.target}</span>
                      </span>
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">
                        {rel.cardinality}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

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
                    onClick={() => select(rel.fromEntity.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-muted"
                  >
                    <span>
                      <span className="text-muted-foreground">{rel.fromEntity.name}.</span>
                      <span className="font-medium">{rel.name}</span>
                    </span>
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      {rel.cardinality}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
