// The dependency audit gate (spec §8.10.8). Runs `bun audit --json --prod`
// over the shipped closure and fails on any high or critical advisory that
// audit-allowlist.json does not cover. An entry covers one advisory for one
// installed package version and carries a justification and a review-by
// date; an expired entry fails, and so does an entry nothing matches any more,
// so the allowlist never outlives its reason.
//
// Usage: node cli/check-audit.ts [--report <bun audit json>]
// Exit 0 = clean. Exit 1 = an uncovered advisory or a stale entry. Exit 2 =
// the audit could not run or its output did not parse.

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

export interface AllowlistEntry {
  advisory: string
  package: string
  version: string
  justification: string
  review_by: string
}

const GATED = new Set(['high', 'critical'])

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

// Every name@version bun.lock installs, by package name.
export const installed_versions = (lockfile_text: string): Map<string, Set<string>> => {
  const lock = JSON.parse(lockfile_text.replace(/,(\s*[}\]])/g, '$1')) as { packages: Record<string, [string, ...unknown[]]> }
  const versions = new Map<string, Set<string>>()
  for (const [spec] of Object.values(lock.packages)) {
    const at = spec.lastIndexOf('@')
    if (at <= 0) continue
    const name = spec.slice(0, at)
    const set = versions.get(name) ?? new Set<string>()
    set.add(spec.slice(at + 1))
    versions.set(name, set)
  }
  return versions
}

export const evaluate_audit = ({ report, installed, allowlist, today }: {
  report: AuditReport
  installed: Map<string, Set<string>>
  allowlist: AllowlistEntry[]
  today: string
}): { problems: string[], allowed: string[] } => {
  const problems: string[] = []
  const allowed: string[] = []
  const used = new Set<AllowlistEntry>()
  for (const entry of allowlist) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.review_by)) problems.push(`${entry.advisory} ${entry.package}@${entry.version}: review_by is not a YYYY-MM-DD date`)
    else if (entry.review_by < today) problems.push(`${entry.advisory} ${entry.package}@${entry.version}: the allowlist entry expired on ${entry.review_by}; review it`)
    if (entry.justification.trim() === '') problems.push(`${entry.advisory} ${entry.package}@${entry.version}: no justification`)
  }
  for (const [name, advisories] of Object.entries(report)) {
    for (const advisory of advisories) {
      if (!GATED.has(advisory.severity)) continue
      const id = advisory_id(advisory.url)
      const hit = [...(installed.get(name) ?? [])].filter((version) => in_range(version, advisory.vulnerable_versions))
      // bun reported it, so something installed is affected even when the
      // range is one this parser reads differently.
      for (const version of hit.length === 0 ? ['(unresolved)'] : hit) {
        const entry = allowlist.find((candidate) => candidate.advisory === id && candidate.package === name && candidate.version === version)
        const label = `${id} ${name}@${version} (${advisory.severity}): ${advisory.title}`
        if (entry === undefined) {
          problems.push(`${label}\n    not in audit-allowlist.json; upgrade it or add an entry with a justification`)
        } else {
          used.add(entry)
          allowed.push(`${label}\n    allowed until ${entry.review_by}: ${entry.justification}`)
        }
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
            return execFileSync('bun', ['audit', '--json', '--prod'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
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
  const { problems, allowed } = evaluate_audit({
    report,
    installed: installed_versions(readFileSync(`${root}bun.lock`, 'utf8')),
    allowlist: JSON.parse(readFileSync(`${root}audit-allowlist.json`, 'utf8')) as AllowlistEntry[],
    today: new Date().toISOString().slice(0, 10)
  })
  for (const line of allowed) console.log(`allowed: ${line}`)
  for (const line of problems) console.error(`FAIL: ${line}`)
  if (problems.length > 0) process.exit(1)
  console.log('audit gate passed')
}
