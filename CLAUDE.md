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
bun run smoke:remote        # built app against a running node (RECORD_NODE_URL)
```

## Architecture

```
src/
  main/        Electron main: window.ts (hardening), ipc.ts, connection-store.ts,
               node-client.ts, api-path.ts. All node traffic leaves from here.
  preload/     index.ts: the window.record bridge, nothing else
  shared/      bridge.ts (IPC types and channels), node-url.ts, api-routes.ts (generated)
  renderer/    React app: api/ (generated-types.ts, types.ts), store/, pages/,
               components/, player/ (audio-engine.ts, player-controller.ts)
test/          unit/, integration/ (in-process record-node), e2e/ (Playwright Electron)
cli/           generate-api-routes.mjs, check-lockfile-age.mjs (vendored from base)
```

- **Transport.** The renderer never talks to the node. Main uses Node's `fetch`, which sends no `Origin`; nodes run `cors_origins: []` and refuse any request carrying one. The renderer CSP is `connect-src 'self'`.
- **Request allowlist.** `request` accepts only a method and path template listed in `src/shared/api-routes.ts`, generated from record-node's `dist/api/7-http-api.yaml`; params go through `encodeURIComponent`. Audio has its own `get_audio` channel.
- **Electron-free modules.** `node-client.ts`, `api-path.ts`, and `connection-store.ts` import nothing from Electron, so tests drive them under Bun.
- **State.** Server data lives only in the RTK Query cache; slices hold client state (`connection`, `player`).

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
