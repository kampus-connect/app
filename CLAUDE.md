# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build production Node.js server to ./dist
npm run preview    # Run the production build locally
npm start          # Start built server (node --enable-source-maps ./dist/index.mjs)
```

There is no lint or test command configured.

## Architecture

This is a **Marko 6 + @marko/run** full-stack web application with file-based routing and SSR.

### Routing

Routes live under `src/routes/` and follow @marko/run conventions:
- `+page.marko` — page component for that URL segment
- `+layout.marko` — wraps all descendant routes (root layout is `src/routes/+layout.marko`)
- `+meta.json` — page metadata (e.g. `pageTitle`)
- Subdirectories become URL path segments (e.g. `src/routes/about/+page.marko` → `/about`)

### Components

Reusable components live in `src/tags/` and are auto-imported by Marko — no explicit import needed. Use `<component-name/>` syntax in `.marko` files.

### Page title

The root layout reads `$global.meta.pageTitle` for the `<title>` tag. Set it via `+meta.json` in the route directory.

### TypeScript

Strict mode is enabled (`strict: true`, `noUnusedLocals`, `verbatimModuleSyntax`). The `.marko-run/routes.d.ts` file is auto-generated — do not edit it manually.
