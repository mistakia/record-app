// The dependency audit gate (spec §8.10.8). Runs `bun audit --json` over the
// whole lockfile and fails on any high or critical advisory that
// audit-allowlist.json does not cover.
//
// Every advisory is classified as shipped or build-only from bun.lock's
// dependency graph, not by `--prod`, because the app ships more than its
// production dependencies: electron-vite bundles React and the other renderer
// libraries (devDependencies) into the renderer, and Electron itself is the
// runtime. package.json `auditRoles` classifies every devDependency:
// `shipped` (bundled, with its whole dependency closure), `shippedPackageOnly`
// (Electron: the package ships as the runtime binary, while its npm
// dependencies only download it), or `build`. An unclassified devDependency
// fails, so a new one cannot slip in unexamined. The production dependencies
// (record-node) are shipped with their closure.
//
// An allowlist entry covers one advisory for one installed package version,
// names the scope it was justified for (an entry written for build-only use
// fails once the package ships), and carries a justification and a review-by
// date. An expired entry fails, and so does an entry nothing matches any more.
//
// Usage: node cli/check-audit.ts [--report <bun audit json>]
// Exit 0 = clean. Exit 1 = an uncovered advisory, a stale or invalid entry,
// or an unclassified devDependency. Exit 2 = the audit could not run or its
// output did not parse.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export interface Advisory {
  url: string
  title: string
  severity: string
  vulnerable_versions: string
}

export type AuditReport = Record<string, Advisory[]>

export type Scope = 'shipped' | 'build'

export interface AllowlistEntry {
  advisory: string
  package: string
  version: string
  scope: Scope
  justification: string
  review_by: string
}

export interface AuditRoles {
  shipped: string[]
  shippedPackageOnly: string[]
  build: string[]
}

interface Lockfile {
  workspaces: Record<string, { dependencies?: Record<string, string>, devDependencies?: Record<string, string> }>
  packages: Record<string, unknown[]>
}

const GATED = new Set(['high', 'critical'])
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

const advisory_id = (url: string): string => url.slice(url.lastIndexOf('/') + 1)

const parse_version = (version: string): number[] =>
  version.replace(/^v/, '').split(/[-+]/)[0]?.split('.').map((part) => Number.parseInt(part, 10) || 0) ?? []

const compare = (left: string, right: string): number => {
  const [a, b] = [parse_version(left), parse_version(right)]
  for (let index = 0; index < 3; index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

// The advisory ranges npm reports: comparator sets joined by `||`, each a
// list of `<`, `<=`, `>`, `>=`, `=` comparators.
export const in_range = (version: string, range: string): boolean =>
  range.split('||').some((set) => set.trim().split(/[\s,]+/).filter(Boolean).every((comparator) => {
    const match = /^(<=|>=|<|>|=)?\s*(.+)$/.exec(comparator)
    if (match === null) return false
    const order = compare(version, match[2] as string)
    switch (match[1]) {
      case '<': return order < 0
      case '<=': return order <= 0
      case '>': return order > 0
      case '>=': return order >= 0
      default: return order === 0
    }
  }))

export const parse_lockfile = (text: string): Lockfile => JSON.parse(text.replace(/,(\s*[}\]])/g, '$1')) as Lockfile

const split_spec = (spec: string): { name: string, version: string } => {
  const at = spec.lastIndexOf('@')
  return at <= 0 ? { name: spec, version: '' } : { name: spec.slice(0, at), version: spec.slice(at + 1) }
}

const dependencies_of = (entry: unknown[]): string[] => {
  const info = entry.find((part): part is Record<string, Record<string, string> | undefined> => typeof part === 'object' && part !== null && !Array.isArray(part))
  return [info?.dependencies, info?.optionalDependencies, info?.peerDependencies].flatMap((group) => Object.keys(group ?? {}))
}

// A lock key is the package's install path: names joined by `/`, scoped
// names keeping their own `/`.
const key_names = (key: string): string[] => {
  const names: string[] = []
  const parts = key.split('/')
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index] as string
    names.push(part.startsWith('@') ? `${part}/${parts[++index] ?? ''}` : part)
  }
  return names
}

// Where `name` resolves from the package at `from`: its own nested copy, then
// each enclosing level, then the top level, as node_modules lookup does.
const resolve_key = (packages: Lockfile['packages'], from: string | null, name: string): string | null => {
  const path = from === null ? [] : key_names(from)
  for (let depth = path.length; depth >= 0; depth--) {
    const key = [...path.slice(0, depth), name].join('/')
    if (key in packages) return key
  }
  return null
}

// Every name@version bun.lock installs, by package name.
export const installed_versions = (lock: Lockfile): Map<string, Set<string>> => {
  const versions = new Map<string, Set<string>>()
  for (const entry of Object.values(lock.packages)) {
    const { name, version } = split_spec(entry[0] as string)
    if (version === '') continue
    versions.set(name, (versions.get(name) ?? new Set<string>()).add(version))
  }
  return versions
}

// Every devDependency classified exactly once, and only devDependencies.
export const check_roles = (lock: Lockfile, roles: AuditRoles): string[] => {
  const dev = Object.keys(lock.workspaces['']?.devDependencies ?? {})
  const classified = [...roles.shipped, ...roles.shippedPackageOnly, ...roles.build]
  const problems = dev.filter((name) => !classified.includes(name)).map((name) => `devDependency ${name} is not classified in package.json auditRoles (shipped, shippedPackageOnly, or build)`)
  for (const name of new Set(classified)) {
    if (!dev.includes(name)) problems.push(`auditRoles names ${name}, which is not a devDependency`)
    if (classified.filter((other) => other === name).length > 1) problems.push(`auditRoles classifies ${name} more than once`)
  }
  return problems
}

// The name@version of every package the app ships.
export const shipped_packages = (lock: Lockfile, roles: AuditRoles): Set<string> => {
  const keys = new Set<string>()
  const queue = [...Object.keys(lock.workspaces['']?.dependencies ?? {}), ...roles.shipped]
    .map((name) => resolve_key(lock.packages, null, name)).filter((key): key is string => key !== null)
  while (queue.length > 0) {
    const key = queue.pop() as string
    if (keys.has(key)) continue
    keys.add(key)
    for (const name of dependencies_of(lock.packages[key] ?? [])) {
      const next = resolve_key(lock.packages, key, name)
      if (next !== null && !keys.has(next)) queue.push(next)
    }
  }
  for (const name of roles.shippedPackageOnly) {
    const key = resolve_key(lock.packages, null, name)
    if (key !== null) keys.add(key)
  }
  return new Set([...keys].map((key) => {
    const { name, version } = split_spec(lock.packages[key]?.[0] as string)
    return `${name}@${version}`
  }))
}

export const evaluate_audit = ({ report, installed, shipped, allowlist, today }: {
  report: AuditReport
  installed: Map<string, Set<string>>
  shipped: Set<string>
  allowlist: AllowlistEntry[]
  today: string
}): { problems: string[], allowed: string[] } => {
  const problems: string[] = []
  const allowed: string[] = []
  const used = new Set<AllowlistEntry>()
  for (const entry of allowlist) {
    const label = `${entry.advisory} ${entry.package}@${entry.version}`
    if (!VERSION.test(entry.version)) problems.push(`${label}: version must be an exact installed version`)
    if (entry.scope !== 'shipped' && entry.scope !== 'build') problems.push(`${label}: scope must be shipped or build`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.review_by)) problems.push(`${label}: review_by is not a YYYY-MM-DD date`)
    else if (entry.review_by < today) problems.push(`${label}: the allowlist entry expired on ${entry.review_by}; review it`)
    if (entry.justification.trim() === '') problems.push(`${label}: no justification`)
  }
  for (const [name, advisories] of Object.entries(report)) {
    for (const advisory of advisories) {
      const severity = advisory.severity.toLowerCase()
      if (!GATED.has(severity)) continue
      const id = advisory_id(advisory.url)
      const hit = [...(installed.get(name) ?? [])].filter((version) => in_range(version, advisory.vulnerable_versions))
      if (hit.length === 0) {
        // bun reported it, so something installed is affected; a range this
        // parser cannot place is never allowlistable.
        problems.push(`${id} ${name} (${severity}): no installed version matched ${advisory.vulnerable_versions}; fix the range parsing or the dependency`)
        continue
      }
      for (const version of hit) {
        const scope: Scope = shipped.has(`${name}@${version}`) ? 'shipped' : 'build'
        const label = `${id} ${name}@${version} (${severity}, ${scope}): ${advisory.title}`
        const entry = allowlist.find((candidate) => candidate.advisory === id && candidate.package === name && candidate.version === version)
        if (entry === undefined) {
          problems.push(`${label}\n    not in audit-allowlist.json; upgrade it or add an entry with a justification`)
          continue
        }
        used.add(entry)
        if (entry.scope !== scope) problems.push(`${label}\n    the allowlist entry was justified for ${entry.scope} use, but the package is ${scope}`)
        else allowed.push(`${label}\n    allowed until ${entry.review_by}: ${entry.justification}`)
      }
    }
  }
  for (const entry of allowlist) {
    if (!used.has(entry)) problems.push(`${entry.advisory} ${entry.package}@${entry.version}: the allowlist entry matches no current advisory; remove it`)
  }
  return { problems, allowed }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const report_flag = process.argv.indexOf('--report')
  let report: AuditReport
  try {
    // bun audit exits 1 when it finds anything; the JSON is on stdout either way.
    const text = report_flag === -1
      ? (() => {
          try {
            return execFileSync('bun', ['audit', '--json'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
          } catch (error) {
            const stdout = (error as { stdout?: string }).stdout
            if (stdout === undefined || stdout.trim() === '') throw error
            return stdout
          }
        })()
      : readFileSync(process.argv[report_flag + 1] as string, 'utf8')
    report = JSON.parse(text.trim() === '' ? '{}' : text) as AuditReport
  } catch (error) {
    console.error(`The audit did not run or did not parse: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }
  const lock = parse_lockfile(readFileSync(`${root}bun.lock`, 'utf8'))
  const roles = (JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { auditRoles: AuditRoles }).auditRoles
  const role_problems = check_roles(lock, roles)
  const { problems, allowed } = evaluate_audit({
    report,
    installed: installed_versions(lock),
    shipped: shipped_packages(lock, roles),
    allowlist: JSON.parse(readFileSync(`${root}audit-allowlist.json`, 'utf8')) as AllowlistEntry[],
    today: new Date().toISOString().slice(0, 10)
  })
  for (const line of allowed) console.log(`allowed: ${line}`)
  for (const line of [...role_problems, ...problems]) console.error(`FAIL: ${line}`)
  if (role_problems.length + problems.length > 0) process.exit(1)
  console.log('audit gate passed')
}
