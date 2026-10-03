#!/usr/bin/env node
// Refuse lockfile changes that introduce a package@version published less than
// --days days ago. Parses yarn1, Yarn Berry, npm (package-lock v1-v3), bun and
// pnpm lockfiles into registry name@version pairs, compares the working-tree
// lockfile against --base, and checks each added pair's publish time in the
// full npm packument. A pair whose publish time cannot be verified fails
// closed. Canonical copy lives in the base repo; other repos vendor it
// byte-identical. See:
//   user:guideline/software/npm-supply-chain-hygiene.md (Minimum Release Age)
//   user:text/software-dev/supply-chain-defense-posture.md
//
// Usage:
//   node check-lockfile-age.mjs [lockfile] [--base <ref>] [--days N]
//
// Defaults: lockfile auto-detected, --base HEAD, --days 7.
// Override per-entry by listing `pkg@version` in .youngpkg-allow at repo root.
// Exit 0 = clean. Exit 1 = too-young or unverifiable package. Exit 2 = usage
// error or a lockfile that parses to no packages.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'

const argv = process.argv.slice(2)
const flags = {}
const positional = []
for (let i = 0; i < argv.length; i++) {
  const a = argv[i]
  if (a.startsWith('--')) flags[a.slice(2)] = argv[++i]
  else positional.push(a)
}

const lockfile = positional[0] || autoDetectLockfile()
const days = Number(flags.days ?? 7)
const base = flags.base ?? 'HEAD'
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?(?:\+[0-9a-z.-]+)?$/i

if (!lockfile || !existsSync(lockfile)) {
  console.error(`No lockfile found (tried: ${lockfile || 'auto-detect'})`)
  process.exit(2)
}

const allowFile = '.youngpkg-allow'
const allow = existsSync(allowFile)
  ? new Set(
      readFileSync(allowFile, 'utf8')
        .split('\n')
        .map((l) => l.split('#')[0].trim())
        .filter(Boolean)
    )
  : new Set()

const current = parseLockfile(lockfile, readFileSync(lockfile, 'utf8'))
if (!current.size) {
  console.error(`Parsed no packages from ${lockfile}; format not recognized.`)
  process.exit(2)
}

let previous = new Set()
try {
  const text = execFileSync('git', ['show', `${base}:./${lockfile}`], {
    encoding: 'utf8',
    maxBuffer: 1 << 30,
    stdio: ['ignore', 'pipe', 'ignore']
  })
  previous = parseLockfile(lockfile, text)
} catch {
  // No lockfile at the base (new file, unborn or shallow ref): every entry is
  // an addition. Steady-state CI shouldn't hit this path.
  console.error(`No ${lockfile} at ${base}; checking every entry.`)
}

const candidates = [...current].filter(
  (spec) => !previous.has(spec) && !allow.has(spec)
)
if (!candidates.length) {
  console.error(`OK: no package additions in ${lockfile} vs ${base}.`)
  process.exit(0)
}

const cutoff = Date.now() - days * 86_400_000
const violations = []
const unverified = []
const packuments = new Map()

// The full packument, not the abbreviated install-v1 document: only the full
// form carries `time`, and without it every lookup used to skip silently.
function packument(name) {
  if (!packuments.has(name)) {
    const url = `https://registry.npmjs.org/${name.replace('/', '%2f')}`
    packuments.set(name, fetchPackument(url))
  }
  return packuments.get(name)
}

// A single transient `fetch failed` used to fail the whole check closed, so a
// network error, 429 or 5xx is retried with backoff. A 404 or other 4xx is an
// answer, not a transient, and fails at once.
const ATTEMPTS = 3
async function fetchPackument(url) {
  let error
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    if (attempt > 1)
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * 2 ** (attempt - 2))
      )
    try {
      const r = await fetch(url, { headers: { accept: 'application/json' } })
      if (r.ok) return await r.json()
      error = `HTTP ${r.status}`
      if (r.status !== 429 && r.status < 500) break
    } catch (err) {
      error = err.message
    }
  }
  return { error }
}

const queue = [...candidates]
async function worker() {
  while (queue.length) {
    const spec = queue.shift()
    const at = spec.lastIndexOf('@')
    const meta = await packument(spec.slice(0, at))
    const t = meta.time?.[spec.slice(at + 1)]
    if (!t) {
      unverified.push({
        spec,
        reason: meta.error ?? 'no publish time in registry metadata'
      })
    } else if (new Date(t).getTime() > cutoff) {
      violations.push({ spec, published: t })
    }
  }
}
await Promise.all(Array.from({ length: 16 }, worker))

for (const u of unverified)
  console.error(`Unverified: ${u.spec}  (${u.reason})`)

if (violations.length) {
  console.error(
    `Refusing ${lockfile}: ${violations.length} package(s) published in last ${days} days:`
  )
  for (const v of violations)
    console.error(`  ${v.spec}  (published ${v.published})`)
}
if (violations.length || unverified.length) {
  if (unverified.length)
    console.error(
      `Refusing ${lockfile}: ${unverified.length} package(s) with no verifiable publish time.`
    )
  console.error(
    `Override: add to ${allowFile} (one "pkg@version" per line) or rerun with --days N.`
  )
  process.exit(1)
}

console.error(
  `OK: ${candidates.length} added package(s) in ${lockfile} vs ${base}, none younger than ${days} days.`
)

function autoDetectLockfile() {
  for (const f of [
    'bun.lock',
    'yarn.lock',
    'package-lock.json',
    'pnpm-lock.yaml'
  ]) {
    if (existsSync(f)) return f
  }
  return null
}

// Returns a Set of `name@version` for every package the lockfile resolves from
// the npm registry. Workspace, git, file, link and patch entries are skipped.
function parseLockfile(file, text) {
  const name = basename(file)
  if (name === 'bun.lock') return parseBun(text)
  if (name === 'package-lock.json' || name === 'npm-shrinkwrap.json')
    return parseNpm(text)
  if (name === 'pnpm-lock.yaml') return parsePnpm(text)
  if (name === 'yarn.lock')
    return /^__metadata:/m.test(text) ? parseYarnBerry(text) : parseYarn1(text)
  console.error(`Unsupported lockfile: ${file}`)
  process.exit(2)
}

function splitSpec(spec) {
  const at = spec.lastIndexOf('@')
  return at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, '']
}

// bun.lock packages: "key": ["name@version", "", {...}, "sha512-..."]
function parseBun(text) {
  const out = new Set()
  for (const m of text.matchAll(/^\s+"[^"]+": \["([^"]+)"/gm)) {
    const [n, v] = splitSpec(m[1])
    if (SEMVER.test(v)) out.add(`${n}@${v}`)
  }
  return out
}

// yarn1: `name@range, name@range2:` header, then `  version "x"` and
// `  resolved "<registry>/name/-/name-x.tgz#sha"`. An alias header
// `alias@npm:real@range` resolves to the real package.
function parseYarn1(text) {
  const out = new Set()
  for (const block of text.split(/\n(?=\S)/)) {
    const lines = block.split('\n')
    if (!lines[0].endsWith(':') || lines[0].startsWith('#')) continue
    const first = lines[0].slice(0, -1).split(', ')[0].replace(/^"|"$/g, '')
    let [n, range] = splitSpec(first)
    if (range.startsWith('npm:')) n = splitSpec(range.slice(4))[0]
    const version = block.match(/^ {2}version "([^"]+)"/m)?.[1]
    const resolved = block.match(/^ {2}resolved "([^"]+)"/m)?.[1]
    if (resolved && !resolved.includes('/-/')) continue
    if (version && SEMVER.test(version)) out.add(`${n}@${version}`)
  }
  return out
}

// Yarn Berry: `  resolution: "name@npm:x.y.z"`. Patch, workspace and git
// resolutions use other protocols and fall through.
function parseYarnBerry(text) {
  const out = new Set()
  for (const m of text.matchAll(/^ {2}resolution: "?(.+?)@npm:([^"\s]+)"?$/gm))
    if (SEMVER.test(m[2])) out.add(`${m[1]}@${m[2]}`)
  return out
}

// package-lock v2/v3 `packages` map, or v1 nested `dependencies` tree.
function parseNpm(text) {
  const out = new Set()
  const lock = JSON.parse(text)
  const add = (n, version, resolved) => {
    if (typeof version !== 'string') return
    if (version.startsWith('npm:')) [n, version] = splitSpec(version.slice(4))
    if (resolved && !resolved.includes('/-/')) return
    if (SEMVER.test(version)) out.add(`${n}@${version}`)
  }
  if (lock.packages) {
    for (const [key, entry] of Object.entries(lock.packages)) {
      if (!key || entry.link) continue
      const n = entry.name ?? key.slice(key.lastIndexOf('node_modules/') + 13)
      add(n, entry.version, entry.resolved)
    }
    return out
  }
  const walk = (deps) => {
    for (const [n, entry] of Object.entries(deps ?? {})) {
      add(n, entry.version, entry.resolved)
      walk(entry.dependencies)
    }
  }
  walk(lock.dependencies)
  return out
}

// pnpm: package keys `  /name@x.y.z:` (v5/v6) or `  name@x.y.z:` (v9),
// optionally quoted and with a `(peer@x)` suffix.
function parsePnpm(text) {
  const out = new Set()
  const re =
    /^ {2}'?\/?((?:@[^/@\s']+\/)?[^/@\s'(]+)[@/](\d+\.\d+\.\d+[^:'(\s]*)/gm
  for (const m of text.matchAll(re))
    if (SEMVER.test(m[2])) out.add(`${m[1]}@${m[2]}`)
  return out
}
