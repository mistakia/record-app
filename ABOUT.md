---
title: record-app Repository Graph Entry
type: text
description: >-
  Graph entry for record-app, the Electron and React 19 client of record-node per spec chapter 8.
  Both operating modes and the record-docs v1.1 surfaces work; a signed release waits on operator
  credentials.
base_uri: user:repository/active/record-app/ABOUT.md
created_at: '2026-05-13T18:03:58.003Z'
entity_id: 3f6fd760-c279-487e-aa92-b7ba7455869b
owner_identity_uri: user:identity/trashman.md
public_read: false
relations:
  - follows [[user:guideline/directory-markdown-standards.md]]
tags:
  - user:tag/record-project.md
updated_at: '2026-10-03T22:30:36.710Z'
---

## Purpose

Desktop application for **Record** — a distributed peer-to-peer system for audio libraries. An Electron + React client of `record-node` that holds no protocol logic: it talks to one node at a time over the chapter 7 HTTP and WebSocket API, under the contract in spec chapter 8.

For public overview, see [[README.md]]. For build, run, and architecture, see [[CLAUDE.md]].

## Context

The Record ecosystem spans several repos. This one is the user-facing desktop app. Protocol semantics live in `record-docs`, and node behavior in `record-node`, which this app installs as a git dependency pinned by commit. The legacy React Native / OrbitDB app is preserved at the `legacy-v0` tag.

## Notable Context

**Tag**: [[user:tag/record-project.md]] — entities across the Record ecosystem.

**Rebuild plan**: [[user:task/record/record-app-rebuild.md]] — phases, scope, and what waits on a signed release.

**Sibling repositories**:

- [[user:repository/active/record-docs/ABOUT.md]] — protocol specification (canonical for protocol semantics)
- `repository/active/record-node/` — node implementation (networking, storage, indexing, the HTTP API)
- `repository/active/record-chrome-extension/` — web import tool
- `repository/active/record-resolver/` — URL resolution for ingest

**Task directory**: [[user:task/record/]] — open work across the ecosystem.

**Governing guidelines**:

- [[user:guideline/directory-markdown-standards.md]] — structure for this file
- [[user:guideline/single-source-of-truth.md]] — protocol semantics are canonical in `record-docs` and `record-node`; app docs link rather than restate

## Scope

**Belongs in this repo**: the Electron main process (window, IPC, node client), the preload bridge, the React renderer (pages, player, state), and app-level tests and CLI scripts.

**Belongs elsewhere**:

- Protocol specification → `record-docs/`
- Node behavior, the HTTP and WebSocket API → `record-node/`
- Open work, planned features → `task/record/`
