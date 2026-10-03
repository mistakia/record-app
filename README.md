---
title: Record
type: text
description: >-
  Record desktop app: an Electron and React 19 client of record-node that talks to one node at a
  time over the chapter 7 HTTP API, with all node traffic routed through the main process.
base_uri: user:repository/active/record-app/README.md
created_at: '2026-03-06T19:51:52.304Z'
entity_id: 7534e880-e625-4b9e-b1ba-200bd57a7f79
owner_identity_uri: user:identity/trashman.md
public_read: true
updated_at: '2026-10-03T08:17:19.158Z'
---

<a href="https://record.tint.space/" title="Record">
  <img src="https://raw.githubusercontent.com/mistakia/record-app/master/resources/icon.png" alt="Record Logo" width="150" />
</a>

# Record App

> Desktop application for Record, a distributed peer-to-peer system for audio libraries.

The app is an Electron client of [record-node](https://github.com/mistakia/record-node). It holds no protocol logic: it talks to one node at a time over the node's HTTP and WebSocket API. The application contract is chapter 8 of the [Record protocol specification](https://github.com/mistakia/record-docs).

**Status:** early rebuild. Remote mode works: point the app at a running record-node, browse its libraries and tracks, and play a track. The track list updates live from the node's events, the app shows when the node is unreachable, and it reopens on the last-viewed libraries and tracks from a local snapshot. Bundled mode (the app spawns its own node), the queue, ingest, and packaging come next.

## Requirements

- macOS (the first supported platform)
- [Bun](https://bun.sh) 1.4 for install, tests, and scripts
- A running record-node to connect to

## Install

```bash
bun install --frozen-lockfile --ignore-scripts
bun run setup:electron   # downloads the Electron binary, the one install step that fetches code
```

Dependency install scripts never run: `package.json` pins exact versions with an empty `trustedDependencies`, and `bunfig.toml` refuses any version published less than 7 days ago.

## Run

```bash
bun run dev      # development, with hot reload
bun run build    # production build into out/
bun run start    # run the production build
```

On first launch the app opens on Connection. Enter the node URL (`http://127.0.0.1:3000` for a local record-node on its default port), test the connection, and save.

## Test

```bash
bun run verify   # lint and typecheck
bun test         # unit and integration tests
```

The integration test starts record-node in process and ingests a fixture, which needs `ffmpeg` and `fpcalc`. When their versions differ from record-node's pins, run `RECORD_TOOLCHAIN_PREFLIGHT=bypass bun test`.

`bun run smoke:remote` launches the built app against a running node, finds a track, and plays it, then relaunches from the offline snapshot and checks the unreachable state. Set `RECORD_NODE_URL`, `RECORD_SMOKE_TITLE`, and `RECORD_SMOKE_ARTIST` to choose the node and the track. The script header documents the optional live-update and offline-relaunch checks.

## Security

The renderer never talks to the node. The main process makes every request with Node's built-in `fetch`, accepting only a method and path template from the API definition, and the renderer reaches it through a narrow preload bridge. The renderer runs sandboxed with context isolation and a strict Content Security Policy.

## License

MIT. See [LICENSE.md](LICENSE.md).
