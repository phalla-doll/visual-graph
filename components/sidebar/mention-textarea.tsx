"use client"

import {
    useCallback,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ChangeEvent,
    type SyntheticEvent,
} from "react"

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface MentionTextareaProps {
    value: string
    onValueChange: (next: string) => void
    validNames: Set<string>
    placeholder?: string
    rows?: number
    disabled?: boolean
}

interface TriggerState {
    start: number
    query: string
}

const TRIGGER_PATTERN = /@(\w*)$/
const MENTION_PATTERN = /@(\w+)/g
const MAX_SUGGESTIONS = 8

export function MentionTextarea({
    value,
    onValueChange,
    validNames,
    placeholder,
    rows = 3,
    disabled,
}: MentionTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const [trigger, setTrigger] = useState<TriggerState | null>(null)
    const [activeIdx, setActiveIdx] = useState(0)

    const candidates = useMemo(() => {
        if (!trigger) return []
        const q = trigger.query.toLowerCase()
        const all = Array.from(validNames)
        const matches = q ? all.filter((n) => n.toLowerCase().includes(q)) : all
        matches.sort((a, b) => {
            if (!q) return a.localeCompare(b)
            const ai = a.toLowerCase().indexOf(q)
            const bi = b.toLowerCase().indexOf(q)
            if (ai !== bi) return ai - bi
            return a.localeCompare(b)
        })
        return matches.slice(0, MAX_SUGGESTIONS)
    }, [trigger, validNames])

    const syncScroll = useCallback(() => {
        if (textareaRef.current && overlayRef.current) {
            overlayRef.current.scrollTop = textareaRef.current.scrollTop
            overlayRef.current.scrollLeft = textareaRef.current.scrollLeft
        }
    }, [])

    function updateTrigger(text: string, caret: number) {
        const before = text.slice(0, caret)
        const m = before.match(TRIGGER_PATTERN)
        if (m) {
            const next = { start: caret - m[0].length, query: m[1] }
            if (!trigger || trigger.query !== next.query) setActiveIdx(0)
            setTrigger(next)
        } else {
            setTrigger(null)
        }
    }

    function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
        const next = e.target.value
        onValueChange(next)
        updateTrigger(next, e.target.selectionStart)
    }

    function handleSelect(e: SyntheticEvent<HTMLTextAreaElement>) {
        const ta = e.currentTarget
        updateTrigger(ta.value, ta.selectionStart)
    }

    function insertMention(name: string) {
        if (!trigger || !textareaRef.current) return
        const ta = textareaRef.current
        const before = value.slice(0, trigger.start)
        const after = value.slice(trigger.start + 1 + trigger.query.length)
        const insert = `@${name} `
        const next = before + insert + after
        const newCaret = before.length + insert.length
        onValueChange(next)
        setTrigger(null)
        requestAnimationFrame(() => {
            ta.focus()
            ta.setSelectionRange(newCaret, newCaret)
        })
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (!trigger || candidates.length === 0) return
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIdx((i) => (i + 1) % candidates.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIdx((i) => (i - 1 + candidates.length) % candidates.length)
        } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault()
            insertMention(candidates[activeIdx])
        } else if (e.key === "Escape") {
            e.preventDefault()
            setTrigger(null)
        }
    }

    const tokens = useMemo(() => {
        type Kind = "text" | "valid" | "invalid" | "pending"
        const out: { text: string; kind: Kind }[] = []
        let lastIdx = 0
        const pattern = new RegExp(MENTION_PATTERN.source, "g")
        let m: RegExpExecArray | null
        while ((m = pattern.exec(value)) !== null) {
            if (m.index > lastIdx)
                out.push({
                    text: value.slice(lastIdx, m.index),
                    kind: "text",
                })
            const name = m[1]
            // While the popover is open over this token (user mid-typing),
            // keep it neutral — don't flash red before they've finished.
            const isPending = trigger !== null && trigger.start === m.index
            out.push({
                text: m[0],
                kind: isPending
                    ? "pending"
                    : validNames.has(name)
                      ? "valid"
                      : "invalid",
            })
            lastIdx = m.index + m[0].length
        }
        if (lastIdx < value.length)
            out.push({ text: value.slice(lastIdx), kind: "text" })
        return out
    }, [value, validNames, trigger])

    const showPopover = trigger !== null && candidates.length > 0

    return (
        <Popover
            open={showPopover}
            onOpenChange={(o) => {
                if (!o) setTrigger(null)
            }}
        >
            <PopoverAnchor asChild>
                <div className="relative">
                    <div
                        ref={overlayRef}
                        aria-hidden
                        className={cn(
                            "pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-2.5 py-2 text-base break-words whitespace-pre-wrap text-foreground md:text-sm",
                            disabled && "opacity-50"
                        )}
                    >
                        {tokens.map((t, i) =>
                            t.kind === "text" ? (
                                <span key={i}>{t.text}</span>
                            ) : (
                                <span
                                    key={i}
                                    className={cn(
                                        "rounded-sm",
                                        t.kind === "valid" &&
                                            "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                                        t.kind === "invalid" &&
                                            "bg-rose-500/15 text-rose-700 underline decoration-rose-500/60 decoration-wavy dark:text-rose-300",
                                        t.kind === "pending" &&
                                            "bg-muted-foreground/15 text-muted-foreground"
                                    )}
                                >
                                    {t.text}
                                </span>
                            )
                        )}
                        {value.endsWith("\n") && <span>{"​"}</span>}
                    </div>
                    <Textarea
                        ref={textareaRef}
                        value={value}
                        placeholder={placeholder}
                        rows={rows}
                        disabled={disabled}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        onKeyUp={handleSelect}
                        onClick={handleSelect}
                        onScroll={syncScroll}
                        className="relative bg-transparent text-transparent caret-foreground"
                    />
                </div>
            </PopoverAnchor>
            <PopoverContent
                className="w-56 p-1"
                align="start"
                side="bottom"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <ul
                    role="listbox"
                    className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
                >
                    {candidates.map((name, i) => (
                        <li key={name}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={i === activeIdx}
                                onMouseEnter={() => setActiveIdx(i)}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    insertMention(name)
                                }}
                                className={cn(
                                    "flex w-full items-center rounded-sm px-2 py-1 text-left text-xs",
                                    i === activeIdx
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent/50"
                                )}
                            >
                                <span className="font-mono">@{name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    )
}
