// Background mode is for a session driving the app. The app never activates
// or takes the operator's focus, makes no sound, and leaves the media keys
// and Now Playing to whatever the operator is listening to; playback still
// runs. RECORD_BACKGROUND=hidden, a session's default for a script or a dev
// run, makes the window invisible and lets clicks through, so a stray click
// cannot land in it. RECORD_BACKGROUND=1 keeps it on screen, for a dev run
// the operator asked to watch.
// A release build ignores both, so it can never start unreachable.

import { app, dialog, shell } from 'electron'

const MODE = !app.isPackaged || __RECORD_TEST_BUILD__ ? process.env.RECORD_BACKGROUND : undefined
export const BACKGROUND = MODE === '1' || MODE === 'hidden'
export const HIDDEN = MODE === 'hidden'

// What the run did that background mode forbids or refused, kept from
// startup for test/e2e/launch.ts to read.
export interface QuietRecord { focused: number, activated: number, refused: string[] }

// A native dialog or a hand-off to Finder or the browser would bring that
// app, or this one, to the front: background mode answers each as cancelled
// and records it. A script stubs a dialog it means to answer.
const refuse_os_surfaces = (quiet: QuietRecord): void => {
  const refused = (name: string): void => {
    quiet.refused.push(name)
    console.warn(`background mode refused ${name}`)
  }
  dialog.showMessageBox = async (...args: unknown[]) => {
    refused('dialog.showMessageBox')
    const options = args.at(-1) as { cancelId?: number }
    return { response: options.cancelId ?? 0, checkboxChecked: false }
  }
  dialog.showOpenDialog = async () => {
    refused('dialog.showOpenDialog')
    return { canceled: true, filePaths: [] }
  }
  dialog.showSaveDialog = async () => {
    refused('dialog.showSaveDialog')
    return { canceled: true, filePath: '' }
  }
  shell.openPath = async () => {
    refused('shell.openPath')
    return ''
  }
  shell.showItemInFolder = () => { refused('shell.showItemInFolder') }
  shell.openExternal = async () => { refused('shell.openExternal') }
}

// Before ready: Chromium reads its switches at startup.
export const enter_background_mode = (): void => {
  if (!BACKGROUND) return
  app.commandLine.appendSwitch('mute-audio')
  app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling')
  // Behind the operator's windows macOS marks the window occluded; it keeps
  // painting, so a script can still read and capture it.
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  // An accessory app has no Dock icon and is never brought to the front.
  if (process.platform === 'darwin') app.setActivationPolicy('accessory')
  const quiet: QuietRecord = { focused: 0, activated: 0, refused: [] }
  ;(globalThis as { record_quiet?: QuietRecord }).record_quiet = quiet
  app.on('browser-window-focus', () => { quiet.focused += 1 })
  app.on('did-become-active', () => { quiet.activated += 1 })
  refuse_os_surfaces(quiet)
}
