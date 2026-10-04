// The release gate. A `v*` tag publishes (.github/workflows/package.yml), so
// before any build this refuses a release that would ship unfinished:
// - the tag is not `v` followed by package.json's version;
// - the toolchain notice still carries the source-offer placeholder, or the
//   maintainer note about it.
//
// Usage: node cli/check-release-gate.ts <tag>
// Exit 0 = ready to build and publish. Exit 1 = refused, naming every reason.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const SOURCE_OFFER_PLACEHOLDER = '[source-offer contact, named before release]'
const SOURCE_OFFER_NOTE = 'The source-offer contact is a placeholder'

export const check_release_gate = ({ tag, version, notice }: {
  tag: string
  version: string
  notice: string
}): string[] => {
  const problems: string[] = []
  if (tag !== `v${version}`) problems.push(`The tag ${tag} is not v${version}, the version in package.json.`)
  if (notice.includes(SOURCE_OFFER_PLACEHOLDER) || notice.includes(SOURCE_OFFER_NOTE)) problems.push('resources/TOOLCHAIN-NOTICE.md still names no source-offer contact, which the LGPL requires before distribution.')
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const problems = check_release_gate({
    tag: process.argv[2] ?? '',
    version: (JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { version: string }).version,
    notice: readFileSync(`${root}resources/TOOLCHAIN-NOTICE.md`, 'utf8')
  })
  for (const line of problems) console.error(`FAIL: ${line}`)
  if (problems.length > 0) process.exit(1)
  console.log('release gate passed')
}
