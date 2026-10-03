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

**Status:** early rebuild. The app runs its own record-node by default (bundled mode) or connects to one you run elsewhere (remote mode). It browses, searches, and tags libraries over a virtualized list, plays a queue gaplessly with listen recording and macOS media controls, imports files and URLs, links and follows other libraries, edits the library profile, and shows and exports the node's identity. The track list updates live, the app shows when the node is unreachable, and it reopens on the last-viewed view from a local snapshot. It builds as an unsigned universal macOS app. Until the app ships the pinned ffmpeg and fpcalc, the bundled node cannot ingest files or URLs; adding a track by CID works. Signing, notarization, release publishing, and auto-update wait on a Developer ID identity and a release feed.

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
bun run package:mac   # unsigned universal .dmg and update .zip into release/
```

`package:mac` first runs `bun run audit`, the dependency audit gate: a high or critical advisory in the shipped dependencies fails the build unless `audit-allowlist.json` justifies it, and each entry expires on its review-by date. It then installs the macOS optional dependencies for both architectures, so the universal app carries node-datachannel's Intel and Apple Silicon binaries.

On first launch the app starts its own record-node in bundled mode, with its data in the app's Application Support directory and its log in `~/Library/Logs`. To keep the node's data elsewhere, choose Change beside the data directory on the Connection page. The app asks first, does not move existing data, and restarts the node in the new folder. The Diagnostics page lists versions, paths, the node process, the event connection, and memory use for a bug report. To use a node you run elsewhere, choose Remote node on the Connection page, enter its URL (`http://127.0.0.1:3000` for a local record-node on its default port), test the connection, and save.

## Test

```bash
bun run verify   # lint and typecheck
bun test         # unit and integration tests
```

The integration test starts record-node in process and ingests a fixture, which needs `ffmpeg` and `fpcalc`. When their versions differ from record-node's pins, run `RECORD_TOOLCHAIN_PREFLIGHT=bypass bun test`.

`bun run smoke:remote` launches the built app against a running node, finds a track, and plays it, then relaunches from the offline snapshot and checks the unreachable state. Set `RECORD_NODE_URL`, `RECORD_SMOKE_TITLE`, and `RECORD_SMOKE_ARTIST` to choose the node and the track. The script header documents the optional live-update and offline-relaunch checks. The remote smoke stays read-only: it never plays long enough to record a listen.

`bun run smoke:local` starts its own record-node in process and walks every write in the built app against it: search, sort, and the tag filter; tagging; import by file picker, drop, URL, and CID; linking, connecting, and unlinking a library; the library profile; identity export (then checks no file in the app profile holds the key); listens, peers, a hotkey, and a gapless transition with its listen and Media Session. It needs `ffmpeg` and `fpcalc`, like the integration test. CI runs it under `xvfb-run`.

`bun run smoke:packaged` mounts the packaged `.dmg` and runs the app from it. It checks that the fuses keep `ELECTRON_RUN_AS_NODE` off and that the bundled node runs as a utility process loading its own architecture's native binary. It then plays a track from a data directory seeded in process. Set `RECORD_PACKAGED_ARCH=x86_64` to run the Intel slice under Rosetta.

## Security

The renderer never talks to the node. The main process makes every request with Node's built-in `fetch`, accepting only a method and path template from the API definition, and the renderer reaches it through a narrow preload bridge. The renderer runs sandboxed with context isolation and a strict Content Security Policy, served from an `app://` scheme rather than `file://`. Packaged builds set Electron's recommended fuses: no `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, or inspect arguments, cookie encryption on, and the app loaded only from its integrity-checked asar.

## License

MIT. See [LICENSE.md](LICENSE.md).
