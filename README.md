# Civic Tech Montreal Theory of Change Canvas

Interactive, local-first Theory of Change canvas transcribed from the Civic Tech Montreal FigJam workshop.

## Open the canvas

Double-click the standalone build:

`/Users/sdawka/Desktop/civic-tech-montreal-theory-of-change-canvas.html`

## Development

```bash
npm install
npm run dev
npm run check
```

`npm run build` produces a self-contained `dist/index.html` through `vite-plugin-singlefile`.

## Deployment

Run `npm run deploy` to build and publish to the `ctm` Cloudflare Worker (Cloudflare requires lowercase names).
Run `npm run deploy:check` to build and validate deployment without publishing.
The Worker serves static assets using [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/get-started/).

## Architecture

- `src/domain/models.ts` — domain entities and invariants:
  - `Contributor`
  - `Stage`
  - `TheoryNote`
  - `CausalConnection`
  - `TheoryOfChangeCanvas`
- `src/stores/canvas-store.ts` — Nanostores-backed application state, persistence, and domain actions.
- `src/data/seed.ts` — 63 workshop notes and 49 initial causal claims.
- `src/ui/connection-geometry.ts` — pure SVG Bézier path calculation.
- `src/main.ts` — DOM rendering and interaction wiring.

Connections are domain-validated: they must point from an earlier causal stage to a later one. User additions, contributor identities, edits, moves, and new links persist in browser `localStorage`.

Selecting a note brings its upstream and downstream flow above the columns. Use **Direct links** for immediate relations only. In the inspector, **Cause** and **Effect** visit a relation's endpoints; **Edit relation** changes its label or endpoints, or removes it. Invalid edits leave the saved graph unchanged.

Shift-click cards (or enable **Select multiple**) to inspect the causal statement connecting them, including intermediate notes. Cards use CSS masonry columns with natural heights.
