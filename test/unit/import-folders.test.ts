import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expand_chosen_paths } from '#main/import-files.ts'

describe('chosen folders', () => {
  test('stand for the audio files under them, in name order, skipping hidden entries; files pass through', async () => {
    const root = await mkdtemp(join(tmpdir(), 'record-import-folders-'))
    await mkdir(join(root, 'album', 'disc 2'), { recursive: true })
    await mkdir(join(root, 'album', '.hidden'))
    for (const name of ['album/b.flac', 'album/a.mp3', 'album/cover.jpg', 'album/.c.flac', 'album/disc 2/d.ogg', 'album/.hidden/e.flac', 'loose.wav']) {
      await writeFile(join(root, name), '')
    }
    expect(await expand_chosen_paths([join(root, 'album'), join(root, 'loose.wav')])).toEqual([
      join(root, 'album', 'a.mp3'),
      join(root, 'album', 'b.flac'),
      join(root, 'album', 'disc 2', 'd.ogg'),
      join(root, 'loose.wav')
    ])
    await mkdir(join(root, 'empty'))
    expect(await expand_chosen_paths([join(root, 'empty')])).toEqual([])
  })
})
