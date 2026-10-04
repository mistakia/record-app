// The update backend over electron-updater (spec §8.2.5, §8.10.10), reading
// the feed electron-builder publishes to GitHub Releases: latest-mac.yml and
// the universal .zip, over https. The updater is injected, so this module
// imports nothing from Electron and tests drive it under Bun.
//
// It never downloads or installs on its own: the update service asks for the
// download, and electron-updater installs it when the user next quits. On
// macOS Squirrel.Mac applies a payload only when its code signature satisfies
// the running app's designated requirement, which pins the Developer ID team.
//
// Only the stable channel has a release mapping: published, non-prerelease
// GitHub releases. electron-updater would follow prereleases whenever the
// running version is one, so that is turned off explicitly.

import type { AppUpdater } from 'electron-updater'

import type { UpdateBackend, UpdateChannel } from './updates.ts'

export type Updater = Pick<AppUpdater, 'autoDownload' | 'autoInstallOnAppQuit' | 'allowPrerelease' | 'allowDowngrade' | 'logger' | 'setFeedURL' | 'checkForUpdates' | 'downloadUpdate'>

const GITHUB_REPOSITORY = /^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/

export const create_github_update_backend = ({ feed_url, channel, updater }: {
  feed_url: string
  channel: UpdateChannel
  updater: Updater
}): UpdateBackend => {
  const match = GITHUB_REPOSITORY.exec(feed_url)
  if (match === null) throw new Error('The update feed is not a GitHub repository URL.')
  if (channel !== 'stable') throw new Error(`The ${channel} update channel has no releases yet.`)
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = true
  updater.allowPrerelease = false
  updater.allowDowngrade = false
  updater.logger = null
  updater.setFeedURL({ provider: 'github', owner: match[1] as string, repo: match[2] as string })
  return {
    check: async () => {
      const result = await updater.checkForUpdates()
      return result?.isUpdateAvailable === true ? { version: result.updateInfo.version } : null
    },
    download: async () => { await updater.downloadUpdate() }
  }
}
