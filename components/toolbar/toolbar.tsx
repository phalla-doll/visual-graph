"use client";

import { useReactFlow } from "@xyflow/react";
import {
  RiArrowLeftRightLine,
  RiArrowUpDownLine,
  RiClipboardLine,
  RiDownload2Line,
  RiFocus3Line,
  RiRefreshLine,
} from "@remixicon/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGraphStore } from "@/store/graph-store";
import { toMermaidER } from "@/utils/mermaid";

export function Toolbar() {
  const direction = useGraphStore((s) => s.layoutDirection);
  const setDirection = useGraphStore((s) => s.setLayoutDirection);
  const reset = useGraphStore((s) => s.reset);
  const { fitView } = useReactFlow();

  function onCopyMermaid() {
    const { graph, entities } = useGraphStore.getState();
    const text = toMermaidER(graph, entities);
    navigator.clipboard.writeText(text).then(
      () => toast.success("Mermaid ER diagram copied to clipboard"),
      () => toast.error("Failed to copy to clipboard"),
    );
  }

  function onDownloadJson() {
    const { graph } = useGraphStore.getState();
    const blob = new Blob([JSON.stringify(graph, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "visual-graph.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Downloaded visual-graph.json");
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={() => fitView({ duration: 300 })}>
              <RiFocus3Line />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit view</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDirection(direction === "LR" ? "TB" : "LR")}
            >
              {direction === "LR" ? <RiArrowLeftRightLine /> : <RiArrowUpDownLine />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Layout: {direction === "LR" ? "left → right" : "top → bottom"} (toggle)
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onCopyMermaid}>
              <RiClipboardLine /> Mermaid
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy as Mermaid ER diagram</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onDownloadJson}>
              <RiDownload2Line /> JSON
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download graph as JSON</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={reset}>
              <RiRefreshLine /> Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear graph and return to the editor</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
