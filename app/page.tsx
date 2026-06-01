"use client";

import { RiRefreshLine } from "@remixicon/react";

import { XmlEditor } from "@/components/editor/xml-editor";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { Button } from "@/components/ui/button";
import { useGraphStore } from "@/store/graph-store";

export default function Page() {
  const hasGraph = useGraphStore((s) => s.entities.length > 0);
  const entityCount = useGraphStore((s) => s.entities.length);
  const edgeCount = useGraphStore((s) => s.graph.edges.length);
  const reset = useGraphStore((s) => s.reset);

  if (!hasGraph) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <XmlEditor />
      </main>
    );
  }

  return (
    <main className="flex h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-baseline gap-3">
          <h1 className="font-heading text-base font-medium">XML Visual Graph</h1>
          <span className="text-xs text-muted-foreground">
            {entityCount} entities · {edgeCount} relationships
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RiRefreshLine /> Reset
        </Button>
      </header>
      <div className="min-h-0 flex-1">
        <GraphCanvas />
      </div>
    </main>
  );
}
