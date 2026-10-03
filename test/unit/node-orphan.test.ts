// What marks a process as the app's (node-orphan.ts): the bundle on macOS,
// the executable's directory elsewhere, matched in the command line or, on
// Linux, the executable /proc reports.

import { describe, expect, test } from 'bun:test'

import { app_marker, carries_marker } from '#main/bundled/node-orphan.ts'

const info = (command: string, executable: string | null) => ({ ppid: 1, started: 'Sat Oct  3 18:39:07 2026', command, executable })

describe('orphan marker', () => {
  test('is the last .app bundle on macOS, else the executable directory', () => {
    expect(app_marker('/Users/x/my.app/Record.app/Contents/MacOS/Record')).toBe('/Users/x/my.app/Record.app/')
    expect(app_marker('/opt/Record/record')).toBe('/opt/Record/')
  })

  test('matches the command line, or a Linux executable even after it was deleted, and nothing else', () => {
    expect(carries_marker(info('/Applications/Record.app/Contents/Frameworks/Record Helper.app/Contents/MacOS/Record Helper --type=utility', null), '/Applications/Record.app/')).toBe(true)
    expect(carries_marker(info('/proc/self/exe --type=utility', '/opt/Record/record'), '/opt/Record/')).toBe(true)
    expect(carries_marker(info('/proc/self/exe --type=utility', '/opt/Record/record (deleted)'), '/opt/Record/')).toBe(true)
    expect(carries_marker(info('/proc/self/exe --type=utility', null), '/opt/Record/')).toBe(false)
    expect(carries_marker(info('/proc/self/exe --type=utility', '/opt/Record2/record'), '/opt/Record/')).toBe(false)
  })
})
