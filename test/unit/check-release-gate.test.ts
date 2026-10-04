import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'bun:test'

import { check_release_gate, RELEASE_SECRETS, SOURCE_OFFER_PLACEHOLDER } from '../../cli/check-release-gate.ts'

const ALL_SECRETS = Object.fromEntries(RELEASE_SECRETS.map((name) => [name, 'secret-value']))
const NOTICE = 'Ask at: source@example.org.'
const run = (overrides: Partial<Parameters<typeof check_release_gate>[0]> = {}) =>
  check_release_gate({ env: ALL_SECRETS, tag: 'v1.2.3', version: '1.2.3', notice: NOTICE, ...overrides })

describe('release gate', () => {
  test('passes with every secret, the matching tag, and a named contact', () => {
    expect(run()).toEqual([])
  })

  test('refuses an unsigned build, naming each unset or blank secret and no value', () => {
    const [problem, ...rest] = run({ env: { ...ALL_SECRETS, CSC_LINK: undefined, APPLE_API_ISSUER: '  ' } })
    expect(rest).toEqual([])
    expect(problem).toContain('unsigned')
    expect(problem).toContain('CSC_LINK, APPLE_API_ISSUER')
    expect(problem).not.toContain('secret-value')
  })

  test('refuses a tag that is not the package version', () => {
    expect(run({ tag: 'v1.2.4' })).toEqual(['The tag v1.2.4 is not v1.2.3, the version in package.json.'])
    expect(run({ tag: '1.2.3' })).toHaveLength(1)
  })

  test('refuses while the source-offer contact is a placeholder', () => {
    expect(run({ notice: `Ask at: ${SOURCE_OFFER_PLACEHOLDER}.` })[0]).toContain('source-offer')
    expect(run({ notice: `${NOTICE}\n- The source-offer contact is a placeholder until named.` })[0]).toContain('source-offer')
  })

  // The repository as it stands: no secrets in this environment, so the
  // workflow's gate step fails closed.
  test('the script fails closed with no secrets set', () => {
    const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !(RELEASE_SECRETS as readonly string[]).includes(name)))
    const result = spawnSync('node', [fileURLToPath(new URL('../../cli/check-release-gate.ts', import.meta.url)), 'v0.0.0'], { env, encoding: 'utf8' })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Refusing to publish an unsigned build')
    expect(result.stdout).not.toContain('passed')
  })
})
