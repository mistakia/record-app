---
title: record-app Repository Graph Entry
type: text
description: >-
  Graph entry point for the record-app application-layer repository (Electron / React Native / web
  UI for Record), mapping it to sibling Record ecosystem repos, the protocol spec, and the record
  task directory.
base_uri: user:repository/active/record-app/ABOUT.md
created_at: '2026-05-13T18:03:58.003Z'
entity_id: 3f6fd760-c279-487e-aa92-b7ba7455869b
owner_identity_uri: user:identity/trashman.md
public_read: false
relations:
  - follows [[user:guideline/directory-markdown-standards.md]]
tags:
  - user:tag/record-project.md
updated_at: '2026-05-13T18:03:58.003Z'
---

## Purpose

Application layer (desktop / mobile / web UI) for **Record** — a distributed peer-to-peer audio file management system built on IPFS. This repo holds the React app, Electron and React Native shells, importer, and player. Protocol semantics and node behavior live in sibling repos.

For public overview, see [[README.md]]. For build, run, and architecture, see [[CLAUDE.md]].

## Context

The Record ecosystem spans several repos. This one is the user-facing app; coordinated changes that touch protocol or node behavior land in the relevant sibling first.

## Notable Context

**Tag**: [[user:tag/record-project.md]] — entities across the Record ecosystem.

**Sibling repositories**:

- [[user:repository/active/record-docs/ABOUT.md]] — protocol specification (canonical for protocol semantics)
- `repository/active/record-node/` — core node implementation (networking, storage, indexing, sync)
- `repository/active/record-chrome-extension/` — web import tool
- `repository/active/record-resolver/` — IPFS resolution layer

**Task directory**: [[user:task/record/]] — open work across the ecosystem (app rebuild, chrome extension rebuild, node API server, ipfsd exclusion, deduplication).

**Governing guidelines**:

- [[user:guideline/directory-markdown-standards.md]] — structure for this file
- [[user:guideline/single-source-of-truth.md]] — protocol semantics are canonical in `record-docs` and `record-node`; app docs link rather than restate

## Scope

**Belongs in this repo**: React app, Electron and RN shells, application state, importer/player UI, app-level CLI.

**Belongs elsewhere**:

- Protocol specification → `record-docs/`
- Node behavior, networking, storage, indexing → `record-node/`
- Open work, planned features → `task/record/`
