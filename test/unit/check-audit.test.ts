import { describe, expect, test } from 'bun:test'

import { check_roles, evaluate_audit, in_range, installed_versions, parse_lockfile, shipped_packages, type AllowlistEntry, type AuditReport } from '../../cli/check-audit.ts'

const advisory = (id: string, severity: string, range: string) => ({ url: `https://github.com/advisories/${id}`, title: `${id} title`, severity, vulnerable_versions: range })
const entry = (overrides: Partial<AllowlistEntry> = {}): AllowlistEntry => ({ advisory: 'GHSA-aaaa', package: 'pkg', version: '1.0.0', scope: 'build', justification: 'Unreachable.', review_by: '2027-01-01', ...overrides })
const installed = new Map([['pkg', new Set(['1.0.0', '2.0.0'])], ['other', new Set(['3.1.0'])]])
const run = (report: AuditReport, allowlist: AllowlistEntry[], { today = '2026-10-03', shipped = new Set<string>() } = {}) =>
  evaluate_audit({ report, installed, shipped, allowlist, today })

// app ships `lib` (a production dependency) and `ui` (a bundled devDependency)
// with their closures, and `runtime` without its installer dependency.
const LOCK = `{
  "lockfileVersion": 2,
  "workspaces": { "": { "dependencies": { "lib": "1.0.0" }, "devDependencies": { "ui": "1.0.0", "runtime": "1.0.0", "tool": "1.0.0" }, }, },
  "packages": {
    "lib": ["lib@1.0.0", "", { "dependencies": { "shared": "^1" } }, "sha"],
    "lib/shared": ["shared@1.5.0", "", {}, "sha"],
    "shared": ["shared@2.0.0", "", {}, "sha"],
    "ui": ["ui@1.0.0", "", { "dependencies": { "@s/peer": "^1" } }, "sha"],
    "@s/peer": ["@s/peer@1.0.0", "", {}, "sha"],
    "runtime": ["runtime@1.0.0", "", { "dependencies": { "downloader": "^1" } }, "sha"],
    "downloader": ["downloader@1.0.0", "", {}, "sha"],
    "tool": ["tool@1.0.0", "", { "dependencies": { "shared": "^2" } }, "sha"],
  },
}`
const ROLES = { shipped: ['ui'], shippedPackageOnly: ['runtime'], build: ['tool'] }

describe('audit gate', () => {
  test('reads npm advisory ranges', () => {
    expect(in_range('3.0.3', '<=3.0.3')).toBe(true)
    expect(in_range('3.0.4', '<=3.0.3')).toBe(false)
    expect(in_range('1.5.0', '>=1.0.0 <2.0.0')).toBe(true)
    expect(in_range('2.0.0', '>=1.0.0 <2.0.0')).toBe(false)
    expect(in_range('4.0.0', '<1.0.0 || >=4.0.0')).toBe(true)
  })

  test('classifies shipped packages from the lockfile graph, nested copies included', () => {
    const lock = parse_lockfile(LOCK)
    expect([...shipped_packages(lock, ROLES)].sort()).toEqual(['@s/peer@1.0.0', 'lib@1.0.0', 'runtime@1.0.0', 'shared@1.5.0', 'ui@1.0.0'])
    expect([...(installed_versions(lock).get('shared') ?? [])].sort()).toEqual(['1.5.0', '2.0.0'])
    expect(check_roles(lock, ROLES)).toEqual([])
  })

  test('fails an unclassified devDependency, a stray name, and a double classification', () => {
    const lock = parse_lockfile(LOCK)
    expect(check_roles(lock, { shipped: ['ui', 'gone'], shippedPackageOnly: ['runtime'], build: ['ui'] })).toEqual([
      expect.stringContaining('devDependency tool is not classified'),
      expect.stringContaining('classifies ui more than once'),
      expect.stringContaining('names gone, which is not a devDependency')
    ])
  })

  test('passes an allowlisted high advisory on the affected version only, in the scope it was justified for', () => {
    const result = run({ pkg: [advisory('GHSA-aaaa', 'HIGH', '<2.0.0')] }, [entry()])
    expect(result.problems).toEqual([])
    expect(result.allowed).toHaveLength(1)
    const shipped = run({ pkg: [advisory('GHSA-aaaa', 'high', '<2.0.0')] }, [entry()], { shipped: new Set(['pkg@1.0.0']) })
    expect(shipped.problems).toEqual([expect.stringContaining('justified for build use, but the package is shipped')])
  })

  test('fails an uncovered high or critical, whatever its case, and ignores moderate', () => {
    const result = run({ pkg: [advisory('GHSA-aaaa', 'Critical', '<=2.0.0'), advisory('GHSA-bbbb', 'moderate', '<=2.0.0')] }, [entry()])
    expect(result.problems).toEqual([expect.stringContaining('GHSA-aaaa pkg@2.0.0 (critical, build)')])
  })

  test('fails an advisory no installed version matches, rather than allowing it', () => {
    expect(run({ pkg: [advisory('GHSA-cccc', 'high', '>=9.0.0')] }, []).problems).toEqual([expect.stringContaining('no installed version matched')])
  })

  test('fails an expired entry, an entry with no justification, an inexact version, and an entry nothing matches', () => {
    const report = { pkg: [advisory('GHSA-aaaa', 'high', '<2.0.0')] }
    expect(run(report, [entry()], { today: '2027-01-02' }).problems).toEqual([expect.stringContaining('expired on 2027-01-01')])
    expect(run(report, [entry({ justification: ' ' })]).problems).toEqual([expect.stringContaining('no justification')])
    expect(run(report, [entry(), entry({ version: '(unresolved)' })]).problems).toEqual([
      expect.stringContaining('(unresolved): version must be an exact installed version'),
      expect.stringContaining('(unresolved): the allowlist entry matches no current advisory')
    ])
    expect(run(report, [entry(), entry({ advisory: 'GHSA-gone', package: 'other', version: '3.1.0' })]).problems)
      .toEqual([expect.stringContaining('GHSA-gone other@3.1.0: the allowlist entry matches no current advisory')])
  })
})
