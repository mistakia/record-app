import { afterAll, describe, expect, test } from 'bun:test'
import { chmod, mkdir, mkdtemp, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { NODE_DATA_FOLDER, prepare_data_dir, resolve_data_dir_target } from '#main/bundled/data-dir-target.ts'
import { PIN_FILE } from '#main/bundled/node-pin.ts'

const roots: string[] = []
afterAll(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }) })

const setup = async () => {
  const root = await mkdtemp(join(tmpdir(), 'record-app-data-dir-'))
  roots.push(root)
  const home = join(root, 'home')
  const user_data = join(home, 'Library', 'Application Support', 'Record')
  const current = join(user_data, 'node-data')
  const app_path = join(root, 'Record.app', 'Contents', 'Resources', 'app.asar')
  await mkdir(current, { recursive: true, mode: 0o755 })
  await mkdir(app_path, { recursive: true })
  await writeFile(join(home, 'notes.txt'), 'the user\'s own file')
  return { root, home, user_data, current, app_path }
}

const mode = async (path: string) => ((await stat(path)).mode & 0o777).toString(8)

describe('bundled data directory target', () => {
  test('picking a home folder uses a new private subfolder and leaves the home folder alone', async () => {
    const { home, user_data, current, app_path } = await setup()
    await chmod(home, 0o755)
    const target = await resolve_data_dir_target({ chosen: home, current, user_data, app_path })
    expect(target).toEqual({ kind: 'new', data_dir: join(await realpath(home), NODE_DATA_FOLDER) })
    if (target.kind !== 'new') throw new Error('unreachable')
    await prepare_data_dir(target)
    expect(await mode(target.data_dir)).toBe('700')
    expect(await mode(home)).toBe('755')
  })

  test('an existing subfolder is used only when it holds node data or a pin', async () => {
    const { home, user_data, current, app_path } = await setup()
    const sub = join(home, NODE_DATA_FOLDER)
    await mkdir(sub)
    await writeFile(join(sub, 'photo.jpg'), '')
    expect(await resolve_data_dir_target({ chosen: home, current, user_data, app_path })).toMatchObject({ kind: 'refused', message: expect.stringContaining('holds no record-node data') })
    await rm(join(sub, 'photo.jpg'))
    expect((await resolve_data_dir_target({ chosen: home, current, user_data, app_path })).kind).toBe('refused')
    await writeFile(join(sub, PIN_FILE), '{}')
    expect((await resolve_data_dir_target({ chosen: home, current, user_data, app_path })).kind).toBe('existing')
  })

  test('refuses a target inside userData, inside the current data folder, or inside the app, and a symlinked subfolder', async () => {
    const { root, home, user_data, current, app_path } = await setup()
    for (const chosen of [user_data, join(user_data, '..', 'Record'), current, app_path]) {
      expect((await resolve_data_dir_target({ chosen, current, user_data, app_path })).kind).toBe('refused')
    }
    const elsewhere = join(root, 'elsewhere')
    await mkdir(elsewhere)
    await symlink(elsewhere, join(home, NODE_DATA_FOLDER))
    expect(await resolve_data_dir_target({ chosen: home, current, user_data, app_path })).toMatchObject({ kind: 'refused', message: expect.stringContaining('not a plain folder') })
  })

  test('picking the folder the node already uses changes nothing', async () => {
    const { home, user_data, app_path } = await setup()
    const sub = join(home, NODE_DATA_FOLDER)
    await mkdir(sub)
    expect(await resolve_data_dir_target({ chosen: home, current: sub, user_data, app_path })).toEqual({ kind: 'unchanged' })
  })
})
