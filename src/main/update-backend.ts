// The update backend over GitHub Releases (spec §8.2.5, §8.10.10), read over
// https from the GitHub REST API without credentials. Each release carries the
// update .zip, update-manifest.json, and its Ed25519 signature; staging
// verifies them in update-stage.ts, and the swap at quit is update-install.ts.
//
// Stable is the latest published non-prerelease release, from
// releases/latest. Beta is the highest version among published releases that
// are either stable or a beta prerelease (v1.1.0-beta.1), so a stable release
// newer than the last beta reaches beta users too, and an alpha or rc
// prerelease reaches no one. Versions are compared by semver precedence, and
// the service decides whether one is newer than the running app.
//
// The fetch and the macOS tools are injected, so tests drive it under Bun.

import { parse_public_key } from './update-signature.ts'
import { stage_update, type AppInspection, type Fetch } from './update-stage.ts'
import { compare_versions, type UpdateBackend, type UpdateChannel } from './updates.ts'

const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?<!\.git)$/
const BETA = /^\d+\.\d+\.\d+-beta\.\d+$/
const STABLE = /^\d+\.\d+\.\d+$/

interface GithubRelease {
  tag_name: string
  draft: boolean
  prerelease: boolean
  assets: Array<{ name: string, browser_download_url: string }>
}

const version_of = (release: GithubRelease): string => release.tag_name.replace(/^v/, '')

const offered = (release: GithubRelease, channel: UpdateChannel): boolean => {
  if (release.draft) return false
  const version = version_of(release)
  if (STABLE.test(version)) return !release.prerelease
  return channel === 'beta' && release.prerelease && BETA.test(version)
}

export const select_release = (releases: GithubRelease[], channel: UpdateChannel): GithubRelease | null =>
  releases.filter((release) => offered(release, channel))
    .reduce<GithubRelease | null>((best, release) => best === null || compare_versions(version_of(release), version_of(best)) > 0 ? release : best, null)

export const create_github_update_backend = ({ feed_url, public_key, channel, app_id, staging_dir, install, fetch = globalThis.fetch, extract, inspect }: {
  feed_url: string
  public_key: string
  channel: UpdateChannel
  app_id: string
  staging_dir: string
  // Hands the staged bundle to the swap helper (update-install.ts).
  install: (staged_app_path: string) => void
  fetch?: Fetch
  extract?: (zip_path: string, dir: string) => Promise<void>
  inspect?: (app_path: string) => Promise<AppInspection>
}): UpdateBackend => {
  const match = GITHUB_REPOSITORY.exec(feed_url)
  if (match === null) throw new Error('The update feed is not a GitHub repository URL.')
  const key = parse_public_key(public_key)
  const api = `https://api.github.com/repos/${match[1] as string}/${match[2] as string}`
  let found: GithubRelease | null = null
  let staged_app_path: string | null = null

  const get_json = async (url: string): Promise<unknown> => {
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Record' } })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`The release feed answered HTTP ${response.status}.`)
    return await response.json()
  }

  return {
    check: async () => {
      const body = channel === 'stable'
        ? await get_json(`${api}/releases/latest`)
        : await get_json(`${api}/releases?per_page=50`)
      const releases = (body === null ? [] : Array.isArray(body) ? body : [body]) as GithubRelease[]
      found = select_release(releases, channel)
      return found === null ? null : { version: version_of(found) }
    },
    download: async () => {
      if (found === null) throw new Error('No release was found to download.')
      staged_app_path = await stage_update({
        assets: new Map(found.assets.map(({ name, browser_download_url }) => [name, browser_download_url])),
        version: version_of(found),
        app_id,
        public_key: key,
        staging_dir,
        fetch,
        ...(extract === undefined ? {} : { extract }),
        ...(inspect === undefined ? {} : { inspect })
      })
    },
    install: () => {
      if (staged_app_path === null) throw new Error('No update is staged.')
      install(staged_app_path)
    }
  }
}
