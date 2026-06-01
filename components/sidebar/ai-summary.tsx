"use client";

import { useState } from "react";
import { RiSparkling2Line } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graph-store";
import type { Entity } from "@/types/entity";

interface AISummaryProps {
  entity: Entity;
}

interface IncomingRef {
  fromName: string;
  name: string;
  cardinality: "one" | "many";
}

function collectIncoming(target: Entity, all: Entity[]): IncomingRef[] {
  const refs: IncomingRef[] = [];
  for (const other of all) {
    if (other.id === target.id) continue;
    for (const rel of other.relationships) {
      if (rel.target === target.name) {
        refs.push({ fromName: other.name, name: rel.name, cardinality: rel.cardinality });
      }
    }
  }
  return refs;
}

export function AISummary({ entity }: AISummaryProps) {
  const summary = useGraphStore((s) => s.summaries[entity.id]);
  const setSummary = useGraphStore((s) => s.setSummary);
  const entities = useGraphStore((s) => s.entities);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const incoming = collectIncoming(entity, entities);
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, incoming }),
      });
      const data = (await res.json().catch(() => null)) as
        | { summary?: string; error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error ?? `Request failed (HTTP ${res.status}).`);
        return;
      }
      if (!data?.summary) {
        setError("No summary returned.");
        return;
      }
      setSummary(entity.id, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <RiSparkling2Line className="size-3" /> AI Summary
        </h3>
        <Button size="xs" variant={summary ? "ghost" : "secondary"} onClick={onGenerate} disabled={loading}>
          {loading ? "Generating…" : summary ? "Regenerate" : "Summarize"}
        </Button>
      </div>
      {summary && (
        <p className="rounded-md border bg-muted/40 px-2.5 py-2 text-xs leading-relaxed">{summary}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {!summary && !error && !loading && (
        <p className="text-xs text-muted-foreground italic">
          Generate a short natural-language description of this entity.
        </p>
      )}
    </div>
  );
}
