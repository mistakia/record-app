// The release gate. A `v*` tag publishes (.github/workflows/package.yml), so
// before any build this refuses a release that would ship unfinished:
// - the tag is not `v` followed by package.json's version;
// - the toolchain notice still carries the source-offer placeholder, or the
//   maintainer note about it;
// - the update feed or the update public key is not pinned
//   (src/main/updates.ts), so the release could never update itself.
//
// Usage: node cli/check-release-gate.ts <tag>
// Exit 0 = ready to build and publish. Exit 1 = refused, naming every reason.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { UPDATE_FEED_URL, UPDATE_PUBLIC_KEY } from '../src/main/updates.ts'

export const SOURCE_OFFER_PLACEHOLDER = '[source-offer contact, named before release]'
const SOURCE_OFFER_NOTE = 'The source-offer contact is a placeholder'

export const check_release_gate = ({ tag, version, notice, feed_url, public_key }: {
  tag: string
  version: string
  notice: string
  feed_url: string | null
  public_key: string | null
}): string[] => {
  const problems: string[] = []
  if (tag !== `v${version}`) problems.push(`The tag ${tag} is not v${version}, the version in package.json.`)
  if (notice.includes(SOURCE_OFFER_PLACEHOLDER) || notice.includes(SOURCE_OFFER_NOTE)) problems.push('resources/TOOLCHAIN-NOTICE.md still names no source-offer contact, which the LGPL requires before distribution.')
  if (feed_url === null || public_key === null) problems.push('src/main/updates.ts does not pin both the update feed and the update public key, so this release could never update itself.')
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const problems = check_release_gate({
    tag: process.argv[2] ?? '',
    version: (JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { version: string }).version,
    notice: readFileSync(`${root}resources/TOOLCHAIN-NOTICE.md`, 'utf8'),
    feed_url: UPDATE_FEED_URL,
    public_key: UPDATE_PUBLIC_KEY
  })
  for (const line of problems) console.error(`FAIL: ${line}`)
  if (problems.length > 0) process.exit(1)
  console.log('release gate passed')
}
