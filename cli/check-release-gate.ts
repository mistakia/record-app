// The release gate. A `v*` tag publishes (.github/workflows/package.yml), so
// before any build this refuses a release that could not be signed and
// notarized, or that would ship unfinished:
// - a signing or notarization secret is unset (it reads only whether each is
//   non-empty, and prints names, never values);
// - the tag is not `v` followed by package.json's version;
// - the toolchain notice still carries the source-offer placeholder, or the
//   maintainer note about it.
// electron-builder's forceCodeSigning and cli/verify-release.sh, after the
// build, refuse an unsigned or unnotarized app again.
//
// Usage: node cli/check-release-gate.ts <tag>
// Exit 0 = ready to build and publish. Exit 1 = refused, naming every reason.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// The repository secrets the release build reads. CSC_LINK is the Developer ID
// Application certificate as base64 .p12; APPLE_API_KEY_P8 is the App Store
// Connect API key's .p8 text, written to a file for notarization.
export const RELEASE_SECRETS = ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_API_KEY_P8', 'APPLE_API_KEY_ID', 'APPLE_API_ISSUER'] as const

export const SOURCE_OFFER_PLACEHOLDER = '[source-offer contact, named before release]'
const SOURCE_OFFER_NOTE = 'The source-offer contact is a placeholder'

export const check_release_gate = ({ env, tag, version, notice }: {
  env: Record<string, string | undefined>
  tag: string
  version: string
  notice: string
}): string[] => {
  const problems: string[] = []
  const missing = RELEASE_SECRETS.filter((name) => (env[name] ?? '').trim() === '')
  if (missing.length > 0) problems.push(`Refusing to publish an unsigned build: the repository secrets ${missing.join(', ')} are not set.`)
  if (tag !== `v${version}`) problems.push(`The tag ${tag} is not v${version}, the version in package.json.`)
  if (notice.includes(SOURCE_OFFER_PLACEHOLDER) || notice.includes(SOURCE_OFFER_NOTE)) problems.push('resources/TOOLCHAIN-NOTICE.md still names no source-offer contact, which the LGPL requires before distribution.')
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const problems = check_release_gate({
    env: process.env,
    tag: process.argv[2] ?? '',
    version: (JSON.parse(readFileSync(`${root}package.json`, 'utf8')) as { version: string }).version,
    notice: readFileSync(`${root}resources/TOOLCHAIN-NOTICE.md`, 'utf8')
  })
  for (const line of problems) console.error(`FAIL: ${line}`)
  if (problems.length > 0) process.exit(1)
  console.log('release gate passed')
}
