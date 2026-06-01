"use client"

import { useReactFlow } from "@xyflow/react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowLeftRightIcon,
    ArrowUpDownIcon,
    ClipboardIcon,
    Download01Icon,
    FocusPointIcon,
    RefreshIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGraphContext } from "@/store/graph-context"

export function Toolbar() {
    const { state, actions } = useGraphContext()
    const { fitView } = useReactFlow()

    function onCopyMermaid() {
        const text = actions.exportMermaid()
        navigator.clipboard.writeText(text).then(
            () => toast.success("Mermaid ER diagram copied to clipboard"),
            () => toast.error("Failed to copy to clipboard")
        )
    }

    function onDownloadJson() {
        const blob = new Blob([actions.exportJson()], {
            type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "visual-graph.json"
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        toast.success("Downloaded visual-graph.json")
    }

    function onToggleDirection() {
        actions.setLayoutDirection(state.layoutDirection === "LR" ? "TB" : "LR")
    }

    return (
        <TooltipProvider>
            <div className="flex items-center gap-1 border-b px-2 py-1.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => fitView({ duration: 300 })}
                        >
                            <HugeiconsIcon icon={FocusPointIcon} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit view</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onToggleDirection}
                        >
                            {state.layoutDirection === "LR" ? (
                                <HugeiconsIcon icon={ArrowLeftRightIcon} />
                            ) : (
                                <HugeiconsIcon icon={ArrowUpDownIcon} />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Layout:{" "}
                        {state.layoutDirection === "LR"
                            ? "left → right"
                            : "top → bottom"}{" "}
                        (toggle)
                    </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="mx-1 h-5" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onCopyMermaid}
                        >
                            <HugeiconsIcon icon={ClipboardIcon} /> Mermaid
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy as Mermaid ER diagram</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDownloadJson}
                        >
                            <HugeiconsIcon icon={Download01Icon} /> JSON
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download graph as JSON</TooltipContent>
                </Tooltip>

                <div className="flex-1" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={actions.reset}
                        >
                            <HugeiconsIcon icon={RefreshIcon} /> Reset
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        Clear graph and return to the editor
                    </TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    )
}
