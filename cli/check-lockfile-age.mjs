#!/usr/bin/env node
// Refuse lockfile changes that introduce a package@version published less than
// --days days ago. Universal across yarn1/Berry/npm/bun: works on the textual
// diff, no per-format parsing. See:
//   user:guideline/npm-supply-chain-hygiene.md (Minimum Release Age)
//   user:text/software-dev/supply-chain-defense-posture.md
//
// Usage:
//   node check-lockfile-age.mjs [lockfile] [--base <ref>] [--days N]
//
// Defaults: lockfile auto-detected, --base HEAD, --days 7.
// Override per-entry by listing `pkg@version` in .youngpkg-allow at repo root.
// Exit 0 = clean. Exit 1 = at least one too-young package. Exit 2 = usage error.

import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

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

let addedText
try {
  const diff = execSync(`git diff ${base} -- ${lockfile}`, { encoding: 'utf8' })
  addedText = diff
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .join('\n')
  if (!addedText.trim()) {
    console.error(`OK: no additions in ${lockfile} vs ${base}.`)
    process.exit(0)
  }
} catch {
  // No git base available (fresh shallow clone, unborn ref); fall back to
  // scanning the whole lockfile. Steady-state CI shouldn't hit this path.
  addedText = readFileSync(lockfile, 'utf8')
}

const re =
  /(?:^|[^a-z0-9_-])((?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+)@(\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?(?:\+[a-z0-9.-]+)?)\b/gi
const candidates = new Set()
for (const m of addedText.matchAll(re)) candidates.add(`${m[1]}@${m[2]}`)

const cutoff = Date.now() - days * 86_400_000
const violations = []
const registryCache = new Map()

for (const spec of candidates) {
  if (allow.has(spec)) continue
  const at = spec.lastIndexOf('@')
  const name = spec.slice(0, at)
  const version = spec.slice(at + 1)
  let meta = registryCache.get(name)
  if (!meta) {
    try {
      const r = await fetch(`https://registry.npmjs.org/${name}`, {
        headers: { accept: 'application/vnd.npm.install-v1+json' }
      })
      if (!r.ok) {
        registryCache.set(name, null)
        continue
      }
      meta = await r.json()
      registryCache.set(name, meta)
    } catch {
      registryCache.set(name, null)
      continue
    }
  }
  if (!meta) continue
  const t = meta.time?.[version]
  if (!t) continue
  if (new Date(t).getTime() > cutoff) {
    violations.push({ spec, published: t })
  }
}

if (violations.length) {
  console.error(
    `Refusing ${lockfile}: ${violations.length} package(s) published in last ${days} days:`
  )
  for (const v of violations) console.error(`  ${v.spec}  (published ${v.published})`)
  console.error(`Override: add to ${allowFile} (one "pkg@version" per line) or rerun with --days N.`)
  process.exit(1)
}

console.error(`OK: no package@version younger than ${days} days in ${lockfile} diff vs ${base}.`)

function autoDetectLockfile() {
  for (const f of ['yarn.lock', 'package-lock.json', 'bun.lock', 'pnpm-lock.yaml']) {
    if (existsSync(f)) return f
  }
  return null
}
