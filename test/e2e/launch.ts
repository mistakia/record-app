// The one way an end-to-end script starts the app: in hidden background
// mode (src/main/background.ts), so a run on the operator's machine never
// shows them a window, takes their focus, or makes a sound. --mute-audio on
// the command line also mutes a build that predates background mode.
// assert_quiet proves the run kept to it, from the record main keeps from
// startup.

import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { _electron as electron, type ElectronApplication } from 'playwright-core'

import type { QuietRecord } from '#main/background.ts'

export const APP_ROOT = fileURLToPath(new URL('../..', import.meta.url))

export const launch_app = async ({ user_data_dir, app_root = APP_ROOT }: {
  user_data_dir: string
  app_root?: string
}): Promise<ElectronApplication> => {
  const app = await electron.launch({
    args: [app_root, `--user-data-dir=${user_data_dir}`, '--mute-audio'],
    env: { ...process.env, RECORD_BACKGROUND: 'hidden' },
    timeout: 30_000
  })
  return app
}

// What the run did that background mode forbids, empty when it kept quiet.
export const quiet_violations = async (app: ElectronApplication): Promise<string[]> =>
  await app.evaluate(({ app: electron_app, BrowserWindow }) => {
    const quiet = (globalThis as { record_quiet?: QuietRecord }).record_quiet
    const violations: string[] = []
    if (quiet === undefined) violations.push('the app is not in background mode')
    else {
      if (quiet.focused > 0) violations.push(`a window took the system focus ${quiet.focused} times`)
      if (quiet.activated > 0) violations.push(`the app became the active app ${quiet.activated} times`)
      if (quiet.refused.length > 0) violations.push(`unstubbed OS surfaces refused: ${quiet.refused.join(', ')}`)
    }
    if (!electron_app.commandLine.hasSwitch('mute-audio')) violations.push('audio is not muted')
    if (BrowserWindow.getFocusedWindow() !== null) violations.push('a window holds the system focus')
    const audible = BrowserWindow.getAllWindows().filter((window) => !window.webContents.isAudioMuted()).length
    if (audible > 0) violations.push(`${audible} window(s) not muted`)
    return violations
  })

export const assert_quiet = async (app: ElectronApplication): Promise<void> => {
  const violations = await quiet_violations(app)
  if (violations.length > 0) throw new Error(`the run was not quiet: ${violations.join('; ')}`)
}

// A screenshot of the app's window, taken by main. Playwright's waits on a
// compositor frame that macOS withholds from a window behind the operator's.
// A clip is in CSS pixels, as a locator's boundingBox gives it.
export const capture = async (app: ElectronApplication, path: string, clip?: { x: number, y: number, width: number, height: number }): Promise<void> => {
  const png = await app.evaluate(async ({ BrowserWindow }, rect) => {
    const [window] = BrowserWindow.getAllWindows()
    if (window === undefined) throw new Error('no window to capture')
    const area = rect === undefined ? undefined : { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) }
    return (await window.webContents.capturePage(area)).toPNG().toString('base64')
  }, clip)
  await writeFile(path, Buffer.from(png, 'base64'))
}
