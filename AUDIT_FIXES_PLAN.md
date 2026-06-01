# Audit Fixes Plan

Detailed plan for acting on the `vercel-react-best-practices` and `vercel-composition-patterns` audit findings. Each item lists the problem, the files touched, the concrete change (with code sketches), and acceptance criteria.

Work is split into two PRs:

- **PR 1 — Bundle & hydration fixes.** Small, mechanical, low-risk. Each change is independent; can be merged piecewise. Touches `next.config.ts`, `app/page.tsx`, `store/graph-store.ts`, `components/store-hydrator.tsx`, `components/toolbar/toolbar.tsx`, `components/graph/relationship-edge.tsx`, `components/graph/graph-canvas.tsx`.
- **PR 2 — Composition refactor.** Larger, design-level. Introduces a `GraphContext` between Zustand and the UI, restructures the store, and rebuilds `EntityInspector` as a compound component. Should land as one PR (the changes are mutually reinforcing); each step is independently reviewable as a commit.

Both PRs are independent of each other and can land in either order.

---

## Implementation status

Both PRs landed on branch `refactor/audit-fixes` as separate commits:

- `7fc5a75` perf: lazy-load graph canvas and tighten store persistence (PR 1)
- `6d7dd90` refactor: introduce GraphContext layer and compound EntityInspector (PR 2)

`pnpm typecheck`, `pnpm lint`, and `pnpm build` all pass. Dev server compiles cleanly. `rg useGraphStore components/ app/` returns no hits outside `store/`.

### Deviations from the plan

- **PR 2.6 — `panToNode` via `GraphMetaProvider` + ref, not a nested `GraphProvider` inside `CanvasInner`.** The plan's nested-provider pattern only reaches descendants of `CanvasInner`, but in this layout the sidebar is a *sibling* of the canvas (both children of the page's flex container). To bridge: `app/page.tsx` holds a stable `useRef`, builds a stable `meta.panToNode` that delegates to the ref, and wraps both sidebar and canvas in a new `store/graph-meta-provider.tsx`. The canvas writes its real `panToNode` to the ref in a mount effect; sidebar buttons call `meta.panToNode?.(id)` after `select()`, exactly as the plan intended. The `useEffect` for pan-on-selection-change at `graph-canvas.tsx:41-51` is deleted.
- **PR 2.3 — `GraphProvider` `fallback` prop.** Returning `null` during hydration left the SSR'd body empty (worse than PR 1.3's neutral placeholder). Added an optional `fallback?: ReactNode`; `app/layout.tsx` passes a neutral `<main className="flex min-h-svh items-center justify-center p-6" />`.
- **PR 2.2 — `utils/incoming-relationships.ts` extracted.** `collectIncoming` lives in a shared helper used by both the store (for `requestSummary`'s API payload) and `entity-inspector-context.tsx` (for the Incoming list). Verification's "defined exactly once" is satisfied.

### Judgement calls

- **PR 1.3 — `summaries` persisted.** The plan flagged this for product confirmation. Chose to persist (AI-generated output survives reloads). Trivial to revert if product wants it dropped — remove `summaries` from `partialize` in `store/graph-store.ts`.

### Deferred (per plan)

- **PR 2.8 — compound `Sidebar` tabs.** Plan recommended deferring until a 3rd tab is on the roadmap. Not implemented.
- **Low-impact nits** in "Deliberately out of scope" remain follow-ups.

---

## PR 1 — Bundle & hydration fixes

### 1.1 Dynamic-import `GraphCanvas`

**Rule:** `bundle-dynamic-imports` (CRITICAL).
**Problem:** `app/page.tsx:4` statically imports `GraphCanvas`, which top-level imports `@xyflow/react` (full library + CSS) and indirectly `dagre`. Users on the empty-state path (`hasGraph === false`) still pay for the entire graph runtime in their initial JS bundle.
**Files:** `app/page.tsx`.

**Change:**

```ts
// app/page.tsx
"use client"

import dynamic from "next/dynamic"
import { XmlEditor } from "@/components/editor/xml-editor"
import { Sidebar } from "@/components/sidebar/sidebar"
import { useGraphStore } from "@/store/graph-store"

const GraphCanvas = dynamic(
    () => import("@/components/graph/graph-canvas").then((m) => m.GraphCanvas),
    { ssr: false }
)
```

`ssr: false` is required because React Flow does not render on the server. No loading state needed — `GraphCanvas` only mounts after `hasGraph` is true, by which point the user has just clicked Parse and is already past the editor screen.

**Acceptance criteria:**
- Run `pnpm build`. The empty-state page's First Load JS drops by the size of the React Flow chunk.
- The graph still renders correctly after parsing a document.
- No hydration warnings in the console.

---

### 1.2 Enable `optimizePackageImports` for known barrels

**Rule:** `bundle-barrel-imports` (CRITICAL).
**Problem:** `next.config.ts` is empty. `@remixicon/react` is a large barrel imported from six components; `radix-ui` (the umbrella package shadcn uses here) is also a barrel.
**Files:** `next.config.ts`.

**Change:**

```ts
// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    experimental: {
        optimizePackageImports: ["@remixicon/react", "radix-ui"],
    },
}

export default nextConfig
```

**Acceptance criteria:**
- `pnpm build` succeeds.
- A `next/dynamic` analysis or bundle inspection shows the icon chunk shrinks.
- No regressions in icon rendering.

---

### 1.3 Trim persisted state and fix the post-rehydration flash

**Rules:** `client-localstorage-schema` (MEDIUM-HIGH), `rendering-hydration-no-flicker` (MEDIUM).
**Problem:** Two related issues:

1. `store/graph-store.ts:154-161` persists the full `entities` array and the derived `graph` object — both are rebuildable from `xml` via `entitiesFromDocuments(...)` + `buildGraph(...)`. On a 200-entity schema this is tens of KB of duplicate data and creates a schema-drift risk (the persisted shape must keep up with `Entity`/`ParsedGraph` evolution).
2. `components/store-hydrator.tsx:7-12` calls `persist.rehydrate()` from an effect; the server-rendered HTML always shows the empty-state editor (`hasGraph === false`), and the client flips to the graph view after hydration. Users reloading a populated graph see a one-frame flash of the editor.

**Files:** `store/graph-store.ts`, `components/store-hydrator.tsx`, `app/page.tsx`.

**Change A — minimize persisted slice + re-derive on rehydrate:**

```ts
// store/graph-store.ts
persist(
    (set, get) => ({ /* unchanged */ }),
    {
        name: "visual-graph",
        version: 2, // bump: schema changed
        storage: createJSONStorage(() =>
            typeof window === "undefined"
                ? (undefined as unknown as Storage)
                : window.localStorage
        ),
        partialize: (state) => ({
            xml: state.xml,
            selectedEntityId: state.selectedEntityId,
            layoutDirection: state.layoutDirection,
            sidebarTab: state.sidebarTab,
            summaries: state.summaries,
        }),
        onRehydrateStorage: () => (rehydrated, error) => {
            if (error || !rehydrated?.xml?.trim()) return
            try {
                const entities = entitiesFromDocuments([rehydrated.xml])
                useGraphStore.setState({
                    entities,
                    graph: buildGraph(entities),
                    parseError: null,
                })
            } catch (err) {
                useGraphStore.setState({
                    parseError: messageFor(err),
                    entities: [],
                    graph: EMPTY_GRAPH,
                })
            }
        },
        skipHydration: true,
    }
)
```

`summaries` is also added to the persisted slice (currently dropped on reload — likely a bug; AI-generated summaries vanish even though the user paid for them). Confirm with product before shipping; if intentional, leave it out.

Add a `migrate` function to handle the `v1 → v2` jump (drops the now-removed `entities`/`graph` fields gracefully):

```ts
migrate: (persisted: unknown, version: number) => {
    if (version < 2) {
        const p = persisted as { xml?: string; selectedEntityId?: string | null;
            layoutDirection?: LayoutDirection; sidebarTab?: SidebarTab;
            summaries?: Record<string, string> }
        return {
            xml: p.xml ?? "",
            selectedEntityId: p.selectedEntityId ?? null,
            layoutDirection: p.layoutDirection ?? "LR",
            sidebarTab: p.sidebarTab ?? "entities",
            summaries: p.summaries ?? {},
        }
    }
    return persisted
},
```

**Change B — gate render on hydration:**

```tsx
// components/store-hydrator.tsx
"use client"
import { useEffect, useSyncExternalStore } from "react"
import { useGraphStore } from "@/store/graph-store"

let didInit = false

function subscribe(cb: () => void) {
    return useGraphStore.persist.onFinishHydration(cb)
}

export function useHasHydrated(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => useGraphStore.persist.hasHydrated(),
        () => false // server snapshot — always not hydrated
    )
}

export function StoreHydrator() {
    useEffect(() => {
        if (didInit) return
        didInit = true
        useGraphStore.persist.rehydrate()
    }, [])
    return null
}
```

```tsx
// app/page.tsx (composed with 1.1 above)
const hasHydrated = useHasHydrated()
const hasGraph = useGraphStore((s) => s.entities.length > 0)

if (!hasHydrated) {
    return <main className="flex min-h-svh items-center justify-center p-6" />
    // neutral placeholder; intentionally empty to avoid both editor and graph flashing
}

if (!hasGraph) { /* editor branch */ }
return /* graph branch */
```

The neutral placeholder during hydration matches the page background and prevents either the editor or the graph from rendering with stale state.

**Acceptance criteria:**
- Reload the page after parsing a graph: no editor flash; the page transitions cleanly from blank → graph.
- `localStorage["visual-graph"]` payload size drops noticeably (compare before/after with DevTools).
- v1 payloads in localStorage still load correctly (migrate path tested).
- Strict-mode dev: `StoreHydrator` effect runs once even with double-mount.

---

### 1.4 Read `layoutDirection` from `getState()` in the toolbar toggle

**Rule:** `rerender-defer-reads` (MEDIUM).
**Problem:** `components/toolbar/toolbar.tsx:26` subscribes to `s.layoutDirection`. It's used in two places: (a) the icon swap at lines 81-85 (legitimate subscription) and (b) computing the next value inside `onClick` at line 78 (unnecessary subscription — could be `getState()`).

This is an inconsistency with sibling handlers (`onCopyMermaid`, `onDownloadJson`) that already use `useGraphStore.getState()`. The icon needs to react, so we can't simply remove the subscription — but we should add a comment so the inconsistency doesn't look like an oversight.

**Files:** `components/toolbar/toolbar.tsx`.

**Change:**

```tsx
// keep `direction` subscription for the icon swap below
const direction = useGraphStore((s) => s.layoutDirection)
const setDirection = useGraphStore((s) => s.setLayoutDirection)
const reset = useGraphStore((s) => s.reset)

function onToggleDirection() {
    // read via getState() since the click handler doesn't need to be reactive
    const current = useGraphStore.getState().layoutDirection
    setDirection(current === "LR" ? "TB" : "LR")
}
```

Then wire `onClick={onToggleDirection}` on the button (line 77-79).

**Acceptance criteria:**
- Toggle still works; icon still flips.
- No behavioral change. This is a code-style consistency fix.

---

### 1.5 Hoist `RelationshipMarkers` SVG JSX

**Rule:** `rendering-hoist-jsx` (LOW-MEDIUM).
**Problem:** `RelationshipMarkers` (in `components/graph/relationship-edge.tsx`) is a fully static SVG `<defs>` block. Currently the JSX expression is rebuilt on every render of its parent (`CanvasInner`).
**Files:** `components/graph/relationship-edge.tsx`.

**Change:** Move the JSX expression into a module-level constant and return it from the component:

```tsx
// relationship-edge.tsx
const RELATIONSHIP_MARKERS = (
    <svg className="absolute size-0">
        <defs>
            {/* ...all marker definitions... */}
        </defs>
    </svg>
)

export function RelationshipMarkers() {
    return RELATIONSHIP_MARKERS
}
```

Alternative: wrap with `React.memo(() => …, () => true)` — but the hoisted-const form is simpler.

**Acceptance criteria:**
- Markers still render; edge endpoints still show correct shapes.

---

### 1.6 Move pan-to-node out of the effect, into the click handler

**Rule:** `rerender-move-effect-to-event` (MEDIUM).
**Problem:** `components/graph/graph-canvas.tsx:41-51` synchronizes the React Flow viewport with `selectedEntityId` via `useEffect`. This is a "response to user interaction" pattern that the rule says belongs in event handlers. Today the effect also runs whenever the graph re-renders (since `getNode`/`setCenter` may be referentially unstable across renders).

Selection from the sidebar (`select(target.id)` calls in `entity-inspector.tsx`) also needs to drive the pan, so we can't simply move the logic into `onNodeClick`. Instead, expose a pan-to-node action and wire both paths to it.

**Files:** `components/graph/graph-canvas.tsx`, `components/sidebar/entity-inspector.tsx`.

**Change A — replace the effect with a callback:**

```tsx
// graph-canvas.tsx
function CanvasInner() {
    const graph = useGraphStore((s) => s.graph)
    const direction = useGraphStore((s) => s.layoutDirection)
    const select = useGraphStore((s) => s.select)
    const { setCenter, getNode } = useReactFlow()

    const { nodes, edges } = useMemo(/* unchanged */)

    function panToNode(id: string) {
        const node = getNode(id)
        if (!node) return
        const width = node.measured?.width ?? 220
        const height = node.measured?.height ?? 120
        setCenter(node.position.x + width / 2, node.position.y + height / 2, {
            duration: 400,
            zoom: 1.2,
        })
    }

    function onNodeClick(_: React.MouseEvent, node: ReactFlowNode) {
        select(node.id)
        panToNode(node.id)
    }

    function onPaneClick() {
        select(null)
    }
    /* ... */
}
```

**Change B — wire sidebar selections through the same callback.**
The sidebar currently calls `select(target.id)` directly. To trigger the pan, expose `panToNode` via context.

Since this overlaps with the bigger composition refactor in PR 2 (which introduces a `GraphContext` anyway), prefer to *defer this change* and bundle it with PR 2 — let `GraphContext.meta.panToNode` be the channel. As an interim, simply leave the effect in place but add `// eslint-disable-next-line react-hooks/exhaustive-deps` and an explanatory comment.

If PR 2 will not happen, the lightweight alternative is a `useImperativeHandle`-via-ref on `ReactFlowProvider`'s consumer or a Zustand `meta` slice — both heavier than just keeping the effect.

**Recommendation:** **skip this finding in PR 1**; address it inside PR 2 where the context already exists.

---

### 1.7 Add `didInit` guard to `StoreHydrator`

Already folded into change 1.3 above (the module-level `didInit` flag).

---

### PR 1 verification checklist

- [ ] `pnpm typecheck` — passes.
- [ ] `pnpm lint` — passes.
- [ ] `pnpm build` — succeeds; First Load JS on the empty-state path drops.
- [ ] Manual: open the app fresh → editor shows.
- [ ] Manual: paste a small EDMX, click Parse → graph renders.
- [ ] Manual: reload → graph re-renders without an editor flash.
- [ ] Manual: toolbar direction toggle, fit-view, Mermaid copy, JSON download all work.
- [ ] Manual: a v1 localStorage payload (saved before this change) loads via the migrate function without errors.
- [ ] DevTools: localStorage `visual-graph` value is shorter than before (no `entities`/`graph`).

---

## PR 2 — Composition refactor

This PR introduces a context layer between Zustand and the UI, restructures the store as `{ state, actions, meta }`, refactors `EntityInspector` into a compound component, and lifts the AI summary's in-flight status into the store.

The changes are mutually reinforcing — the compound `EntityInspector` benefits from the context, and lifting `summaryStatus` is easier once the context exists. Land as one PR, split into commits per step below.

### 2.1 Define the context contract

**Rule:** `state-context-interface` (HIGH).
**Files:** new file `store/graph-context.ts`.

```ts
// store/graph-context.ts
import { createContext } from "react"
import type { Entity } from "@/types/entity"
import type { ParsedGraph } from "@/types/graph"
import type { LayoutDirection, SidebarTab } from "@/store/graph-store"

export interface GraphState {
    xml: string
    entities: Entity[]
    graph: ParsedGraph
    selectedEntityId: string | null
    search: string
    parseError: string | null
    layoutDirection: LayoutDirection
    sidebarTab: SidebarTab
    summaries: Record<string, string>
    summaryStatus: Record<
        string,
        { state: "idle" | "loading" | "error"; error?: string }
    >
}

export interface GraphActions {
    setXml(xml: string): void
    parse(): void
    parseDocuments(documents: string[]): void
    select(id: string | null): void
    setSearch(q: string): void
    setLayoutDirection(direction: LayoutDirection): void
    setSidebarTab(tab: SidebarTab): void
    requestSummary(entity: Entity): Promise<void>
    exportMermaid(): string
    exportJson(): string
    reset(): void
}

export interface GraphMeta {
    panToNode?(id: string): void
}

export interface GraphContextValue {
    state: GraphState
    actions: GraphActions
    meta: GraphMeta
}

export const GraphContext = createContext<GraphContextValue | null>(null)
```

`summaryStatus` is the lifted in-flight tracking from `AISummary`. `requestSummary` becomes an action that owns the fetch, eliminating the `useState`s in the component (see step 2.4). `exportMermaid`/`exportJson` move the toolbar's `getState()` calls into the action layer (see step 2.5). `panToNode` is the meta hook for step 2.6.

### 2.2 Restructure the Zustand store + adapter provider

**Rule:** `state-decouple-implementation` (HIGH).
**Files:** `store/graph-store.ts`, new file `store/graph-provider.tsx`.

**Step A — restructure the store internally** so the actions return their results where the audit suggested (Mermaid/JSON serialization happens inside actions, summary fetch happens inside the store):

```ts
// store/graph-store.ts — new action surface
export interface GraphStore extends GraphState {
    setXml(xml: string): void
    parse(): void
    parseDocuments(documents: string[]): void
    select(id: string | null): void
    setSearch(q: string): void
    setLayoutDirection(direction: LayoutDirection): void
    setSidebarTab(tab: SidebarTab): void
    setSummary(id: string, summary: string): void
    startSummary(id: string): void
    failSummary(id: string, error: string): void
    requestSummary(entity: Entity): Promise<void>
    exportMermaid(): string
    exportJson(): string
    reset(): void
}
```

`requestSummary` lives in the store (not in `actions` directly) so it can call `set` and read `get` for the in-flight slice. The fetch logic moves from `components/sidebar/ai-summary.tsx:44-72` into this action verbatim, swapping `setError`/`setLoading` for `startSummary`/`failSummary`/`setSummary`.

`exportMermaid`/`exportJson` are pure: they read state, format, return a string. Move `toMermaidER` import here.

**Step B — adapter provider that bridges Zustand → context:**

```tsx
// store/graph-provider.tsx
"use client"
import { useMemo, type ReactNode } from "react"
import { useShallow } from "zustand/react/shallow"
import { GraphContext, type GraphContextValue } from "@/store/graph-context"
import { useGraphStore } from "@/store/graph-store"

interface GraphProviderProps {
    children: ReactNode
    meta?: GraphContextValue["meta"]
}

export function GraphProvider({ children, meta = {} }: GraphProviderProps) {
    const state = useGraphStore(
        useShallow((s) => ({
            xml: s.xml,
            entities: s.entities,
            graph: s.graph,
            selectedEntityId: s.selectedEntityId,
            search: s.search,
            parseError: s.parseError,
            layoutDirection: s.layoutDirection,
            sidebarTab: s.sidebarTab,
            summaries: s.summaries,
            summaryStatus: s.summaryStatus,
        }))
    )

    const actions = useGraphStore(
        useShallow((s) => ({
            setXml: s.setXml,
            parse: s.parse,
            parseDocuments: s.parseDocuments,
            select: s.select,
            setSearch: s.setSearch,
            setLayoutDirection: s.setLayoutDirection,
            setSidebarTab: s.setSidebarTab,
            requestSummary: s.requestSummary,
            exportMermaid: s.exportMermaid,
            exportJson: s.exportJson,
            reset: s.reset,
        }))
    )

    const value = useMemo<GraphContextValue>(
        () => ({ state, actions, meta }),
        [state, actions, meta]
    )

    return <GraphContext value={value}>{children}</GraphContext>
}
```

**Note (React 19):** `<GraphContext value={…}>` (no `.Provider`) is the React 19 API. Confirmed compliant with `react19-no-forwardref` family.

**Why one big `state` object?** This is intentional. The rule prefers a single context value with grouped sub-objects (`state`, `actions`, `meta`) over many fine-grained contexts; it's clearer for consumers and the cost is one shallow render per state change (which is the same cost as today's many subscriptions, in aggregate). Consumers that need only one field can still destructure: `const { state: { selectedEntityId } } = use(GraphContext)`.

### 2.3 Move the bootstrap inside `GraphProvider`

**Files:** `app/layout.tsx`, `store/graph-provider.tsx`, delete `components/store-hydrator.tsx`.

Move the `didInit` guard and the rehydration call inside `GraphProvider`. The hydration gate (from PR 1.3) also moves here and becomes part of the provider's responsibility — if a consumer wraps with `GraphProvider`, they don't need to know that Zustand is underneath.

```tsx
// store/graph-provider.tsx
let didInit = false

export function GraphProvider({ children, meta = {} }: GraphProviderProps) {
    useEffect(() => {
        if (didInit) return
        didInit = true
        useGraphStore.persist.rehydrate()
    }, [])
    const hasHydrated = useHasHydrated()
    /* ... */
    if (!hasHydrated) return null
    return <GraphContext value={value}>{children}</GraphContext>
}
```

Then `app/layout.tsx` becomes:

```tsx
<ThemeProvider>
    <GraphProvider>{children}</GraphProvider>
    <Toaster />
</ThemeProvider>
```

`StoreHydrator` is deleted.

### 2.4 Lift `loading`/`error` in `AISummary` into the store

**Rule:** `state-lift-state` (MEDIUM).
**Files:** `components/sidebar/ai-summary.tsx`.

The fetch logic moves into `requestSummary` on the store (step 2.2 above). `AISummary` becomes a thin view:

```tsx
// components/sidebar/ai-summary.tsx
"use client"
import { use } from "react"
import { RiSparkling2Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { GraphContext } from "@/store/graph-context"
import type { Entity } from "@/types/entity"

interface AISummaryProps { entity: Entity }

export function AISummary({ entity }: AISummaryProps) {
    const ctx = use(GraphContext)
    if (!ctx) throw new Error("AISummary must be used inside GraphProvider")
    const { state, actions } = ctx
    const summary = state.summaries[entity.id]
    const status = state.summaryStatus[entity.id] ?? { state: "idle" as const }

    return (
        <div className="flex flex-col gap-2">
            {/* same JSX, driven by `status.state === "loading"` and `status.error` */}
        </div>
    )
}
```

Delete the local `useState`s and `collectIncoming` helper (it's duplicated in `EntityInspector`; see step 2.7).

### 2.5 Make `Toolbar` read only from context

**Rule:** `state-decouple-implementation` (MEDIUM).
**Files:** `components/toolbar/toolbar.tsx`.

Remove all `useGraphStore` imports. Replace `getState()` calls with `actions.exportMermaid()` / `actions.exportJson()`. Remove the `toMermaidER` import (moved into the store).

```tsx
const { state, actions } = use(GraphContext)!
const { fitView } = useReactFlow()

function onCopyMermaid() {
    const text = actions.exportMermaid()
    navigator.clipboard.writeText(text).then(/*...*/)
}

function onDownloadJson() {
    const blob = new Blob([actions.exportJson()], { type: "application/json" })
    /* ... */
}

function onToggleDirection() {
    actions.setLayoutDirection(state.layoutDirection === "LR" ? "TB" : "LR")
}
```

### 2.6 Wire `panToNode` via `meta`

**Rules:** `rerender-move-effect-to-event` (MEDIUM), completes the deferred 1.6.
**Files:** `components/graph/graph-canvas.tsx`, `components/sidebar/entity-inspector.tsx`.

`GraphCanvas` provides `panToNode` to the context's `meta` once `useReactFlow()` is available:

```tsx
// graph-canvas.tsx
function CanvasInner() {
    const ctx = use(GraphContext)!
    const { state, actions } = ctx
    const { setCenter, getNode } = useReactFlow()

    function panToNode(id: string) {
        const node = getNode(id)
        if (!node) return
        const w = node.measured?.width ?? 220
        const h = node.measured?.height ?? 120
        setCenter(node.position.x + w / 2, node.position.y + h / 2,
            { duration: 400, zoom: 1.2 })
    }

    // expose to consumers via meta — done in <GraphProvider meta={...}> wrap below
    function onNodeClick(_: React.MouseEvent, node: ReactFlowNode) {
        actions.select(node.id)
        panToNode(node.id)
    }
    /* ... */
}
```

The cleanest pattern: nest a second `GraphProvider` (with `meta={{ panToNode }}`) inside `CanvasInner`, since `panToNode` requires `useReactFlow()`. Sidebar code that calls `select` and wants to pan can read `meta.panToNode` from the context:

```tsx
// entity-inspector.tsx — incoming/outgoing buttons
const { actions, meta } = use(GraphContext)!
function go(id: string) {
    actions.select(id)
    meta.panToNode?.(id)
}
```

Delete the `useEffect` block at `graph-canvas.tsx:41-51`.

### 2.7 Refactor `EntityInspector` into a compound component

**Rule:** `architecture-compound-components` (MEDIUM).
**Files:** `components/sidebar/entity-inspector.tsx` (rewritten), new file `components/sidebar/entity-inspector-context.tsx`.

**Step A — internal context for the inspector:**

```tsx
// components/sidebar/entity-inspector-context.tsx
"use client"
import { createContext, useMemo, type ReactNode } from "react"
import { use } from "react"
import { GraphContext } from "@/store/graph-context"
import type { Entity } from "@/types/entity"

interface IncomingRelationship {
    fromEntity: Entity
    name: string
    cardinality: "one" | "many"
}

interface InspectorContextValue {
    entity: Entity
    byShortName: Map<string, Entity>
    incoming: IncomingRelationship[]
}

const InspectorContext = createContext<InspectorContextValue | null>(null)

export function useInspector() {
    const ctx = use(InspectorContext)
    if (!ctx) throw new Error("Inspector subcomponent used outside <EntityInspector>")
    return ctx
}

export function InspectorProvider({
    entity,
    children,
}: { entity: Entity; children: ReactNode }) {
    const { state } = use(GraphContext)!
    const byShortName = useMemo(
        () => new Map(state.entities.map((e) => [e.name, e] as const)),
        [state.entities]
    )
    const incoming = useMemo<IncomingRelationship[]>(() => {
        const acc: IncomingRelationship[] = []
        for (const other of state.entities) {
            if (other.id === entity.id) continue
            for (const rel of other.relationships) {
                if (rel.target === entity.name) {
                    acc.push({
                        fromEntity: other,
                        name: rel.name,
                        cardinality: rel.cardinality,
                    })
                }
            }
        }
        return acc
    }, [state.entities, entity])

    const value = useMemo(
        () => ({ entity, byShortName, incoming }),
        [entity, byShortName, incoming]
    )
    return <InspectorContext value={value}>{children}</InspectorContext>
}
```

This dissolves the duplicated `collectIncoming` from `AISummary` (audit finding #13). `AISummary` reads `incoming` from `useInspector()` instead.

**Step B — compound API:**

```tsx
// components/sidebar/entity-inspector.tsx
"use client"
import { use } from "react"
import { GraphContext } from "@/store/graph-context"
import { InspectorProvider, useInspector } from "./entity-inspector-context"
/* ... */

export function EntityInspector() {
    const { state } = use(GraphContext)!
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

EntityInspector.Header = function Header() {
    const { entity } = useInspector()
    return (/* current header JSX, lines 63-72 */)
}

EntityInspector.Summary = function Summary() {
    const { entity } = useInspector()
    return <AISummary entity={entity} />
}

EntityInspector.Properties = function Properties() { /* lines 78-123 */ }
EntityInspector.Outgoing   = function Outgoing()   { /* lines 127-170, using meta.panToNode */ }
EntityInspector.Incoming   = function Incoming()   { /* lines 172-210, using meta.panToNode */ }
```

Now adding a "Mobile inspector" view (per CLAUDE.md's dialog-to-drawer rule) is a matter of composing a different subset/ordering of the same primitives.

### 2.8 (Optional) Compound `Sidebar` tabs

**Rule:** `architecture-compound-components` (LOW-MEDIUM, deferrable).

Lower priority — current `Sidebar` is 30 lines and works. The audit flagged it because adding a 3rd tab today requires touching the store enum + two arrays in `sidebar.tsx`. If a 3rd tab is on the roadmap, refactor at that time:

```tsx
<Sidebar>
    <Sidebar.Tab value="entities" label="Entities">
        <SearchPanel />
        <EntityList />
    </Sidebar.Tab>
    <Sidebar.Tab value="details" label="Details">
        <EntityInspector />
    </Sidebar.Tab>
</Sidebar>
```

Defer unless a 3rd tab is being added in the same PR.

### PR 2 verification checklist

- [ ] `pnpm typecheck` — passes.
- [ ] `pnpm lint` — passes.
- [ ] `pnpm build` — succeeds.
- [ ] Grep `rg "useGraphStore" components/` returns no hits outside `store/graph-provider.tsx`.
- [ ] Manual: full happy path — paste EDMX → parse → see graph → click node → inspector populates → AI summary works → toolbar Mermaid/JSON works → reset works.
- [ ] Manual: select entity from sidebar (outgoing/incoming buttons) → graph pans to it.
- [ ] Manual: select node by clicking on canvas → graph pans to it.
- [ ] Manual: refresh during an in-flight `requestSummary` — status survives if appropriate (or resets cleanly; either is acceptable, but should not error).
- [ ] `collectIncoming` defined exactly once (in `entity-inspector-context.tsx`).
- [ ] No `forwardRef` introduced; no `useContext` introduced (use `use(Context)`).

---

## Deliberately out of scope (low-impact nits)

The audit surfaced several lower-impact items not worth dedicated PRs. Capture as follow-ups; bundle opportunistically.

- **`bundle-dynamic-imports`** — lazy-load `utils/mermaid` inside `actions.exportMermaid()` via dynamic `import()`. Marginal saving.
- **`bundle-preload`** — preload `GraphCanvas` chunk on hover of `XmlEditor`'s Parse button (depends on PR 1.1). Worth doing once 1.1 lands.
- **`js-hoist-regexp`** — `utils/mermaid.ts:4, 8`: move RegExp creation to module scope.
- **`js-combine-iterations` / `js-flatmap-filter`** — `parser/edmx-parser.ts:71-100`: collapse `.map().filter()` chains.
- **`rerender-use-deferred-value` / `rerender-transitions`** — `components/sidebar/search-panel.tsx`, `components/sidebar/entity-list.tsx`: deferred value for large-schema typing responsiveness.
- **`rendering-conditional-render`** — multiple `cond && <jsx />` callsites with non-numeric guards. Convert to ternaries opportunistically.

## Doc fixes (separate, trivial)

- `README.md` and `IMPLEMENTATION_PLAN.md` mention Monaco; the editor is actually a plain `<Textarea>` (`components/editor/xml-editor.tsx`). Either remove the Monaco mention or restore the Monaco plan. Worth a single-commit fix once a decision is made.
- If `summaries` is intentionally not persisted (per current `partialize` in `store/graph-store.ts`), document that decision in `IMPLEMENTATION_PLAN.md`. If unintentional, persist it as part of PR 1.3.
