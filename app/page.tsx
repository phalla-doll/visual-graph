"use client";

import { RiRefreshLine } from "@remixicon/react";

import { XmlEditor } from "@/components/editor/xml-editor";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { Sidebar } from "@/components/sidebar/sidebar";
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
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
          <Sidebar />
        </aside>
        <div className="min-w-0 flex-1">
          <GraphCanvas />
        </div>
      </div>
    </main>
  );
}
