// The update backend over electron-updater (spec §8.2.5, §8.10.10), reading
// the feed electron-builder publishes to GitHub Releases: the channel file
// (latest-mac.yml, or beta-mac.yml for a beta version) and the universal .zip,
// over https. The updater is injected, so this module
// imports nothing from Electron and tests drive it under Bun.
//
// setFeedURL replaces only the provider: a download still reads the
// Resources/app-update.yml that electron-builder's github publish config
// writes into the app, to name its cache directory.
//
// It never downloads or installs on its own: the update service asks for the
// download, and electron-updater installs it when the user next quits. On
// macOS Squirrel.Mac applies a payload only when its code signature satisfies
// the running app's designated requirement, which pins the Developer ID team.
//
// Stable is the latest published non-prerelease GitHub release, from
// releases/latest. electron-updater would follow prereleases whenever the
// running version is one, so stable turns that off explicitly. Beta also takes
// prereleases (tags like v1.1.0-beta.1): electron-updater picks the newest
// entry of the releases feed and reads its beta-mac.yml, falling back to
// latest-mac.yml, so a stable release newer than the last beta reaches beta
// users too. Neither channel sets updater.channel, which would also allow
// downgrades. One feed serves every major version, so while a newer major
// waits for the user's opt-in, a later release on the current major is not
// offered.
//
// Outside the packaged app electron-updater is inactive, and a check fails
// rather than report one that never reached the feed.

import type { AppUpdater } from 'electron-updater'

import type { UpdateBackend, UpdateChannel } from './updates.ts'

export type Updater = Pick<AppUpdater, 'autoDownload' | 'autoInstallOnAppQuit' | 'allowPrerelease' | 'allowDowngrade' | 'logger' | 'setFeedURL' | 'checkForUpdates' | 'downloadUpdate'>

const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?<!\.git)$/

export const create_github_update_backend = ({ feed_url, channel, updater }: {
  feed_url: string
  channel: UpdateChannel
  updater: Updater
}): UpdateBackend => {
  const match = GITHUB_REPOSITORY.exec(feed_url)
  if (match === null) throw new Error('The update feed is not a GitHub repository URL.')
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = true
  updater.allowPrerelease = channel === 'beta'
  updater.allowDowngrade = false
  updater.logger = null
  updater.setFeedURL({ provider: 'github', owner: match[1] as string, repo: match[2] as string })
  return {
    check: async () => {
      const result = await updater.checkForUpdates()
      if (result === null) throw new Error('Updates run only in the packaged app.')
      return result.isUpdateAvailable ? { version: result.updateInfo.version } : null
    },
    download: async () => { await updater.downloadUpdate() }
  }
}
