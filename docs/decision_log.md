# Decision log

- 2026-09-07T18:42:34-04:00 — Create a Git repository for the app and deploy it to a Cloudflare Worker named `CTM`.
- 2026-09-07T20:26:46-04:00 — Fix wasted upper layout space, selected-note detail visibility, and stage-header behavior while scrolling; use narrowly scoped agents as needed.
- 2026-09-07T20:37:32-04:00 — Merge the completed changes and deploy them.
- 2026-09-07T21:26:39-04:00 — Reconsider the canvas layout from first principles: column headers still behave incorrectly during vertical scrolling, and the overall canvas header wastes space.
- 2026-09-07T21:34:43-04:00 — Review the header simplification, then merge and deploy it.
- 2026-09-07T21:46:41-04:00 — Bring selected causal edges temporarily above columns, show the full flow, and provide controls for changing relations; translucent or dashed edges are acceptable.
- 2026-09-07T22:10:10-04:00 — Make sidebar text smaller and easier to scan; show the logical statement when multiple cards in a flow are selected. Use masonry to avoid blank space in notes, implemented efficiently with CSS.
- 2026-09-07T22:21:41-04:00 — Review and merge the pending flow, sidebar, and masonry changes.
- 2026-09-07T22:28:37-04:00 — Make sdawka/ctm public, including its Git history.
