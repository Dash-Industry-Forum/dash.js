# Phase 4 — Extras (optional)

Only if Phases 1–3 are done and stable.

## CMCD signaling

- **Goal:** tell the server or CDN about client SR capability and its current level, so the origin could offer
  SR-optimized ladders.
- **Steps:** `streaming.cmcd` has no custom-key setting. Use `player.addRequestInterceptor()`
  (`src/streaming/mediaplayer/CustomParametersApi.js`) to append a custom key (for example `com.svta-sr` =
  `full|light|off`) to the `CMCD` query parameter of segment requests.
- **Exit criterion:** the key appears on segment requests and changes with the level.

## Savings panel

- **Goal:** turn the trade-off into numbers for the pitch.
- **Steps:** show bytes saved per minute (from Phase 2), time spent at each SR level (from Phase 3) and average
  ms/frame.
- **Exit criterion:** the numbers update live during the demo script.

## Open questions

- Is an energy estimate (kWh) honest enough to show? There's no direct power API in browsers. Prefer bytes saved
  and time per level, and only label kWh as an estimate if it appears at all.
