# CLAUDE.md

Guidance for Claude Code working in this repository.

For graph context (sibling Record repos, task directory, protocol spec), see [ABOUT.md](ABOUT.md). For the public overview, see [README.md](README.md).

## Project Overview

Desktop application for **Record**: an Electron + React 19 client of `record-node`. The app holds no protocol logic; it talks to one node at a time over the chapter 7 HTTP and WebSocket API. Spec chapter 8 (`record-docs/spec/8-client-application.md`) is the contract. The rebuild plan is `task/record/record-app-rebuild.md` in user-base.

Stack: Bun (install, tests), electron-vite (build), Electron (runtime), React 19, React Router, Redux Toolkit with RTK Query, CSS Modules.

## Commands

```bash
bun install --frozen-lockfile --ignore-scripts
bun run setup:electron      # Electron binary; its postinstall never runs
bun run dev                 # electron-vite dev
bun run build               # production build into out/, no source maps
bun run verify              # eslint + three tsc projects
bun test                    # RECORD_TOOLCHAIN_PREFLIGHT=bypass when ffmpeg/fpcalc differ from record-node's pins
bun run gen:api             # regenerate API types and the route allowlist after bumping record-node
bun run smoke:remote        # built app against a running node, read-only (RECORD_NODE_URL; options in the script header)
bun run smoke:local         # built app against its own in-process node: every write, gapless, identity export
bun run smoke:auth          # built app against an in-process node that requires a bearer token
bun run smoke:v1-1          # built app against an in-process node: the record-docs v1.1 surfaces
```

## Architecture

```
src/
  main/        Electron main: window.ts (hardening), ipc.ts, connection-store.ts,
               node-client.ts, api-path.ts, node-events.ts (WebSocket),
               node-session.ts, snapshot-store.ts. All node traffic leaves from here.
  preload/     index.ts: the window.record bridge, nothing else
  shared/      bridge.ts (IPC types and channels), snapshot.ts, node-url.ts, api-routes.ts (generated)
  renderer/    React app: api/ (generated-types.ts, types.ts), store/, pages/,
               components/, hooks/, snapshot/, player/ (player-controller.ts, audio-engine.ts,
               audio-slots.ts, queue-manager.ts, listen-recorder.ts, media-session.ts)
test/          unit/ (main and shared), renderer/ (store, engine), integration/ (in-process
               record-node), e2e/ (Playwright Electron)
cli/           generate-api-routes.mjs, check-lockfile-age.mjs (vendored from base)
```

- **Transport.** The renderer never talks to the node. Main uses Node's `fetch`, which sends no `Origin`; nodes run `cors_origins: []` and refuse any request carrying one. The renderer CSP is `connect-src 'self'`.
- **Remote bearer auth** (spec §8.7.3). main holds a remote node's token and adds `Authorization: Bearer` to every request, audio fetch, and upload, and offers `record` plus `bearer.<token>` as WebSocket subprotocols; the bundled node gets none. Tokens are tchar only and at most 2048 characters (`shared/token.ts`; they must fit the subprotocol and `security -i`'s line), one per node URL, in the login Keychain through `/usr/bin/security` with the token on stdin (`token-store.ts`); security's output never reaches an error message. The item trusts `/usr/bin/security`, so any process running as the user can read it; an app-scoped ACL needs a native binding. Off macOS tokens last until quit. The renderer sends a token on save or test and only learns `auth.status` (`none`, `saved`, `rejected` for a refused token, `required` for a node that refused a request with none). A save stores the token before the config, so a Keychain failure saves nothing. Every node call goes through `authed-call.ts`: credentials carry a generation (`node-auth.ts`), a 401 rejects only the generation it was sent under, the token is deleted (only if the Keychain still holds that value, behind any queued write), and the node is blocked (`EventsState.status` `unauthorized`, no socket, every call refused in main) until a new token is saved. A refused WebSocket upgrade is diagnosed by a REST probe. Log out deletes the token. The real-Keychain unit test runs only with `RECORD_TEST_KEYCHAIN=1`.
- **Request allowlist.** `request` accepts only a method and path template listed in `src/shared/api-routes.ts`, generated from record-node's `dist/api/7-http-api.yaml`; params go through `encodeURIComponent`. Audio has its own `get_audio` channel.
- **Events.** Main holds one WebSocket to `/api/ws` (backoff 1 s to 30 s with jitter) and forwards events and its state over IPC. Events only invalidate cache tags, batched to one refetch per second; each new connection triggers a full reconcile.
- **Freshness.** Node data is stale until the reconcile after each connect finishes. The RTK Query base query refuses every write until then, and the banner shows the unreachable or stale state.
- **Playback.** `player-controller.ts` is the one action path; the player bar, queue panel, track rows, and Media Session all call it. The engine holds two decoded buffers at most and splices the next one in with `start(when)` at the current buffer's end. A listen POSTs once per play at 60 s of played time (or near the end of a shorter track), behind the write gate. POST /listens is not idempotent, so a failed listen is retried only when it provably never reached the node (gated, refused, or DNS), never after a timeout; held listens live in memory and are lost if the app quits first. Never let a smoke against a shared node play that long.
- **Hibernation snapshot.** The renderer hands main the snapshot (libraries, the active first page, the queue, the route) every 5 s when changed. Main writes it every 30 s and at quit, fits it to the user's limit, and wipes it on a node URL change. Launch renders it before any query, marked stale.
- **Bundled mode** (`src/main/bundled/`, spec §8.4). The first-launch default. Main spawns `node_modules/record-node/dist/cli.js` through Electron's `utilityProcess.fork` (not ELECTRON_RUN_AS_NODE, so packaging can disable the RunAsNode fuse; a utility child dies with the app and does not exit when its event loop empties) with `--port`, `--data-dir <userData>/node-data`, and a generated `--config` that pins `host: 127.0.0.1` and `cors_origins: []`. The child's environment comes from an allowlist (no `NODE_OPTIONS`). Start, stop, and restart run through one queue, and a stop cancels an unfinished start by generation. Healthy means: the child announced it listens on the port, is still alive, and answers with the peer_id pinned in `record-app-node.json` on its first start. It health-checks every 250 ms, restarts with backoff, gives up after five failed restarts, tees output to `node.log`, holds `record-app.lock` in the data directory, and stops the child before the app exits. `node-connection.ts` decides which URL the app talks to and keys per-node state by `node_key` (`bundled:<peer_id>:<identity library address>`, which creating or retiring own libraries never changes, or the remote URL). The pinned ffmpeg and fpcalc are not bundled yet, so the bundled node reports ingest disabled. `test/electron/` holds a harness that runs inside Electron for the utilityProcess path.
- **Writes against shared nodes.** Treat any node you did not start as read-only: tags, ingest, links, about, listens, and identity import and export are exercised only against the in-process node (integration tests and `smoke:local`). `smoke:remote` stays read-only.
- **Ingest paths.** File-picker paths come only from main's own dialog; dropped files reach main as bytes and a bare name (`import-files.ts`). The renderer never hands main a path (spec §8.10.3).
- **Identity.** The generic request channel refuses both identity routes. Export goes through main's `identity.export` channel, which returns the key only after the user confirms in a native dialog; the key lives in the export dialog's state, is cleared on close, and a copy is cleared from the clipboard after 60 s. The public key is read once per node URL in main, which keeps only the public half and refuses over plain http to another machine. Import is an RTK mutation (`track: false`) to main's `identity.import`, which sends only to the bundled node (§8.5.4).
- **Own libraries** (spec §4.8.3, §8.9.1). `components/library/own-libraries.tsx` on the Libraries page lists `GET /identity/libraries` (active, retired, and the listens library), creates one with an optional name and discriminator, retires one after a permanent-action confirmation, and picks which active recordstore's profile the about editor shows. The listens library and retired libraries are never offered for retirement. A node without the endpoint (404) hides the panel. `identity:library-created` and `identity:library-retired` invalidate libraries.
- **Write targets** (spec §8.6.3, §8.6.7). `library/write-targets.ts` is the one rule: a write may go to an own active recordstore (no capability), or to another identity's library through an active held capability (`GET /identity/capabilities`) whose actions include the write's, picked automatically (unfiltered first, then the latest expiry), never asked for. `components/library/target-select.tsx` shows a selector when there is a choice and names the target when there is one; the default is the viewed library, then the last one written to, then the first own one. Ingest (file, drop, URL, CID), tag add, and adoption (`Adopt to library` in the track menu, `POST /tracks` by content CID) send `library_address` and, for a shared target, `capability_id`; file uploads carry them as multipart fields, checked in main (`check_import_target`). Tags are removed only from own active libraries, since no capability authorises dropping one (§3.5.6).
- **Capabilities** (spec §3.5.5–§3.5.10, §8.6.4). Each own recordstore's `Capabilities` panel (`components/capability/library-capabilities.tsx`) lists every capability issued with its status, issues one (a key or key set, actions, an optional FilterSpec, an optional `expires_at`), and revokes an active one after a confirmation that revocation is not retroactive; a retired library's history is read-only. The Identity page lists capabilities held from others (`held-capabilities.tsx`) by library, with "Leave shared library" (`library/left-libraries.ts`, per node in local storage), which drops that library from write targets and revokes nothing. A library with a held active capability is `shared` and shows the scope held. Unknown verbs, GranteeSpec, FilterSpec, and ConditionSpec types render as opaque labels (`library/capabilities.ts`, `filter/filter-spec.ts`). `library:entries-inert` raises a notification, and CAPABILITY_EXPIRED and CAPABILITY_REVOKED refusals read as spec §8.6.8 words them.
- **FilterSpec editor** (`components/filter/filter-editor.tsx`, spec §3.5.7, §8.6.6). A structured editor over the six node types with field paths suggested per consumer (`CAPABILITY_FIELDS`: the entry envelope a capability filter reads; `REPLICATION_FIELDS`: the §4.6.1 track view), and an advanced JSON mode. It edits a draft that keeps the typed text (`filter/filter-draft.ts`) and emits a FilterSpec only when the draft reads as one, `undefined` otherwise; callers send nothing while the value is `undefined` or `filter_problems` finds anything. A filter the structured editor cannot show opens in JSON mode only.
- **Browsing.** The track list is virtualized over the whole result; only the 200-row pages near the viewport are subscribed. Search, sort, and tag filtering are node queries (§8.8.2).
- **Electron-free modules.** `node-client.ts`, `api-path.ts`, `connection-store.ts`, `node-events.ts`, `node-session.ts`, `snapshot-store.ts`, `audio-downloads.ts`, `import-files.ts`, `request-policy.ts`, `identity-access.ts`, `clipboard-expiry.ts`, `node-connection.ts`, `node-auth.ts`, `authed-call.ts`, `token-store.ts`, and everything in `bundled/` except `bundled-node.ts` import nothing from Electron, so tests drive them under Bun.
- **State.** Server data lives only in the RTK Query cache; slices hold client state (`connection`, `player`, `ui`, `replication`, `imports`, `notifications`).

## Conventions

- snake_case, functions over classes, named parameters, `#` import aliases (`#main/*`, `#renderer/*`, `#shared/*`, `#test/*`), explicit `.ts`/`.tsx` extensions, no barrel files, about 200 lines per file.
- Supply chain: exact versions only, `trustedDependencies: []`, and the 7-day `minimumReleaseAge` in `bunfig.toml`. Never weaken the floor; pick an older version instead.
- record-node is a git dependency pinned by commit. Bumping it means `bun run gen:api` and committing the regenerated files; a unit test fails when the route list drifts from the yaml.
- Render every value from a node as plain text (spec §8.10.6).

## Related Repos

- `repository/active/record-docs/` — protocol specification (canonical)
- `repository/active/record-node/` — the node this app connects to
- `repository/active/record-chrome-extension/` — web import tool
- `repository/active/record-resolver/` — URL resolution for ingest
