import { describe, expect, test } from 'bun:test'

import { evaluate_audit, in_range, installed_versions, type AllowlistEntry, type AuditReport } from '../../cli/check-audit.ts'

const advisory = (id: string, severity: string, range: string) => ({ url: `https://github.com/advisories/${id}`, title: `${id} title`, severity, vulnerable_versions: range })
const entry = (overrides: Partial<AllowlistEntry> = {}): AllowlistEntry => ({ advisory: 'GHSA-aaaa', package: 'pkg', version: '1.0.0', justification: 'Unreachable.', review_by: '2027-01-01', ...overrides })
const installed = new Map([['pkg', new Set(['1.0.0', '2.0.0'])], ['other', new Set(['3.1.0'])]])
const run = (report: AuditReport, allowlist: AllowlistEntry[], today = '2026-10-03') => evaluate_audit({ report, installed, allowlist, today })

describe('audit gate', () => {
  test('reads npm advisory ranges', () => {
    expect(in_range('3.0.3', '<=3.0.3')).toBe(true)
    expect(in_range('3.0.4', '<=3.0.3')).toBe(false)
    expect(in_range('1.5.0', '>=1.0.0 <2.0.0')).toBe(true)
    expect(in_range('2.0.0', '>=1.0.0 <2.0.0')).toBe(false)
    expect(in_range('4.0.0', '<1.0.0 || >=4.0.0')).toBe(true)
  })

  test('reads installed versions from bun.lock, trailing commas and all', () => {
    const lock = '{ "lockfileVersion": 1, "packages": { "a": ["a@1.0.0", "", {}, "sha"], "b/a": ["a@2.0.0", "", {}, "sha"], "@s/c": ["@s/c@0.1.0", "", {}, "sha"], }, }'
    const versions = installed_versions(lock)
    expect([...(versions.get('a') ?? [])]).toEqual(['1.0.0', '2.0.0'])
    expect([...(versions.get('@s/c') ?? [])]).toEqual(['0.1.0'])
  })

  test('passes an allowlisted high advisory on the affected version only', () => {
    const result = run({ pkg: [advisory('GHSA-aaaa', 'high', '<2.0.0')] }, [entry()])
    expect(result.problems).toEqual([])
    expect(result.allowed).toHaveLength(1)
  })

  test('fails an uncovered high or critical, and ignores moderate', () => {
    const result = run({ pkg: [advisory('GHSA-aaaa', 'critical', '<=2.0.0'), advisory('GHSA-bbbb', 'moderate', '<=2.0.0')] }, [entry()])
    expect(result.problems).toEqual([expect.stringContaining('GHSA-aaaa pkg@2.0.0 (critical)')])
  })

  test('fails an expired entry, an entry with no justification, and an entry nothing matches', () => {
    const report = { pkg: [advisory('GHSA-aaaa', 'high', '<2.0.0')] }
    expect(run(report, [entry()], '2027-01-02').problems).toEqual([expect.stringContaining('expired on 2027-01-01')])
    expect(run(report, [entry({ justification: ' ' })]).problems).toEqual([expect.stringContaining('no justification')])
    expect(run(report, [entry(), entry({ advisory: 'GHSA-gone', package: 'other', version: '3.1.0' })]).problems)
      .toEqual([expect.stringContaining('GHSA-gone other@3.1.0: the allowlist entry matches no current advisory')])
  })
})
