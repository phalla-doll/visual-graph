# XML Visual Graph — Implementation Plan

A staged plan to build the app described in `README.md` on top of the current Next.js 16 + React 19 + shadcn scaffold.

---

## 0. Ground rules

- **Next.js 16 caveat.** `AGENTS.md` warns this version has breaking changes vs. training data. Before writing any server/client boundary code, dynamic API usage, or route handlers, skim the relevant page in `node_modules/next/dist/docs/`.
- **Flat layout, not `src/`.** README shows a `src/` tree, but the repo lives at the root (`app/`, `components/`, `lib/`, `hooks/`). Follow the existing layout. New folders go at the root: `parser/`, `store/`, `types/`, `utils/`.
- **Frontend-only.** No backend, no API routes. All parsing and state is client-side.
- **Client components.** Anything that uses Zustand, Monaco, React Flow, or event handlers needs `"use client"`.
- **shadcn config.** Style `radix-vega`, base color `olive`, icons `remixicon`. Add primitives via `pnpm dlx shadcn@latest add <name>` so they match.
- **No premature abstraction.** Build the MVP vertical slice first (paste → parse → render). Refactor only when a second use case proves the abstraction.

---

## 1. Dependencies

Install in one batch:

```bash
pnpm add reactflow dagre fast-xml-parser zustand zod sonner lucide-react
pnpm add -D @types/dagre
```

Defer until needed:
- `@monaco-editor/react` — only when we replace the plain `<textarea>` paste box. A textarea is enough for the MVP.

shadcn primitives to add as we go (each via `pnpm dlx shadcn@latest add ...`):
- Phase 1: `input`, `textarea`, `card`, `separator`, `scroll-area`
- Phase 2: `dialog`, `sheet`, `tabs`, `tooltip`, `badge`, `sonner`

---

## 2. Directory layout (target)

```
app/
  page.tsx               # workspace entry (paste view → graph view)
  layout.tsx             # already done
components/
  ui/                    # shadcn primitives
  editor/
    xml-editor.tsx
  graph/
    graph-canvas.tsx
    entity-node.tsx
    relationship-edge.tsx
  sidebar/
    entity-list.tsx
    search-panel.tsx
    entity-inspector.tsx
  toolbar/
    toolbar.tsx
parser/
  xml-parser.ts
  edmx-parser.ts
  graph-builder.ts
store/
  graph-store.ts
types/
  entity.ts
  graph.ts
utils/
  dagre-layout.ts
  cardinality.ts
  mermaid.ts             # Phase 2
lib/
  utils.ts               # cn(), already there
```

---

## 3. Phase 1 — MVP (paste → parse → render → search)

Goal: paste EDMX, click Parse, see an auto-laid-out interactive graph with a searchable entity list.

### 3.1 Types (`types/entity.ts`, `types/graph.ts`)

```ts
// types/entity.ts
export type Cardinality = "one" | "many";

export interface EntityProperty {
  name: string;
  type: string;        // e.g. "Edm.String", "Edm.Int32"
  nullable: boolean;
  isKey: boolean;
}

export interface Relationship {
  name: string;        // NavigationProperty Name
  target: string;      // referenced EntityType name (Collection() stripped)
  cardinality: Cardinality;
}

export interface Entity {
  id: string;          // namespace-qualified name, used as node id
  name: string;        // short name
  namespace?: string;
  properties: EntityProperty[];
  relationships: Relationship[];
}
```

```ts
// types/graph.ts
import type { EntityProperty } from "./entity";

export interface GraphNode {
  id: string;
  label: string;
  properties: EntityProperty[];
}

export interface GraphEdge {
  id: string;          // `${source}->${target}:${name}`
  source: string;
  target: string;
  label: string;       // navigation property name
  cardinality: "one" | "many";
}

export interface ParsedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

### 3.2 XML → JSON (`parser/xml-parser.ts`)

Thin wrapper around `fast-xml-parser` with consistent options:

```ts
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: false,   // keep "true"/"false" as strings; we coerce in edmx-parser
  trimValues: true,
});

export function parseXml(xml: string): unknown {
  return parser.parse(xml);
}

export class XmlParseError extends Error {}
```

Wrap in try/catch at the call site; throw `XmlParseError` with the original message.

### 3.3 EDMX → Entities (`parser/edmx-parser.ts`)

Targets the standard EDMX shape:

```
edmx:Edmx
  edmx:DataServices
    Schema (Namespace=...)
      EntityType (Name=...)
        Key/PropertyRef
        Property (Name, Type, Nullable)
        NavigationProperty (Name, Type)
```

Public API:

```ts
export function extractEntities(parsed: unknown): Entity[];
```

Logic:
1. Walk to `edmx:Edmx → edmx:DataServices → Schema` (Schema may be one object or array).
2. For each `Schema`, capture `@_Namespace`.
3. For each `EntityType` under the schema:
   - `name = @_Name`
   - `id = namespace ? `${namespace}.${name}` : name`
   - Build a `Set<string>` of key property names from `Key.PropertyRef` (array-or-object).
   - Properties: map `Property[]` → `{ name, type, nullable, isKey }`. Default `nullable` to `true` when absent (EDMX default). Coerce `"true"/"false"` to boolean.
   - Relationships: map `NavigationProperty[]` →
     - `name = @_Name`
     - `rawType = @_Type` (e.g. `Collection(MyNs.Box)` or `MyNs.Shipment`)
     - Use `utils/cardinality.ts:parseTypeRef(rawType)` → `{ target, cardinality }`. `target` should be the short name (last `.`-separated segment) — we'll resolve by short name across the schema since references typically use the namespace prefix.
4. Return a flat `Entity[]` across all schemas.

Edge cases to handle from day one:
- `Schema`, `EntityType`, `Property`, `NavigationProperty` may each be a single object OR an array. Normalize with a `toArray<T>(v): T[]` helper.
- Empty `EntityType` (no properties or no navs).
- Missing `edmx:DataServices` — return `[]` and let UI surface the empty result.
- Unknown root — throw `EdmxParseError` with a helpful message ("No <Schema> found — is this EDMX?").

### 3.4 Cardinality (`utils/cardinality.ts`)

```ts
const COLLECTION_RE = /^Collection\((.+)\)$/;

export function parseTypeRef(typeRef: string): { target: string; cardinality: "one" | "many" } {
  const match = COLLECTION_RE.exec(typeRef.trim());
  const inner = match ? match[1] : typeRef;
  const short = inner.split(".").pop() ?? inner;
  return { target: short, cardinality: match ? "many" : "one" };
}
```

### 3.5 Graph builder (`parser/graph-builder.ts`)

```ts
export function buildGraph(entities: Entity[]): ParsedGraph;
```

- Build a `Map<shortName, Entity>` for resolution.
- Nodes: one per entity. `id = entity.id`, `label = entity.name`, `properties = entity.properties`.
- Edges: for each entity, for each relationship — resolve `target` short name → target entity id. **Skip** edges whose target is missing (and warn via `console.warn` for now; we'll add a "missing references" panel later).

### 3.6 Dagre layout (`utils/dagre-layout.ts`)

```ts
import dagre from "dagre";

const NODE_WIDTH = 240;
const NODE_HEIGHT_BASE = 60;
const ROW_HEIGHT = 18;

export function layoutGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  direction: "LR" | "TB" = "LR",
): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] };
```

- Use `direction` as `rankdir`.
- Height per node = `NODE_HEIGHT_BASE + node.properties.length * ROW_HEIGHT`, capped (we'll add scroll inside the node card if needed in a follow-up).
- Return React Flow shapes: `{ id, position: { x, y }, data: { label, properties }, type: "entity" }` and `{ id, source, target, label, type: "relationship", data: { cardinality } }`.

### 3.7 Zustand store (`store/graph-store.ts`)

```ts
interface GraphStore {
  xml: string;
  entities: Entity[];
  graph: ParsedGraph;
  selectedEntityId: string | null;
  search: string;
  parseError: string | null;

  setXml(xml: string): void;
  parse(): void;                       // xml → entities → graph
  select(id: string | null): void;
  setSearch(q: string): void;
  reset(): void;
}
```

- `parse()`: catch parse errors, set `parseError` instead of throwing.
- Keep `entities` and `graph` separate so the inspector can read structured data and the canvas can read layout-ready data.

### 3.8 Components

`components/editor/xml-editor.tsx` (client component)
- Plain `<Textarea>` (shadcn) + "Parse" `<Button>` + "Upload .xml/.edmx" hidden file input triggered by a `<Button>`.
- On upload, read file via `FileReader.readAsText()`, call `setXml`.
- Show `parseError` below the textarea in destructive color.

`components/graph/entity-node.tsx` (client)
- React Flow custom node. Header = entity name, body = property list. Keys get a small badge.
- Highlight when `selectedEntityId === id`.

`components/graph/relationship-edge.tsx` (client)
- Custom edge that renders the nav-prop name as a label and uses different marker ends for `one` vs. `many` (e.g., crow's foot for `many`, single bar for `one`). Start with a simple text label and arrowhead; iterate later.

`components/graph/graph-canvas.tsx` (client)
- Hosts `<ReactFlow>` with `nodeTypes={{ entity: EntityNode }}`, `edgeTypes={{ relationship: RelationshipEdge }}`.
- Reads layouted nodes/edges from the store (or computes them with `useMemo` from `graph`).
- On node click → `select(id)`.
- Includes `<Background>`, `<Controls>`, `<MiniMap>`.

`components/sidebar/search-panel.tsx` (client)
- `<Input>` bound to store's `search`.
- Filtered list of entities; click → `select(id)` and pan/zoom to the node (use the React Flow `fitView`/`setCenter` API via a ref).

`components/sidebar/entity-list.tsx` (client)
- Full alphabetical list when search is empty; otherwise filtered.

### 3.9 Wiring `app/page.tsx`

Replace the placeholder with:

```tsx
"use client";

export default function Page() {
  // empty state when no graph → show <XmlEditor /> centered
  // populated state → two-pane layout: <Sidebar /> | <GraphCanvas />
  // header with "Reset" and (later) "Export" buttons
}
```

Branch on `entities.length === 0` from the store.

### 3.10 Phase 1 acceptance

- Paste a small EDMX sample → see entity nodes connected by labeled edges.
- Search box filters the left list.
- Clicking a sidebar entry highlights and centers its node.
- Clicking a node highlights the matching sidebar entry.
- Reset clears state and shows the paste view again.

### 3.11 Verification

- `pnpm typecheck && pnpm lint`.
- Manually load the dev server (`pnpm dev`), paste a known sample, confirm the round trip in the browser. Per project rules, UI work isn't "done" until exercised in a browser.

---

## 4. Phase 2 — Inspector, export, polish

### 4.1 Entity inspector (`components/sidebar/entity-inspector.tsx`)
- Show selected entity: properties table (name / type / nullable / key badge) and relationships grouped by Incoming vs. Outgoing.
- Outgoing = `entity.relationships`. Incoming = scan all entities for relationships pointing to this entity's short name.
- Renders inside a shadcn `<Tabs>` panel alongside the entity list, or in a right-hand `<Sheet>`.

### 4.2 Mermaid export (`utils/mermaid.ts`)

```ts
export function toMermaidER(graph: ParsedGraph, entities: Entity[]): string;
```

- Header: `erDiagram`.
- For each edge, emit `Source CARD--CARD Target : label`, mapping `one`→`||`, `many`→`o{` on the target side.
- Add a "Copy" button in the toolbar; use `navigator.clipboard.writeText` and toast via `sonner`.

### 4.3 JSON export
- Toolbar button → trigger download of `JSON.stringify({ nodes, edges }, null, 2)` as a blob.

### 4.4 Layout direction toggle
- Toolbar switch for LR / TB; re-run dagre layout on toggle.

### 4.5 Toolbar (`components/toolbar/toolbar.tsx`)
- Fit View, Re-layout, Layout direction, Export Mermaid, Export JSON, Reset.
- Live above the canvas.

---

## 5. Phase 3+ — Stretch (per README roadmap)

Tackle only when Phase 1 + 2 are stable.

- **Monaco editor** swap for the paste textarea (large file ergonomics, syntax highlighting).
- **Multiple files** — accept multiple uploads and merge entity sets across namespaces.
- **AI summaries** — wire up the Claude API for entity descriptions. Use the `claude-api` skill in this workspace and include prompt caching by default.
- **Persistence** — localStorage first (XML + selection), IndexedDB only if we hit quota.
- **Graph snapshots** — diffable JSON exports.
- **Schema diffing** — side-by-side compare two EDMX inputs.

---

## 6. Risks & open questions

- **Cross-schema references.** Resolving navigation targets by short name is fine for single-schema EDMX but loses information when two schemas declare the same short name. We may need fully-qualified resolution later.
- **`Collection(...)` vs. `Multiplicity`.** Older OData V3 EDMX uses `<Association>` + `Multiplicity="*"` rather than `Collection(...)`. Out of scope for MVP; document the limitation in the empty-state.
- **Function/Action imports, ComplexTypes, EnumTypes.** Ignored in MVP; consider as a Phase 3 visualization layer.
- **Very large schemas** (thousands of entities). React Flow + Dagre should handle hundreds easily; for thousands we may need viewport culling or clustering. Defer until we see a real failure case.
- **Self-referencing entities and duplicate edges** (same nav name twice). Dedupe edge ids by `${source}->${target}:${name}` and let React Flow handle self-loops natively.

---

## 7. First-PR slice (recommended starting cut)

Smallest end-to-end change that produces a visible result:

1. Install deps (section 1, minus Monaco).
2. Add `types/entity.ts`, `types/graph.ts`.
3. Add `parser/xml-parser.ts`, `utils/cardinality.ts`, `parser/edmx-parser.ts`, `parser/graph-builder.ts`.
4. Add `utils/dagre-layout.ts`.
5. Add `store/graph-store.ts`.
6. Add `components/editor/xml-editor.tsx` (plain textarea) and a minimal `components/graph/graph-canvas.tsx` using default React Flow node/edge types.
7. Rewrite `app/page.tsx` to branch between editor and canvas.

Skip custom node/edge styling, search, sidebar, inspector, exports — all of that comes in subsequent PRs once the data path is proven.
