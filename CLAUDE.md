# CLAUDE.md

Guidance for Claude Code working in this repository.

For graph context (sibling repos in the Record ecosystem, task directory, protocol spec), see [ABOUT.md](ABOUT.md). For public overview, see [README.md](README.md).

## Project Overview

Desktop, mobile, and web application for **Record** — a distributed peer-to-peer audio file management system built on IPFS. This repo is the application layer (UI, app-level state, importer, player). Protocol and node implementation live in sibling repos `record-node` and `record-docs`.

React 16 + Redux + redux-saga. Electron (desktop), React Native (iOS / Android), web. Material-UI 4. Webpack 5 + Babel 7.

## Build / Run

```bash
yarn install

# Desktop (Electron)
yarn start:electron
yarn package:mac     # or :linux, :win

# Mobile (React Native + nodejs-mobile)
yarn install:nodejs-mobile
yarn start:rn
yarn build:ios
yarn start:android

# Lint / format
yarn lint:fix
```

## Architecture

```
src/
  core/                    # 25 subsystems (tracks, player, loglists, importer, dialogs, audio, utils, …)
  views/                   # React component tree
nodejs-assets/             # Node.js backend for mobile (via nodejs-mobile)
ios/, android/             # Native platform code
cli/                       # Command-line entry points
configs/                   # Webpack and build configs (main / renderer / background)
resources/                 # Icons and assets
```

State: Redux with redux-saga side effects.
Audio: `music-metadata` for parsing, Chromaprint fingerprinting, polyfilled playback on RN.

## Distributed Layer

Persistence is IPFS + OrbitDB + IPFS-Log. The local node lives in the sibling `record-node` repo and is the canonical source for protocol behavior — coordinate any protocol-affecting change there first.

## Related Repos

- `repository/active/record-docs/` — protocol specification (18KB README)
- `repository/active/record-node/` — node implementation, networking, storage, indexing
- `repository/active/record-ipfsd/` — IPFS daemon wrapper
- `repository/active/record-chrome-extension/` — web import tool
- `repository/active/record-resolver/` — IPFS resolution layer
