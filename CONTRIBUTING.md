# Contributing & Development Notes

This file contains the long-form development notes, architecture guidance, and contributor guidelines for IRS — Intelligence & Research Systems.

Summary
- Browser-first product laboratory and tooling platform for transforming software capabilities into focused standalone products.
- Lovable-generated foundation (TanStack Start + Vite) with file-based routing and an interactive systems graph architecture.
- Keep the main branch stable; avoid rewriting published git history because the project syncs with Lovable.

Features
- Browser-first UI with interactive system graph and product laboratory concepts.
- Codebase intake flows: GitHub/GitLab URL, ZIP upload, local folder (architectural placeholders).
- Reusable graph model and renderer (prepared for GPU/canvas-based rendering).
- File-based routes (TanStack Start file routing).
- Clean error pages and server-side error normalization.
- Prepared architecture for later payment/verification (disabled by default).

Stack & Notable Dependencies
- TypeScript (primary)
- React 19, TanStack Start, Vite
- @tanstack/react-router, @tanstack/react-query
- Radix UI, Tailwind CSS, Lucide, Recharts
- zod, react-hook-form

Repository layout (top-level)
- .lovable/               — Lovable project config
- public/                 — Static assets (favicon, images)
- src/
  - components/           — Reusable UI components
  - hooks/                — Custom React hooks
  - lib/                  — Utilities (error capture, lovable reporting, etc.)
  - routes/               — File-based routes (each .tsx => route)
  - routeTree.gen.ts      — Auto-generated route tree (do not edit)
  - router.tsx            — Router setup and small helpers
  - server.ts             — Cloudflare worker / SSR entry (server fetch handler)
  - start.ts              — TanStack Start instance + middleware
  - styles.css            — Global styles / Tailwind utilities
- package.json
- tsconfig.json
- vite.config.ts

Important files to inspect
- src/routes/__root.tsx — app shell, error + notFound pages, <Outlet /> for nested routes
- src/start.ts — request middleware (error handling, CSRF filter)
- src/server.ts — SSR/server fetch handler and error normalization
- src/routeTree.gen.ts — generated routing tree; do not edit
- src/styles.css — global styles and Tailwind base

How it fits together
- Client app uses file-based routes from TanStack Start. __root.tsx sets up providers (QueryClient).
- start.ts registers request middleware (error capture + CSRF filter).
- server.ts imports the server entry at runtime and normalizes catastrophic SSR responses so users see a friendly error page.

How to run (development)
Prereqs: Node >= 18, npm (or bun)
Dev:
```bash
git clone https://github.com/casey-arch0/irs-intelligence-research-systems.git
cd irs-intelligence-research-systems
npm install
npm run dev
```

Build:
```bash
npm run build
npm run preview
```

Scripts
- dev — vite dev
- build — vite build
- build:dev — vite build --mode development
- preview — vite preview
- lint — eslint .
- format — prettier --write .

Development conventions & guidance
- File-based routing: every .tsx under src/routes defines a route. Follow conventions in src/routes/README.md.
- Generated code: do not edit routeTree.gen.ts
- Error handling: SSR normalization in server.ts and error middleware in start.ts ensure friendly pages and server protection.
- Modular architecture: separate presentation, graph rendering, and code analysis.
- Monetization & accounts: intentionally disabled for now; add clean abstractions only.

Graph & visualization guidance
- The interactive systems graph is first-class: design for large datasets with progressive loading, clustering, GPU/canvas rendering, lazy expansion, and level-of-detail rendering.
- Support graph modes: dependency, causality, architecture, activity, timeline, impact.
- Keep graph generation separate from rendering so visualization engine is reusable.

Security & privacy
- Treat uploaded code as sensitive.
- Prefer local processing and minimal data transmission.
- Avoid storing uploaded source code unless absolutely needed and authorized.

Testing & CI
- Use npm run lint and npm run format locally.
- No CI workflow included by default; add a CI pipeline carefully to preserve Lovable sync.

Contributing
- Keep changes small, focused, and well documented.
- Avoid force-pushing to branches that sync with Lovable.
- For features tied to monetization, add internal abstractions but keep any payment UI disabled.
- Open issues for bugs or feature requests and reference relevant files/paths.

License
- This repository is licensed under the MIT License (see LICENSE).

Acknowledgements
- Lovable, TanStack Start, Radix UI, Tailwind CSS, Lucide, Recharts, zod.

Ask me about:
- Where the interactive graph renderer should live (lib/graph vs components/graph).
- How to wire a specific codebase intake flow (GitHub URL vs ZIP vs local).
- Which routes to add for product pages and where to put product metadata.
