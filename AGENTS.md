<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

This file provides guidance to any coding agent when working with code in this repository.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`, `pnpm-workspace.yaml`).

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — serve production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — ESLint (config in `eslint.config.mjs`, extends `eslint-config-next`)
- `pnpm format` — Prettier write across `**/*.{ts,tsx}` (Tailwind class sorting via `prettier-plugin-tailwindcss`)

Add shadcn primitives with `pnpm dlx shadcn@latest add <name>` — settings in `components.json` (style `radix-vega`, base color `olive`, icon library `remixicon`) must be preserved across additions.

## UI conventions

- **Prefer shadcn primitives over hand-rolled UI.** When something needs a button, dialog, input, badge, etc., reach for the shadcn component first (or add it via `pnpm dlx shadcn@latest add <name>`). Don't reinvent these with raw elements + Tailwind.
- **Don't restyle shadcn components with extra `className`s unless explicitly asked.** Use the component's built-in variants/props as designed. Layout classes on the *parent* (spacing, grid placement) are fine; visual overrides on the component itself (colors, borders, padding, sizing) are not — they fight the design system and drift across the app.
- **Dialog → Drawer on small screens.** Every `Dialog` usage should switch to `Drawer` at small breakpoints (mobile). Pattern: branch on a `useMediaQuery`-style hook (e.g. `(min-width: 768px)`) and render `Dialog` above, `Drawer` below, sharing the same content. Do this from the start — don't ship a `Dialog`-only screen and retrofit later.

No test runner is configured.

## Architecture

This is a **client-heavy Next.js 16 / React 19 app** that parses XML / EDMX / OData schemas in the browser and renders entities + relationships as an interactive graph. There is **one** server-side surface: `app/api/summarize/route.ts`, which proxies entity context to NVIDIA's stepfun model for AI-generated entity summaries (keeps the API key out of the browser bundle). Everything else — parsing, layout, rendering, exports, persistence — runs in the browser.

### Server env

- `NVIDIA_API_KEY` — required by `/api/summarize`. Without it the route returns HTTP 503 and the inspector's "Summarize" button surfaces a friendly error. Set it in `.env.local` for dev; no other env vars are read at runtime.

### Critical: Next.js version

`AGENTS.md` flags that this Next.js 16 release has **breaking changes vs. training data** for APIs, conventions, and file structure. Before writing server/client boundary code, dynamic API usage, or route handlers, consult `node_modules/next/dist/docs/` rather than relying on prior knowledge.

### Layout — flat root, not `src/`

The README's project tree shows a `src/` directory, but the actual repo uses the **flat layout** Next.js scaffolds by default: `app/`, `components/`, `lib/`, `hooks/` live at the repo root. New feature folders (`parser/`, `store/`, `types/`, `utils/`) should also be added at the root. The path alias `@/*` resolves from the repo root (`tsconfig.json`).

### Planned data flow (per IMPLEMENTATION_PLAN.md)

```
XML text → fast-xml-parser → EDMX walker (Schema/EntityType/NavigationProperty)
         → Entity[]      → graph-builder → ParsedGraph (nodes + edges)
         → Dagre layout  → React Flow render
```

State lives in a single Zustand store (`store/graph-store.ts`) keyed by `xml`, `entities`, `graph`, `selectedEntityId`, `search`, `parseError`. The store's `parse()` action captures errors into `parseError` instead of throwing so the UI can surface them.

Cardinality is derived from the NavigationProperty `Type` attribute: `Collection(X)` → `many`, anything else → `one`. Targets are resolved by **short name** (last `.`-separated segment) — fine for single-schema EDMX, but lossy across schemas; this is a known limitation.

### Client components

Anything using Zustand, React Flow, Monaco, or browser event handlers needs `"use client"`. Theme provider already lives in `components/theme-provider.tsx` and wraps the app in `app/layout.tsx`.

### shadcn / styling

- Tailwind v4 (PostCSS plugin in `postcss.config.mjs`); CSS variables and theme tokens live in `app/globals.css`.
- Component aliases: `@/components/ui` for primitives, `@/lib/utils` for `cn()`, `@/components`, `@/lib`, `@/hooks`.

## Sources of truth

- `README.md` — product spec (target users, screens, data models, roadmap).
- `IMPLEMENTATION_PLAN.md` — phased build plan with exact types, file paths, and parsing strategy. Treat this as the spec for *how* to build features until code exists.
- `AGENTS.md` — Next.js 16 caveat (read this before touching framework APIs).
