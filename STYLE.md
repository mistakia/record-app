# Record Design System

## Aesthetic: Paper and Phosphor

A quiet, keyboard-first music library with a glowing screen for what is playing. Two materials share one window:

- **Paper** — the warm, calm surface of the library and everything that manages it. Whitespace, hairlines, monospace ink, and content that unfolds only when asked for. This is the "feng shui" of base: a clean room where every capability is reachable but nothing is shouting.
- **Phosphor** — a small monochrome CRT screen for live things: the player, the queue, ingest progress, diagnostics. Near-black glass, one glowing vermilion, scanlines.

The lineage is record's first Electron app (`legacy-v0`, 0.1.0-alpha). Its layout and its functionality are kept — the library sidebar, the page head with the library profile, the bottom player with "playing from", the queue overlay, rows whose index turns into a play button, clickable tag chips, the vermilion `#FF492F` accent — and restated in base's typography and its paper and CRT idioms.

## Core Principles

- **Calm at rest** — a resting screen shows titles, artists, durations, and little else. Actions, identifiers, and detail appear on hover, focus, selection, or expansion.
- **Everything reachable** — progressive disclosure hides, it never removes. Every capability in spec chapter 8 is one keystroke, one hover, or one disclosure away.
- **Keyboard first** — every action has a key, the cursor is always visible, and the mouse is a peer, not the primary.
- **Monospace first** — Commit Mono everywhere, Departure Mono for large display type only. Base's type system, unchanged.
- **One accent, used on interaction** — record vermilion appears where the user acts or where sound is playing, never as decoration.
- **Two materials, never mixed in one region** — a region is paper or a screen. Phosphor never leaks onto paper, paper colors never appear inside a screen.
- **Square and flat** — square interactive corners, 1px hairlines for depth, shadow only for overlays.
- **Themeable by construction** — components read role tokens, never palette values, so a new theme is a token map, not a restyle.

## Crispness Principles

Inherited from base `STYLE.md` and binding here:

- **Flat depth** — background shifts and 1px borders make layers. No box-shadow for elevation; shadows only on overlays (dialog, context menu, toast) and focus rings.
- **Hairline borders** — 1px solid `--color-border` or `--color-border-light`.
- **Two-speed transitions** — 0.15s for color and opacity, 0.28s for geometry (panels, slide-ins).
- **No side stripes** — never mark a row, card, banner, or toast with a thick or colored border on one edge. Carry state with a word, a glyph, or text color. A 1px neutral edge is allowed only as the boundary between two panes (sidebar, inspector).
- **Interaction-only accent** — resting state is neutral. The playing track is the one standing exception: it is live state, and it glows.

## Token Architecture

```
src/renderer/styles/
  fonts.css        @font-face for the bundled faces
  palette.css      primitives: paper, ink, breadcrumb, vermilion, glass (no consumer reads these)
  themes.css       role tokens per theme: :root[data-theme='paper'], and the .screen scope
  base.css         element defaults: body type, focus ring, selection, scrollbars, buttons, inputs
  screen.css       CRT glass: scanline mesh, vignette, flicker, glow utilities
  keyframes.css    crt-flicker, crt-pulse
  global.css       imports the above in order; nothing else
src/renderer/assets/fonts/
  CommitMono-VF.woff2, DepartureMono-Regular.woff2 (copied from base, OFL-1.1)
```

- **Primitives** (`--paper-*`, `--ink-*`, `--breadcrumb-*`, `--vermilion-*`, `--glass-*`) are defined once in `palette.css`.
- **Role tokens** (`--color-surface`, `--color-text`, `--color-accent`, …) are what components use. Each theme maps roles to primitives.
- **A screen is a scope, not a theme.** The `.screen` class re-maps the same role tokens to phosphor values, so a component inside the player renders as phosphor with no screen-specific CSS of its own. The pattern is base's `live-tokens` class.
- **Theme selection** is the `data-theme` attribute on `<html>`. `paper` is the only theme that ships. A later `night` theme maps the paper roles to the glass and phosphor primitives, turning the whole window into the screen, and `system` resolves to `paper` or `night` from `prefers-color-scheme`. Until then `color-scheme: light` is set, and there is no theme setting in the UI.
- CSS Modules stay per component. They reference role tokens only — a hex value, an `rgb()` literal, or a primitive token in a `.module.css` file is a defect.

### Token naming

CSS custom properties, kebab-case, by role: `--color-text-secondary`, `--space-sm`, `--font-display`, `--transition-fast`. They match base's CSS variable names where a base role exists, so a reader of either codebase reads both.

## Color Palette

### Paper theme (`data-theme='paper'`)

Warm-shifted neutrals from base iOS, so the browns of the breadcrumb sit in the same temperature as the ink.

| Role token               | Value                    | Usage                                                   |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `--color-surface`        | #f7f7f4                  | Window background, the paper                            |
| `--color-surface-sunken` | #eee2d5                  | Sidebar: base's warm chrome tone (`mix(#e8d4c1, surface, 60%)`) |
| `--color-surface-raised` | #fbfaf7                  | Overlays on paper: dialog, context menu, toast          |
| `--color-surface-hover`  | rgba(74, 53, 32, 0.06)   | Hover wash on rows and buttons (breadcrumb ink at 6%)   |
| `--color-surface-cursor` | rgba(74, 53, 32, 0.10)   | The keyboard cursor row                                 |
| `--color-text`           | #23211d                  | Primary ink                                             |
| `--color-text-secondary` | #6b6661                  | Artist, album, labels                                   |
| `--color-text-tertiary`  | #a59e94                  | Metadata, hints, disabled, uppercase section labels     |
| `--color-border`         | #d6cfc3                  | Section frames, inputs, pane boundaries                 |
| `--color-border-light`   | #ece7dd                  | Row dividers, subtle rules                              |
| `--color-paper-texture`  | rgba(150, 150, 147, 0.10) | The paper's ruled hairline texture (see Layout)        |
| `--color-selected`       | #4a3520                  | Breadcrumb: active nav item, selected rows' ink         |
| `--color-selected-bg`    | rgba(74, 53, 32, 0.12)   | Multi-selected rows                                     |
| `--color-accent`         | #ff492f                  | Record vermilion: hover ink, playing track, focus, primary button |
| `--color-accent-wash`    | rgba(255, 73, 47, 0.10)  | Accent fills: active filter chip, pressed toggle        |
| `--color-on-accent`      | #ffffff                  | Text on an accent fill                                  |
| `--color-focus-ring`     | rgba(255, 73, 47, 0.35)  | 2px focus ring                                          |

### Semantic colors (paper)

Status only, never decoration. Warning is amber, not orange, so it never reads as the vermilion accent.

| Role token        | Value   | Usage                                           |
| ----------------- | ------- | ----------------------------------------------- |
| `--color-error`   | #c8372d | Errors, destructive actions, unreachable node   |
| `--color-warning` | #b07d0a | Stale state, gated writes                       |
| `--color-success` | #2e8a4f | Connected, ingest complete                      |
| `--color-banner-error-bg`   | color-mix(in srgb, var(--color-error) 10%, var(--color-surface))   | Node-unreachable banner |
| `--color-banner-warning-bg` | color-mix(in srgb, var(--color-warning) 12%, var(--color-surface)) | Stale banner            |

### Screen scope (`.screen`)

Base's CRT terminal with record's vermilion as the phosphor. Inside a screen every foreground element — text, rules, borders, controls — is phosphor.

| Role token (re-mapped)   | Value                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `--color-surface`        | radial-gradient(130% 110% at 50% 38%, #1c0f09 0%, #120a06 46%, #0a0604 100%)           |
| `--color-text`           | #ff492f (phosphor)                                                                      |
| `--color-text-secondary` | rgba(255, 73, 47, 0.6) (phosphor dim)                                                   |
| `--color-text-tertiary`  | rgba(255, 73, 47, 0.42)                                                                 |
| `--color-border`         | rgba(255, 73, 47, 0.26) (phosphor faint)                                                |
| `--color-border-light`   | rgba(255, 73, 47, 0.14)                                                                 |
| `--color-surface-hover`  | rgba(255, 73, 47, 0.08)                                                                 |
| `--color-accent`         | #ff492f                                                                                 |
| `--color-accent-wash`    | rgba(255, 73, 47, 0.12)                                                                 |
| `--color-focus-ring`     | rgba(255, 73, 47, 0.35), drawn as a `0 0 8px` glow                                      |
| `--color-error`          | #ff492f with a `!!` prefix — a screen is monochrome; error is a word, not a hue         |

### Screen effects

All from base `client/styles/crt-terminal.styl`, as CSS:

- **Glow** — `--glow-text: -0.4px 0 rgba(0,40,255,0.26), 0.4px 0 rgba(255,0,70,0.2), 0 0 1px rgba(255,73,47,0.62), 0 0 6px rgba(255,73,47,0.22), 0 0 14px rgba(255,73,47,0.11)` on body text; `--glow-display` at roughly double strength on the now-playing title. Keep dense text at the low strength so it stays legible.
- **Scanline mesh** — horizontal `repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0 1px, transparent 1px 3px)` plus vertical at 0.14, `mix-blend-mode: multiply`, opacity 0.5, on an `aria-hidden` `.screen__glass` child that sits under the content.
- **Flicker** — `crt-flicker` 5.5s `steps(1, end)`, opacity 0.44 to 0.53. Frozen under `prefers-reduced-motion`.
- **Vignette** — `radial-gradient(120% 100% at 50% 45%, transparent 52%, rgba(0,0,0,0.6) 100%)` and `box-shadow: inset 0 0 40px rgba(0,0,0,0.6)`.
- **On-air dot** — a 0.45em phosphor circle with `0 0 8px` glow pulsing on `crt-pulse` 2s, before "playing" and live-connection labels.

A screen is small and bounded. The effects are never applied to paper, never full-window in the paper theme, and the flicker stops when the window is hidden (`document.visibilityState`), so an idle app costs nothing.

## Typography

Base's type system, bundled with the app (`src/renderer/assets/fonts/`) and served same-origin under the existing CSP `default-src 'self'`.

| Role token       | Face           | Used for                                                                                     |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------- |
| `--font-mono`    | Commit Mono VF | Everything: chrome, rows, labels, inputs, prose                                               |
| `--font-display` | Departure Mono | Large type only (18px and up): now-playing title, empty-state headlines, big numerals, screen labels |

- **Scale** — 10px (xxs, screen kickers) / 11px (xs, labels, chips, metadata) / 12px (sm, secondary rows, buttons) / 13px (base, track rows and body) / 15px (reading: about text, dialogs) / 18px (xl, page titles) / 24px (display, now-playing title, empty-state headline).
- **Weights** — 400 body, 600 emphasis, headings, the cursor row's title. Nothing else.
- **Labels and section titles** — 10–11px, uppercase, 0.5px tracking, `--color-text-tertiary`. Set apart by case and tracking, not size. Every form field's label and fieldset legend takes this one style (`NODE URL`, `NAME`, `ACTIONS`); a qualifier inside a label drops to lowercase in the same ink (`LIMIT in MB, 0 turns it off`).
- **Screen labels** — Departure Mono at 11px is allowed inside a screen only, where the glow carries it, uppercase with 1px tracking and a `// ` prefix (base's poster tell).
- **Numerals** — `font-variant-numeric: tabular-nums` on every duration, time, count, and size.
- **Truncation** — single-line cells ellipsize; the full value is in the inspector, never only in a `title` tooltip.

## Spacing

Base's 8px grid.

| Token         | Value |
| ------------- | ----- |
| `--space-xxs` | 2px   |
| `--space-xs`  | 4px   |
| `--space-sm`  | 8px   |
| `--space-base`| 16px  |
| `--space-lg`  | 24px  |
| `--space-xl`  | 32px  |
| `--space-2xl` | 48px  |
| `--space-3xl` | 64px  |

Whitespace is the primary separator. Prefer a `--space-lg` gap to a rule; use a rule only between items of one list.

## Borders, Radii, Shadows

- **Radius** — 0 on every interactive element (buttons, inputs, chips, rows). 2px on overlays. Nothing larger, with two exceptions: the vinyl disc, and the player's play and pause button, a circle so the one main action reads apart from the square controls around it.
- **Borders** — 1px, role tokens only.
- **Shadows** — `--shadow-overlay: 0 4px 12px rgba(35,33,29,0.10)` on dialogs, context menus, and toasts on paper. Screens use their inset vignette instead.

## Layout

Legacy-v0's shell, kept: a full-height sidebar, a page column with a 40px head, and a player bar under the page column only. Every region legacy had is here, in paper and phosphor.

```
┌────────────┬──────────────────────────────────────────────────────────┐
│ ‹ ›        │ page head 40px: title or profile header, [MAIN ACTION]   │
│            ├──────────────────────────────────────────────────────────┤
│ RECORD     │ search ·································· [shuffle]   │
│ tracks     │ tag chips with counts ·································› │
│ recently   │ ▶  ☆  TITLE ▴  ARTIST  ALBUM  +TAG  TAGS  KBPS  TIME  FMT  LISTENS │
│  played    │ track rows, 36px                                         │
│            │                                                          │
│ MY LIBRARY │                                                          │
│ tracks     │                                       (inspector pane    │
│ add music  │                                        docks here, 320px)│
│ libraries  │                                                          │
│            │                                                          │
│ LIBRARIES [+]                                         [ingest gauge] │
│ ◐ name   … ├──────────────────────────────────────────────────────────┤
│ ◐ name   … │ player bar — 75px screen                                 │
│ ▢ name   ⚙ │ ☆ art title/artist │ ⟲ ⤨ |◀ ▶ ▶| QUEUE 4 · HISTORY │ from │
│ 3 peers    │                    │ 0:41 ━━━━━━━━──── 3:12        │ lib ◐│
└────────────┴──────────────────────────────────────────────────────────┘
```

### Sidebar (paper, sunken)

- 180px, full window height, `--color-surface-sunken`, a 1px `--color-border` pane boundary on its right edge. The whole sidebar is the window drag region; its controls are `no-drag`.
- **Top** — back and forward (`‹ ›`), right-aligned so they clear the macOS traffic lights.
- **RECORD** — Tracks (every library, aggregated) and Recently Played (listens).
- **MY LIBRARY** — Tracks, Add music, and Libraries of the user's own library. With more than one own active library, MY LIBRARY lists each by name before Add music. Add music opens Import; while imports run it carries their count in 10px tertiary, `Add music  3`.
- **LIBRARIES** — linked and held-capability libraries; this list takes the remaining height and scrolls under a sticky heading that hosts `[+]`, which opens the Link a library flow. Each row: a 24px avatar, the name, and on hover a `…` that opens the library menu (connect or disconnect, unlink, edit, copy address). A library that is replicating shows a quiet tertiary gauge after its name.
- **Footer** — the identity's profile and the Settings gear, over a 48px row; under it the status line, `3 peers` with the connection dot, 11px tertiary, linking to Settings. The identity has no profile of its own (spec §8.6.9), so it goes by its default own library's About name and avatar. Until it is named, it goes by a two-word handle read from its public key (`identity/default-name.ts`, `amber heron`), the same on every device, never written to the profile. Until it has an image, its avatar is its default library's pattern. Either opens Identity, whose first section edits that profile. The gear is a 16px hairline SVG (`components/layout/settings-icon.tsx`) in secondary ink, accent on hover and on the Settings page, labelled `Settings`.
- Active item: `--color-selected` ink at 600 on the `--color-surface` paper (the item lifts to the page's paper, as legacy's white-on-grey). Hover: `--color-surface-hover`.

### Page column (paper)

- Fills the rest of the window above the player bar, with base's ruled texture: `--color-surface-ruling`, a `linear-gradient(var(--color-paper-texture) 1px, transparent 1px)` at `2px 2px`, fixed to the window so anything that masks it (a framed section's label) rules in step.
- **Page head** — 40px, a drag region, `--color-border-light` rule below. It holds either the page title (18px) or, on a library's tracks, the **library profile header**: avatar, name, the short address, an `OWNER` chip on an own library; on an own recordstore a centred `TRACKS │ PROFILE │ WRITERS` tabline in reverse video (active tab filled `--color-selected`, base's tui tabline; a retired library has no `PROFILE`); on the right, last updated (time ago), replication progress as a thin rule, and track and library counts that pulse while indexing.
- **Help** — disclosed, never a banner. A tertiary lowercase `help` sits at the right end of the page head on every page that has help (`components/layout/help.tsx`); `Cmd+?` opens and closes it. It opens a 340px paper popover under it (the overlay surface, border, 2px radius, and shadow): one or two sentences on what the page is for, then `every key ?`, which opens the shortcut overlay. Closed on every visit; `Esc`, a click elsewhere, or a new page closes it. Empty states still teach on their own.
- **Body** — width tiers by content kind, as on base's entity page: the track list fills the column, forms and settings 720px, reading text (about, descriptions) 66ch. Page padding `--space-lg`; sections stack with `--space-lg` to `--space-xl` between them.
- **Inspector** — a 320px paper pane docked on the right of the page column, reflowing the list, opened with `i`.
- **Ingest gauge** — while any import runs and Import is not the page, a small screen in the page's bottom-right corner reads `importing 3/10 [####------]` over the batch (every import seen running since the gauge was last empty). When the batch ends away from Import it holds `done 10`, or `!! 1 failed` when any file failed, for about 4 seconds, then goes; a batch that ends on Import is not held. It opens Import on click.

### Player bar (screen)

- 75px, legacy-v0's height and proportions, under the page column only (left edge at the sidebar boundary), full width of that column. Hidden when nothing is playing and the queue is empty; slides up from the bottom over 0.28s when playback starts.
- Thirds, as legacy (35% / 30% / 35%):
  - **Now playing** — a 40px adopt `★` column, 65px artwork (5px right margin), then title (13px, display glow) and artist (dim) on 14px lines, an 8px uppercase meta line `FLAC · 1411 KBPS`, and the track's tags as 18px chips 8px below, fading out at the right. The block shows the track as the node now describes it, from the newest track page of the view it was queued from (the node describes a track per view), so a tag added while it plays appears at once. A right-click on the block, or its `…` (shown on hover, at the top right), opens the track menu for the playing track: the row's menu less Play and Details.
  - **Transport** — legacy's row of 40px controls: repeat (off / all / one, lit when on), shuffle, `|◀`, `▶` or the drawn pause bars in a 36px 1px outlined circle (a spinner while loading), `▶|`, the queue with its queued count as a badge, and history. Under them the timeline: elapsed, a 5px phosphor bar over the buffered span with an 11px square thumb on hover, then duration, 10px tabular.
  - **Playing from** — right-aligned: the volume, then the source (library name, or `ALL TRACKS`, with the active tag filter as a 10px subtitle) over an 8px uppercase `PLAYING FROM`, beside the library's 65px avatar. Clicking either returns to that track list with its filters.
  - **Volume** — legacy-v0's desktop player drew none (it kept a level, 90 at first, stepped by 5), so it is restated as a phosphor level meter: the speaker icon, twenty 2px by 8px ticks with a 1px gap, one per 5% step, then the readout, 10px tabular. Lit ticks are phosphor with a 4px glow; unlit ones are `--color-border-light`, raised to `--color-border` on hover. A transparent range input lies over the ticks, so drag, click, and keys work. The speaker or the readout mutes and unmutes: muted, the speaker carries a slash, the ticks hold the silenced level in tertiary with no glow, and the readout says `MUTE`. A new level, or `-` or `=`, unmutes. The level persists across launches; a mute does not.

### Queue (screen overlay)

- Opened by `QUEUE` or `Shift+Q`. Covers the page column (not the sidebar, not the player bar) and slides up from below over 0.28s; a `▾` collapse at top-left and `Esc` close it.
- Left 60%: the playing track's artwork, large, behind the screen glass (the image keeps its own colors; the scanline mesh and vignette sit over it).
- Right 40%: `// PLAYING NEXT` with `[clear]` on the stroke and the queued entries; then `// BACK TO <source>` (with `SHUFFLING` when on) and the upcoming entries from the source list.
- Entries are 48px: hover play or pause, title with an availability dot, artist dim, `…`, duration. Drag or `Alt+↑/↓` to reorder both lists; `Backspace` removes from the queue.

### Overlays

- **Toasts** — bottom-centre of the page column, above the player bar. An event toast carries its action: `IMPORT FINISHED  [go to tracks]`, `LIBRARY UPDATED  [refresh]`.
- **Context menu** — at the pointer or the cursor row, flipped at the window edges.
- **Dialogs** — centred over the page column.

### Window

- Default 1200×800, minimum 900×600, as legacy. No breakpoints below that; the inspector closes itself when the page column falls under 720px.

## Progressive Disclosure

The "feng shui" of base, made concrete for a library: every legacy capability stays, at a calmer resting state.

- **Rest** — a track row shows index, title, artist, album, tags (quiet), and duration. Bitrate, format, and listen columns are on by default as in legacy but rendered tertiary; any column can be hidden from the header's menu, and the choice persists. Holders, pins, and CIDs are not on the row.
- **Hover or cursor** — the index becomes `▶`, `+TAG` appears in its column, `☆` brightens, and the row's `…` appears. As legacy.
- **Inspector** — `i` or a double-click opens the cursor track's full detail in the docked pane: every field, every holder library, pin state, listen count, where each tag came from, and the CIDs behind a closed `show identifiers` strip. Detail lives here so the row never has to carry it. Beside the pane the list drops its FMT and LISTENS columns, so it never scrolls sideways; the saved column choice is untouched.
- **Sections fold** — management pages (libraries, identity, settings, capabilities, replication policy) are stacks of framed sections. Primary sections open by default; secondary sections show as one rule line with a count: `▸ CAPABILITIES HELD  3 ─────────`. Folded state persists per section.
- **Advanced is a disclosure** — the JSON filter editor, raw identifiers, peer IDs, and folder paths sit behind an "advanced" disclosure inside their section.
- **Preview, then "show N more"** — lists inside a section preview a few items (5 libraries, 5 capabilities) and end in a tertiary `show 12 more`. Long text cuts at 120 characters with an inline `show more`.
- **"show X" strips** — grouped secondary detail (stats, provenance) sits behind a full-width hairline strip: 11px lowercase tertiary `▸ show details`, raising to secondary on hover, the chevron turning over 0.15s. Closed by default.
- **Empty values are omitted** — a field with no value is not rendered as a blank label; a section with nothing in it renders nothing while loading.
- **Skeletons mirror the layout** — a loading row sits on the track list's column grid, a 12px `--color-border-light` bar in each text column at a ragged width fixed per row and column (numbers right-aligned, none under adopt, `+TAG`, or the menu), pulsing on a 1.4s ease-in-out cycle with staggered delays, no shimmer sweep. The hibernation snapshot usually makes them unnecessary; they cover a first launch.
- **Empty states teach** — a Departure Mono headline, one line of what to do, and the action: `EMPTY` / `Nothing here yet. Try connecting.` with `[connect]`.

## Keyboard Model

The library is driven by keys. Mouse and keys reach the same state through the one action path (`player-controller.ts` for playback, the track list's cursor for selection).

- **Cursor** — the track list always has one cursor row, distinct from the playing row and from the selection. It is a `--color-surface-cursor` wash with 600-weight title ink; no stripe. Focus enters the list on page load and with each new view, and returns there when a dialog, menu, or field closes. It never leaves a field for the list: a search's results are a new view, and typing stays in the search.
- **Shortcuts are never live** while typing in a field or with a dialog open (the existing `resolve_hotkey` rule); `Esc` is the one key that always works.

| Key                     | Action                                                   |
| ----------------------- | -------------------------------------------------------- |
| `j` / `↓`, `k` / `↑`    | Move cursor                                              |
| `Home` / `End`          | First / last row                                         |
| `Shift` + move, `x`     | Extend selection / toggle row in selection               |
| `Enter`                 | Play from cursor (the source list continues after the queue) |
| `n`                     | Play next                                                |
| `q`                     | Add to end of queue                                      |
| `t`                     | Tag the cursor row or the selection, inline              |
| `f`                     | Adopt (the legacy star) into the write target            |
| `i`                     | Toggle the inspector                                     |
| `.` or `Shift+F10`      | Open the row's context menu at the row                   |
| `/` or `Cmd+F`          | Search                                                   |
| `Esc`                   | Close menu, then clear search, then selection, then pane |
| `Space`                 | Play or pause                                            |
| `Cmd+←` / `Cmd+→`       | Previous / next track                                    |
| `Shift+←` / `Shift+→`   | Seek 5s                                                  |
| `-` / `=`               | Volume down / up                                         |
| `m`                     | Mute or unmute                                           |
| `r` / `s`               | Cycle repeat / toggle shuffle                            |
| `Shift+Q`               | Toggle the queue                                         |
| `[` / `]`               | Previous / next section, on a page with a section index  |
| `Cmd+[` / `Cmd+]`       | Back / forward                                           |
| `g`                     | Go: the next key says where (below)                      |
| `Cmd+,`                 | Settings                                                 |
| `Cmd+O`                 | Import files                                             |
| `Cmd+?`                 | This page's help popover                                 |
| `?`                     | Shortcut overlay                                         |

**Go, the `g` lead.** Navigation is rare next to the list and player verbs, so it sits one key behind `g` rather than spending bare letters. `g` opens a small paper panel at the top of the page column, `G THEN` over the keys; the next key is consumed, never passed on: `t` all tracks, `r` recently played, `l` my library, `b` libraries, `i` import, `a` identity, `,` settings, and `1`–`9` the sidebar's libraries in its order, whose avatars turn into those digits while the panel is up. `Esc`, any other key, a click, or leaving the window closes it.

**Live keys.** The track list's keys (cursor, selection, play, queue, tag, adopt, inspector, row menu) are live only while a track list is mounted. Off a track list, `f` adopts the playing track and `.` (or `Shift+F10`) opens its menu, and the rest pass through. Every other key is live everywhere.

Every shortcut is in the `HOTKEYS` table, with where it is live, and the keys after `g` are in `GO_KEYS`. The `?` overlay and the Settings shortcut section both render them grouped — `EVERYWHERE`, `OFF A TRACK LIST`, `IN A TRACK LIST`, `AFTER G` — the overlay putting the track list's keys first on a page that shows one (`IN A TRACK LIST`, `EVERYWHERE`, `OFF A TRACK LIST`), so neither can drift from the bindings.

## Components

### Track list (paper)

- **Header row** — a borderless search field filling the left (48px tall, `/` hint when empty, a `×` clear); on the right the shuffle toggle. Adding music is the page's main action (§ Main action).
- **Tag strip** — the list's tags as chips with counts, A to Z, one line with a right-edge fade into the paper; scrolls horizontally. Clicking toggles a tag in the filter (AND).
- **Column header** — 10px uppercase tertiary: `▶ ☆ TITLE ARTIST ALBUM +TAG TAGS KBPS TIME FMT LISTENS`. Sortable headers show `▴` or `▾` on the active sort and turn accent on hover. Filter, search, and sort state live in the route, so back and forward restore them.
- **Rows** — 36px, 13px mono, virtualized, `--color-border-light` dividers, no zebra.
  - Index column (4ch): the row number in tertiary at rest; `▶` on hover or cursor; the drawn pause bars or a spinner on the playing row, in vermilion.
  - `☆` adopt: dim at rest, brightens on hover; `★` in `--color-selected` when an own library holds the track.
  - Playing row: title in `--color-accent`. Cursor row: the cursor wash. Selected rows: `--color-selected-bg` with `--color-selected` ink. A row whose menu is open keeps the hover wash.
  - Pinned: a tertiary `◆` after the title.
- The same list renders Tracks, a library's tracks, and Recently Played (Recently Played has no tag strip or search; rows keep every action).

### Tag chips

- 11px, `--color-text-secondary` ink, 1px `--color-border-light` border, square, `0 6px` padding, count after the label in tertiary.
- Active filter chip: `--color-accent` ink and border on `--color-accent-wash`.
- On a row: clicking a chip filters by it; a chip from another library opens that library filtered by the tag. A removable tag (own active library) shows `×` on hover; removal confirms.
- **Inline tag adder** — `+TAG` or `t` opens a small input at the row (not a centred dialog): lowercase, fuzzy suggestions from the visible tags, `Tab` takes the first suggestion, `Enter` adds, `Backspace` on empty removes the last, `Esc` closes.

### Framed section (paper)

Base's `tui-section`: a 1px `--color-border` frame with the title seated on the top stroke (`┌─ TITLE ─────┐`), the label masked by the surface it sits on (on the page, `--color-surface-ruling` over `--color-surface-solid`, so the ruling runs through it), 10px uppercase tertiary. Folded, it is a single rule line with `▸`, the title, and a count. Border-hosted controls (a count, `[x]`, a small local action like `[clear]`) sit on the stroke the same way; a page's main action never does (§ Main action). Never give the label a contrasting chip background.

### Section index (paper)

Settings and Identity are long stacks of framed sections, so each carries an index (`components/common/indexed-page.tsx`): a 140px column at the left of the page, sticky as the sections scroll, listing them by title in 10px uppercase tertiary on 24px rows. The section in view (the last whose top has passed the middle of the visible page) is in `--color-accent` with a 0.7em `▶` before it; hover raises an entry to secondary. A click, or `[` and `]`, goes to a section, unfolding it if it is folded, and keeps it in the route as `?section=`, so a reload or back returns there and a link can open on one (`settings_route('peers')`).

### Buttons

| Variant   | Paper                                                     | Screen                                                  |
| --------- | --------------------------------------------------------- | ------------------------------------------------------- |
| primary   | `--color-accent` fill, white text                          | phosphor outline, fills to accent wash on hover          |
| secondary | transparent, `--color-border`, secondary ink               | phosphor-faint outline, dim ink, brightens on hover      |
| ghost     | transparent, no border, secondary ink; accent ink on hover | dim ink, phosphor on hover                               |
| danger    | `--color-error` fill, white text                           | phosphor outline with `!!` prefix                        |

Heights 24px (small, 11px) and 32px (medium, 12px). Uppercase, 0.5px tracking, square corners, no shadow.

### Main action

A page's main action is a button, never a bracketed word on a frame stroke, which read as decoration. The page puts it in the right of the page head, before `help` (`components/layout/page-actions.tsx`): at most one small primary, with any secondary actions as small secondary buttons to its left. When the page is empty, its empty state repeats the action as a medium primary in the body, where attention is.

- **Libraries** — `NEW LIBRARY` primary, `LINK A LIBRARY` secondary. An empty Following says how to follow one, with `LINK A LIBRARY` again as a medium secondary, so the page keeps one primary.
- **Writers** — `ADD WRITER` primary, absent once the library is retired; none issued, the empty line carries it again.
- **Tracks** — `ADD MUSIC` on All tracks and on a library of yours that is not retired, secondary, primary only while the list is empty. A filled button on every list page would pull the eye from the playing row.

### Artwork and avatars

- Artwork with no image is legacy's vinyl disc: a circle in `--color-border` with a centre label in `--color-accent-wash`; an image covers it. The disc is the one round shape on paper, because it depicts an object, not a control.
- Library and identity avatars are square, 1px `--color-border-light`, on `--color-surface-sunken`. Without an image, an avatar is a 5×5 mirrored pattern in secondary ink, about 60% of the square in whole-pixel cells centred on a whole pixel (so it stays crisp at 20 and 24px), read from the library's address (`components/common/avatar-pattern.ts`), so a library looks the same on every device and to every peer. The identity shows its default library's.
- **Choosing an avatar** — the profile editor shows the avatar at 48px with `Choose image`, which opens main's image picker and stores the image in the node (`POST /images`, at most 16 MiB), and `Remove` once one is set, which goes back to the pattern. A tertiary line under it says what happens next (`Save the profile to use it.`). The raw CID is behind `show advanced`.
- Inside a screen, artwork keeps its own colors under the glass.

### Library context menu, track context menu

- Track: Play, Play next, Add to queue, Remove from queue (when queued), Add tag, Adopt to library, Pin or Unpin, Remove from library, Copy CID. Shortcuts right-aligned in tertiary.
- Library: Pause or Resume (replication), Unlink (confirms), Edit, Copy address.

### Libraries (paper)

Libraries are grouped by the relationship, never labelled with the spec's category terms. Each group is a full-width framed section with its count on the stroke:

- **YOURS** — own libraries. A row is the 20px avatar, the name, and the track count; it opens the library. The listens library goes by `Play history` here and wherever own libraries are listed (Identity too), with `Where your plays are recorded.` under it, and opens Recently Played. A retired library carries a tertiary `retired` after its name.
- **SHARED WITH YOU** — libraries this identity holds a capability in, each with a `You may: …` line; absent when empty.
- **FOLLOWING** — linked libraries; empty, it says how to follow one, with the action.
- **DISCOVERED** — known only from peer discovery; absent when empty.

Shared, following, and discovered rows carry replication state, mode with `change`, peers, one `Pause` or `Resume` for replication (whichever applies), unlink, and `…`. Every group previews five rows and ends in `show N more`; `show addresses` under the groups adds each row's short address. Where a category is named in a sentence it reads `yours`, `shared with you`, `followed`, `discovered`: the inspector says `in 2 of yours, 1 followed`.

An own library is managed beside its tracks, on its tabs: **Profile** (the about editor, then a folded `RETIRE` section with the consequence in words and a danger button that confirms) and **Writers** (`WHO MAY WRITE`: one line on what it is for, `The people you let add tracks and tags to this library. Revoking stops their new writes, not past ones.`, then the capabilities it has issued; `ADD WRITER` in the head opens the Add a writer flow; read-only once retired). The tab is named for what it holds, not the spec's term, so its purpose reads without the help. Retiring lands on Writers. The identity's own profile is also edited on Identity.

### Step flows (paper)

Linking a library, creating one, and adding a writer to one are their own pages (`/libraries/link`, `/libraries/new`, `/library/writers/issue`), one question at a time, so attention stays on the step:

- A 560px column, `--space-3xl` from the head: `STEP 1 OF 2` (xs tertiary uppercase), the question in Departure Mono 24px uppercase in `--color-text`, one 48px input at 15px, one line under it (a tertiary hint or an echo of what was understood, or the error with `!!` in `--color-error`), then `Cancel` or `Back` (ghost) on the left and the primary action on the right.
- `Enter` continues, from a checkbox or radio too, and `Esc` goes back; the input takes focus on each step. A step whose answer is a choice lists it as 32px checkbox or radio rows at 15px in place of the input.
- **Link a library** — the address, echoed as its readable form (`Found mixes · …8MnGCA`) or refused as not an address; then an optional alias. It lands on the library's tracks.
- **New library** — the name (required); then the address name, suggested from the name (`late-night-mixes`), editable, with what it is and that it never changes. It lands on the library's Profile tab.
- **Add a writer** — who (one or more public keys, echoed as `One identity: 0279be66…f81798`); what they may do (add tracks, add tags, edit the profile, grant to others; add tracks preselected, echoed as a sentence); for how long (until revoked, a day, a week, thirty days, or a date), with the write filter behind a `show advanced` strip. It lands back on Writers.

### Settings (paper)

The legacy settings page, restated for v1, as framed sections behind a section index: Connection (mode, URL, token, test), Storage (snapshot budget, cache size, reset), Shortcuts (the `HOTKEYS` table), Peers (the peer list, folded by default with its count on the rule), Diagnostics. The Diagnostics section's live block (connection state, memory, and for the bundled node its status, PID, and uptime) is a small screen; versions and folders stay paper with `[show in finder]` actions.

### Import (paper, with a screen)

Picker (files and folders), drop zone, and `Paste URL` as in legacy, plus the write-target selector. Below them, progress in two parts (`components/import/import-list.tsx`):

- **Running** — unfinished imports only, in a screen under `// IMPORTING`, one line each in fixed columns: status (`41%`, or `!! 2 failed` once a file has failed), the label (ellipsized), the count `7/10`, and the age `2m`, tabular. No screen when nothing runs.
- **History** — finished imports on paper, newest first, in a framed section titled `HISTORY` with the count and `[clear]` (drops every finished import) on the stroke. Each is one row: a `▶` disclosure, the status word (`done` in secondary ink, or `!! 2 failed` in `--color-error`), the label, the tracks added, and the age since it finished. The disclosure, closed by default, opens the errors and then the added tracks under the label column, ten at a time behind `show N more`. An error names the file as the user chose it (`side-b.flac: …`), never the node's temp upload name. A row with nothing to open has no `▶`.

### Dialogs, context menu, toasts (paper overlays)

- `--color-surface-raised`, 1px `--color-border`, 2px radius, `--shadow-overlay`.
- Dialog: framed-section title on the top stroke, `[x]` close notch on the stroke, 15px body, buttons right-aligned.
- Context menu: 12px rows, hover and keyboard highlight are the hover wash with accent ink.
- Toast: framed with the title on the stroke, an optional action button, a depleting 1px rule along the bottom edge for its lifetime (base's countdown idiom). Error toasts state the error in words; no colored edge.

### Library address

A library address (`/record/<manifest CID>/<discriminator>`) is never shown whole. Every manifest CID opens with the same `zBwWX`, so the visible part is the discriminator and the CID's last six characters: `mixes · …8MnGCA`, 11px tertiary in a `--color-border-light` box. The whole address is its tooltip, and a click copies it. Hovering it shows the action: a small paper tip under the box, `copy` at 10px in secondary ink, over what is below so nothing beside the address moves or is covered; it reads `copied` for a moment after a click. A library with no alias or About name goes by its discriminator, and its address then shows only the tail, `…8MnGCA`.

### Connection status

The sidebar's status line carries a dot and a word: `● 3 peers` (success), `● connecting` (warning), `● unreachable` (error), `● token refused` (error). The banners at the top of the page column say the same at length, paper, with a word and a glyph, on the banner background tokens.

### Empty states

Departure Mono headline (24px, uppercase), a 13px mono detail line, and the action that resolves it, as a button and its key.

## Interaction States

| State     | Paper                                                     | Screen                                         |
| --------- | --------------------------------------------------------- | ---------------------------------------------- |
| Rest      | Neutral ink, no accent                                    | Phosphor at body glow                          |
| Hover     | `--color-surface-hover` wash, ink to accent on links      | Accent wash, dim ink to full phosphor          |
| Cursor    | `--color-surface-cursor` wash, 600 title                  | Accent wash                                    |
| Focus     | 2px `--color-focus-ring` outline, offset 1px (inset 2px on the sidebar's edge-to-edge items, which it clips) | `0 0 8px` phosphor glow |
| Selected  | `--color-selected-bg`, breadcrumb ink                     | Accent wash with full phosphor                 |
| Active    | Primary accent fill or reverse video (active nav item)    | Lit toggle (`aria-pressed`)                    |
| Playing   | Accent title and `▸`                                      | Display glow and on-air dot                    |
| Disabled  | Tertiary ink, no hover                                    | Opacity 0.4                                    |
| Gated     | Disabled plus a tertiary "waiting for node" reason        | —                                              |

Transitions: 0.15s on color and opacity, 0.28s `cubic-bezier(0.32, 0.72, 0, 1)` on panes. `prefers-reduced-motion` drops the flicker, the pulse, and pane slides.

## Glyphs

Text glyphs from the mono face, no icon font: `▶` play, `|◀` `▶|` previous and next, `▶` `▼` `▲` at 0.7em for disclosure and sort, `★` adopt (dim when no own library holds the track), `◆` pinned, `●` status, `×` remove, `[x]` close, `!!` error, `//` screen label prefix. Repeat, shuffle, queue, history, the volume's speaker, and the Settings gear have no glyph in either face, so they are drawn as 16px hairline SVGs (`components/player/transport-icons.tsx`, `components/layout/settings-icon.tsx`, a 1.25px square-capped stroke in `currentColor`). Pause is drawn there too, as two solid bars a little taller than `▶` and boxed tight so they centre where it does: the face's `▮▮` is squat, no taller than `▶`, and read as too small beside it. Nothing else uses an icon. Commit Mono has no `⟲` `⤨` `❚` `▸` `▾` `▴` `☆` `⚙`, so where this document draws one, the glyph above stands in; a glyph outside the face would fall back to a system font. Each glyph-only control carries an `aria-label`.

## OS Surface (macOS, Electron)

- **Window chrome** — `titleBarStyle: 'hiddenInset'`, as legacy; the sidebar and the page head are drag regions (`-webkit-app-region: drag`), controls inside them are `no-drag`. `backgroundColor` `#f7f7f4` so the window never flashes white or black before first paint.
- **Native vs custom** — app menus (About, Show Logs Folder, Show Data Folder, as legacy) and the identity-export confirmation stay native. Context menus are the custom paper menu so they can show shortcuts and stay keyboard-reachable.
- **Scrollbars** — thin overlay scrollbars in `--color-border`, visible on scroll.
- **Text selection** — `::selection` in `--color-accent-wash`; chrome (nav, buttons, row indices) is `user-select: none`, values (titles, identifiers in the inspector) are selectable.
- **Media Session** — the OS now-playing surface shows title, artist, and the track's artwork from `GET /images/{cid}`.
- **Platforms off macOS** — the same paper and screens; the native frame stays and the drag regions are omitted.

## Anti-Patterns

- A hex, `rgb()`, or primitive token inside a `.module.css` file. Use role tokens.
- Phosphor on paper, or paper colors inside a screen.
- CRT effects outside a bounded screen in the paper theme.
- Colored side stripes on any edge.
- Rounded interactive corners, or any radius above 2px (the play and pause circle excepted).
- Box-shadow for elevation.
- Departure Mono below 18px on paper.
- A literal font family in a module. Use `--font-mono` or `--font-display`.
- An action that only the mouse can reach, or a shortcut missing from `HOTKEYS`.
- Detail that exists only in a tooltip.
- Vermilion used to decorate rather than to mark interaction or playback.
