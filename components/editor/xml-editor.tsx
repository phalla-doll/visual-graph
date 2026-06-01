"use client"

import { useDeferredValue, useMemo, useRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    CheckmarkCircle02Icon,
    FolderOpenIcon,
    PlayIcon,
} from "@hugeicons/core-free-icons"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { validateEdmx } from "@/parser/validate"
import { useGraphContext } from "@/store/graph-context"

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export function XmlEditor() {
    const { state, actions } = useGraphContext()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const deferredXml = useDeferredValue(state.xml)
    const isValidating = deferredXml !== state.xml

    const stats = useMemo(() => {
        if (!state.xml) return null
        const bytes = new Blob([state.xml]).size
        const lines = state.xml.split("\n").length
        return {
            chars: state.xml.length,
            lines,
            size: formatBytes(bytes),
        }
    }, [state.xml])

    const validation = useMemo(
        () => (deferredXml.trim() ? validateEdmx(deferredXml) : null),
        [deferredXml]
    )

    const canParse =
        state.xml.trim().length > 0 &&
        !isValidating &&
        !state.parsing &&
        validation?.ok === true

    function onParseClick() {
        if (validation?.ok) actions.applyEntities(validation.entities)
        else actions.parse()
    }

    function onUploadClick() {
        fileInputRef.current?.click()
    }

    async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        e.target.value = ""
        if (files.length === 0) return

        const results = await Promise.all(
            files.map(async (f) => ({
                name: f.name,
                text: await f.text(),
            }))
        )

        const failed = results
            .map((r) => ({ name: r.name, result: validateEdmx(r.text) }))
            .filter((r) => !r.result.ok) as {
            name: string
            result: { ok: false; error: string }
        }[]

        if (failed.length > 0) {
            const list = failed.map((f) => f.name).join(", ")
            toast.error(`Invalid EDMX: ${list}`, {
                description: failed[0].result.error,
            })
            return
        }

        if (results.length === 1) {
            actions.setXml(results[0].text)
            toast.success(`Loaded ${results[0].name}`)
        } else {
            actions.parseDocuments(results.map((r) => r.text))
            toast.success(`Parsed ${results.length} documents`)
        }
    }

    return (
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle>Paste an EDMX document</CardTitle>
                <CardDescription>
                    Drop in an OData $metadata response, or upload one or more
                    .edmx files to merge entities across schemas.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Textarea
                    value={state.xml}
                    onChange={(e) => actions.setXml(e.target.value)}
                    placeholder={
                        '<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">…'
                    }
                    className="max-h-[60vh] min-h-[280px] font-mono text-xs"
                    spellCheck={false}
                />
                {validation && !validation.ok && !isValidating ? (
                    <p className="text-sm text-destructive">
                        {validation.error}
                    </p>
                ) : (
                    state.parseError && (
                        <p className="text-sm text-destructive">
                            {state.parseError}
                        </p>
                    )
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,.edmx,application/xml,text/xml"
                    onChange={onFile}
                    multiple
                    hidden
                />
            </CardContent>
            <CardFooter className="justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                    {stats ? (
                        <>
                            {validation?.ok && !isValidating && (
                                <HugeiconsIcon
                                    icon={CheckmarkCircle02Icon}
                                    className="size-3.5 shrink-0 text-emerald-500"
                                />
                            )}
                            <span className="truncate">
                                {stats.size} · {stats.lines.toLocaleString()}{" "}
                                lines · {stats.chars.toLocaleString()} chars
                                {validation?.ok &&
                                    !isValidating &&
                                    ` · ${validation.entityCount} entities`}
                                {isValidating && " · validating…"}
                            </span>
                        </>
                    ) : (
                        <span>Empty</span>
                    )}
                </span>
                <div className="flex shrink-0 gap-2">
                    <Button
                        variant="outline"
                        onClick={onUploadClick}
                        disabled={state.parsing}
                    >
                        <HugeiconsIcon icon={FolderOpenIcon} /> Upload file(s)
                    </Button>
                    <Button onClick={onParseClick} disabled={!canParse}>
                        <HugeiconsIcon icon={PlayIcon} />{" "}
                        {state.parsing ? "Parsing…" : "Parse"}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
