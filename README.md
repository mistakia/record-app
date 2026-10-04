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

**Status:** early rebuild. The app runs its own record-node by default (bundled mode) or connects to one you run elsewhere (remote mode). It browses, searches, and tags libraries over a virtualized list, plays a queue gaplessly with listen recording and macOS media controls, imports files and URLs, links and follows other libraries, edits the library profile, and shows and exports the node's identity. The track list updates live, the app shows when the node is unreachable, and it reopens on the last-viewed view from a local snapshot. It speaks record-docs v1.1: bearer-token sign-in to a remote node, several own libraries, a target library on every write and adoption between libraries, issuing and revoking capabilities with a filter editor, shared libraries, per-track pins, a per-library replication policy, and a head-check that refetches only what changed. It builds as a universal macOS app, ad-hoc signed and not notarized, and a `v*` tag publishes it to GitHub Releases. The bundled node imports files with the pinned ffmpeg and fpcalc the app ships. URL import works with a remote node only, since the app ships no downloader. Auto-update (electron-updater over GitHub Releases, installed at the next quit) is built and stays off, since Squirrel.Mac applies only a Developer ID-signed update.

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
bun run build:toolchain   # the pinned ffmpeg and fpcalc into toolchain/ (macOS)
bun run package:mac   # unsigned universal .dmg and update .zip into release/
bun run package:mac:test   # the same app, built to accept remote debugging, into release-test/
```

`build:toolchain` (`cli/build-toolchain.sh`) builds ffmpeg 7.1.1 from FFmpeg's release tarball for both architectures. It is LGPL, with only the containers the app imports, and comes out at about 5.6 MB universal. It also fetches chromaprint's universal fpcalc 1.5.1. Every download is pinned by SHA-256. The same commit and Xcode give the same bytes, and `toolchain/BUILD-INFO.txt` records the configure line and output hashes. The packaged app carries both tools in `Resources/bin` and their notices in `Resources/licenses`. A development run uses `toolchain/bin` when it exists. `test/toolchain/compare-ffmpeg.sh` checks that this ffmpeg tag-strips every importable container to the same bytes as a default-configured 7.1.1 build. Those bytes are what the content CID hashes.

`package:mac` first runs `bun run audit`, the dependency audit gate. It audits the whole lockfile and classifies each advisory as shipped or build-only from the dependency graph. Every devDependency must be classified in `package.json` `auditRoles`: the renderer libraries count as shipped because vite bundles them, and so does Electron itself. A high or critical advisory fails unless `audit-allowlist.json` justifies it for that scope, and each entry expires on its review-by date. It then builds the ingest toolchain, and installs the macOS optional dependencies for both architectures, so the universal app carries node-datachannel's Intel and Apple Silicon binaries.

A release is a `v*` tag matching `package.json`'s version. The Package workflow first runs `cli/check-release-gate.ts`, which refuses before any build unless the tag matches and the toolchain notice names a source-offer contact. Every build, release included, is ad-hoc signed and carries no Developer ID identity, so the app is not notarized. After the packaged smoke, `cli/verify-release.sh` checks the app in the release directory, the app on the `.dmg`, and the app inside the update `.zip`. Each must carry a sealed ad-hoc signature with no signing identity. Only then does a separate job, the only one with write access, publish the `.dmg`, the `.zip`, and `latest-mac.yml` to GitHub Releases. A version with a prerelease part is published as a GitHub prerelease, which only the beta update channel takes.

Because the app is not notarized, macOS blocks its first launch. Open Record once, dismiss the warning, then choose Open Anyway under System Settings > Privacy & Security, and confirm.

On first launch the app starts its own record-node in bundled mode, with its data in the app's Application Support directory and its log in `~/Library/Logs`. To keep the node's data elsewhere, choose Change beside the data directory on the Connection page. The node keeps its data in a `Record Node Data` subfolder of the folder you choose, made private to your account; the chosen folder itself is left as it is. The app asks first, does not move existing data, and restarts the node there. The Diagnostics page lists versions, paths, the node process, the event connection, and memory use for a bug report. To use a node you run elsewhere, choose Remote node on the Connection page, enter its URL (`http://127.0.0.1:3000` for a local record-node on its default port), test the connection, and save.

## Test

```bash
bun run verify   # lint and typecheck
bun test         # unit and integration tests
```

The integration test starts record-node in process and ingests a fixture, which needs `ffmpeg` and `fpcalc`. When their versions differ from record-node's pins, run `RECORD_TOOLCHAIN_PREFLIGHT=bypass bun test`.

`bun run smoke:remote` launches the built app against a running node, finds a track, and plays it, then relaunches from the offline snapshot and checks the unreachable state. Set `RECORD_NODE_URL`, `RECORD_SMOKE_TITLE`, and `RECORD_SMOKE_ARTIST` to choose the node and the track. The script header documents the optional live-update and offline-relaunch checks. The remote smoke stays read-only: it never plays long enough to record a listen.

`bun run smoke:local` starts its own record-node in process and walks every write in the built app against it: search, sort, and the tag filter; tagging; import by file picker, drop, URL, and CID; linking, connecting, and unlinking a library; the library profile; identity export (then checks no file in the app profile holds the key); listens, peers, a hotkey, and a gapless transition with its listen and Media Session. In bundled mode it ingests a dropped file through the pinned toolchain, which on macOS must be built first (`bun run build:toolchain`). It needs `ffmpeg` and `fpcalc` for the in-process node, like the integration test. CI runs it under `xvfb-run`.

`bun run smoke:packaged` mounts both packaged `.dmg` files. It reads every fuse back from both and expects an exact match, and checks that the release build exits rather than run with `--remote-debugging-port`. It then drives the test build, the only one that accepts remote debugging, which is baked in at build time. It checks that `ELECTRON_RUN_AS_NODE` stays off and that the bundled node runs as a utility process loading its own architecture's native binary. It then plays a track from a data directory seeded in process, and ingests a file through the packaged ffmpeg and fpcalc. Set `RECORD_PACKAGED_ARCH=x86_64` to run the Intel slice under Rosetta. The Package workflow runs both packages and both slices on macOS, by hand (unsigned, publishing nothing) or on a `v*` tag.

## Security

The renderer never talks to the node. The main process makes every request with Node's built-in `fetch`, accepting only a method and path template from the API definition, and the renderer reaches it through a narrow preload bridge. The renderer runs sandboxed with context isolation and a strict Content Security Policy, served from an `app://` scheme rather than `file://`. Packaged builds set Electron's recommended fuses: no `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, or inspect arguments, cookie encryption on, and the app loaded only from its integrity-checked asar.

## License

MIT. See [LICENSE.md](LICENSE.md).
