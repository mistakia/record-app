import { describe, expect, test } from 'bun:test'

import { check_release_gate, SOURCE_OFFER_PLACEHOLDER } from '../../cli/check-release-gate.ts'

const NOTICE = 'Ask at: source@example.org.'
const run = (overrides: Partial<Parameters<typeof check_release_gate>[0]> = {}) =>
  check_release_gate({ tag: 'v1.2.3', version: '1.2.3', notice: NOTICE, feed_url: 'https://github.com/mistakia/record-app', public_key: 'pinned', ...overrides })

describe('release gate', () => {
  test('passes with the matching tag and a named contact', () => {
    expect(run()).toEqual([])
  })

  test('refuses a tag that is not the package version', () => {
    expect(run({ tag: 'v1.2.4' })).toEqual(['The tag v1.2.4 is not v1.2.3, the version in package.json.'])
    expect(run({ tag: '1.2.3' })).toHaveLength(1)
  })

  test('refuses while the update feed or key is not pinned', () => {
    expect(run({ public_key: null })[0]).toContain('could never update itself')
    expect(run({ feed_url: null })).toHaveLength(1)
  })

  test('refuses while the source-offer contact is a placeholder', () => {
    expect(run({ notice: `Ask at: ${SOURCE_OFFER_PLACEHOLDER}.` })[0]).toContain('source-offer')
    expect(run({ notice: `${NOTICE}\n- The source-offer contact is a placeholder until named.` })[0]).toContain('source-offer')
  })
})
