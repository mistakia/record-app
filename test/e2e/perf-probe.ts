// Measures the built app (`bun run build` first) against an in-process node
// seeded to a real library's size: connect, first rows, scrolling, a jump
// into the middle, the keyboard cursor, search, idle, and a burst of new
// tracks. A counting proxy between the app and the node times every
// request; React commits are counted through the devtools hook, and frame
// times sampled with requestAnimationFrame. Prints one JSON report. Runs
// under Node:
//
//   RECORD_TOOLCHAIN_PREFLIGHT=bypass RECORD_PERF_TRACKS=200000 node test/e2e/perf-probe.ts
//
// RECORD_PERF_APPS is a comma-separated list of built app roots to measure
// in turn (default this checkout); RECORD_PERF_OUT writes the report there
// as well.

import { writeFile } from 'node:fs/promises'
import { createServer, request as http_request, type IncomingMessage } from 'node:http'
import { connect, type AddressInfo, type Socket } from 'node:net'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { type Page } from 'playwright-core'

import { start_test_node } from '../integration/node-fixture.ts'
import { create_seeder } from './seed-library.ts'
import { capture, launch_app, quiet_violations } from './launch.ts'

const TRACKS = Number(process.env.RECORD_PERF_TRACKS ?? 200_000)
// Each app root measured in turn against the same node, so a before and an
// after share the library and the machine's load.
const APP_ROOTS = (process.env.RECORD_PERF_APPS ?? fileURLToPath(new URL('../..', import.meta.url))).split(',')

interface Sample { path: string, ms: number, bytes: number }

// Forwards HTTP and the WebSocket upgrade to the node, recording each
// request's path, time to the end of its body, and size.
const start_proxy = async (target: string) => {
  const { hostname, port } = new URL(target)
  const samples: Sample[] = []
  const errors: string[] = []
  let ws_messages = 0
  let in_flight = 0
  const server = createServer((incoming, outgoing) => {
    const started = performance.now()
    in_flight += 1
    outgoing.on('close', () => { in_flight -= 1 })
    const forward = http_request({ hostname, port, path: incoming.url, method: incoming.method, headers: incoming.headers }, (response: IncomingMessage) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers)
      let bytes = 0
      response.on('data', (chunk: Buffer) => { bytes += chunk.length })
      response.pipe(outgoing)
      response.on('end', () => { samples.push({ path: `${incoming.method ?? ''} ${incoming.url ?? ''}`, ms: performance.now() - started, bytes }) })
    })
    forward.on('error', (error) => {
      errors.push(`${incoming.url ?? ''}: ${error.message}`)
      if (!outgoing.headersSent) outgoing.writeHead(502)
      outgoing.end()
    })
    incoming.pipe(forward)
  })
  server.on('upgrade', (incoming: IncomingMessage, socket: Socket, head: Buffer) => {
    const upstream = connect(Number(port), hostname, () => {
      const lines = [`${incoming.method ?? 'GET'} ${incoming.url ?? '/'} HTTP/1.1`, ...Object.entries(incoming.headers).map(([name, value]) => `${name}: ${String(value)}`)]
      upstream.write(`${lines.join('\r\n')}\r\n\r\n`)
      upstream.write(head)
      upstream.on('data', () => { ws_messages += 1 })
      upstream.pipe(socket)
      socket.pipe(upstream)
    })
    upstream.on('error', () => { socket.destroy() })
    socket.on('error', () => { upstream.destroy() })
  })
  await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve) })
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    take: (): Sample[] => samples.splice(0),
    ws_messages: () => ws_messages,
    // Resolves once no request has been in flight for half a second, so one
    // step's backlog on the node does not land in the next step's numbers.
    idle: async (): Promise<void> => {
      for (let quiet = 0, waited = 0; quiet < 500 && waited < 180_000; waited += 50) {
        quiet = in_flight === 0 ? quiet + 50 : 0
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    },
    errors,
    close: () => { server.close(); server.closeAllConnections() }
  }
}

const summarize = (samples: Sample[]) => {
  const by_route = new Map<string, number[]>()
  for (const { path, ms } of samples) {
    const route = path.replace(/\?.*$/, '')
    by_route.set(route, [...(by_route.get(route) ?? []), ms])
  }
  return {
    requests: samples.length,
    bytes: samples.reduce((sum, { bytes }) => sum + bytes, 0),
    routes: Object.fromEntries([...by_route].map(([route, times]) => [route, { n: times.length, max_ms: Math.round(Math.max(...times)), mean_ms: Math.round(times.reduce((a, b) => a + b, 0) / times.length) }]))
  }
}

// Counts React commits from the start: the devtools hook is read by React
// in production builds too.
const COMMIT_COUNTER = `
  window.__perf = { commits: 0, long_tasks: [] }
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(), inject () { return 1 },
    onCommitFiberRoot () { window.__perf.commits += 1 }, onCommitFiberUnmount () {}, onPostCommitFiberRoot () {}, checkDCE () {}
  }
  new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__perf.long_tasks.push(Math.round(entry.duration)) }).observe({ type: 'longtask', buffered: true })
`

const node = await start_test_node()
const seeder = await create_seeder(node)
const seed_started = performance.now()
await seeder.add({ count: TRACKS, on_progress: (done) => { if (done % 50_000 === 0) console.error(`seeded ${done}`) } })
console.error(`seeded ${TRACKS} in ${Math.round(performance.now() - seed_started)} ms`)
const proxy = await start_proxy(node.node_url)
const reports: Record<string, unknown> = { tracks: TRACKS + 1 }

const counters = async (window: Page) => await window.evaluate(() => {
  const perf = (window as unknown as { __perf: { commits: number, long_tasks: number[] } }).__perf
  return { commits: perf.commits, long_tasks: perf.long_tasks.splice(0) }
})

// Runs action, then reports what it cost: elapsed time, React commits, long
// tasks, CDP script, layout and style time, and the node requests it made.
const measure = async (report: Record<string, unknown>, window: Page, label: string, action: () => Promise<unknown>) => {
  const cdp = await window.context().newCDPSession(window)
  await cdp.send('Performance.enable')
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]))
  await proxy.idle()
  proxy.take()
  const before = await metrics()
  const commits_before = (await counters(window)).commits
  const ws_before = proxy.ws_messages()
  const started = performance.now()
  // A step that times out is a measurement too; the run goes on.
  const extra = await action().catch((error: unknown) => ({ error: error instanceof Error ? error.message.split('\n')[0] : String(error) }))
  const elapsed = performance.now() - started
  const after = await metrics()
  const { commits, long_tasks } = await counters(window)
  const delta = (name: string) => Math.round(((after[name] ?? 0) - (before[name] ?? 0)) * 1000)
  report[label] = {
    elapsed_ms: Math.round(elapsed),
    commits: commits - commits_before,
    long_tasks,
    script_ms: delta('ScriptDuration'),
    layout_ms: delta('LayoutDuration'),
    style_ms: delta('RecalcStyleDuration'),
    task_ms: delta('TaskDuration'),
    heap_mb: Math.round((after.JSHeapUsedSize ?? 0) / 1e6),
    ws_messages: proxy.ws_messages() - ws_before,
    node: summarize(proxy.take()),
    ...(extra === undefined ? {} : { detail: extra })
  }
  console.error(label, JSON.stringify(report[label]))
  await cdp.detach()
}

// Frame intervals over a run of frames, scrolling step pixels a frame when
// kind is scroll.
const FRAME_SAMPLER = async ({ frames, kind, step = 180 }: { frames: number, kind: 'scroll' | 'idle', step?: number }) => {
  const scroller = document.querySelector('[data-testid=track-scroller]')
  const intervals: number[] = []
  let skeleton_frames = 0
  let last = performance.now()
  await new Promise<void>((resolve) => {
    let frame = 0
    const tick = (now: number) => {
      intervals.push(now - last)
      last = now
      if (document.querySelector('[data-testid=track-list] [aria-busy=true][role=row]') !== null) skeleton_frames += 1
      if (kind === 'scroll' && scroller !== null) scroller.scrollTop += step
      if (++frame >= frames) resolve()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  intervals.sort((a, b) => a - b)
  const at = (q: number) => Math.round(intervals[Math.min(intervals.length - 1, Math.floor(q * intervals.length))] ?? 0)
  return { frames: intervals.length, p50_ms: at(0.5), p95_ms: at(0.95), max_ms: at(1), over_33ms: intervals.filter((ms) => ms > 33).length, skeleton_frames, skeleton_rows_at_end: document.querySelectorAll('[data-testid=track-list] [aria-busy=true][role=row]').length }
}

// Rows on screen and none of them a skeleton; with row, that row itself
// has loaded, so a scroll that has not rendered yet does not pass.
const wait_rows = async (window: Page, row?: number) => {
  await window.waitForFunction((target) => (target === undefined || document.querySelector(`[data-row='${target}'] [data-testid=track-row]`) !== null) &&
    document.querySelectorAll('[data-testid=track-row]').length > 0 &&
    document.querySelectorAll('[data-testid=track-list] [aria-busy=true][role=row]').length === 0, row, { timeout: 120_000, polling: 'raf' })
}

const nav = async (window: Page, name: string) => { await window.getByRole('navigation', { name: 'Library' }).getByRole('link', { name, exact: true }).first().click() }

const run_app = async (app_root: string, report: Record<string, unknown>): Promise<void> => {
  const user_data_dir = join(node.work_dir, `profile-${Object.keys(reports).length}`)
  const app = await launch_app({ user_data_dir, app_root })
  const window = await app.firstWindow()
  await window.addInitScript(COMMIT_COUNTER)
  await window.reload()
  await window.setViewportSize({ width: 1440, height: 900 }).catch(() => {})
  await nav(window, 'Settings')
  await window.getByLabel('Remote node').check()
  await window.locator('input[name=node_url]').fill(proxy.url)
  await window.getByRole('button', { name: 'Save', exact: true }).click()

  await measure(report, window, 'connect_to_first_rows', async () => {
    await window.getByRole('dialog').getByRole('button', { name: 'Switch' }).click()
    await window.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 120_000 }).catch(async (error: unknown) => { console.error(await window.getByTestId('events-status').evaluate((el) => el.outerHTML).catch(() => 'no status'), proxy.errors, summarize(proxy.take())); await capture(app, '/tmp/perf-fail.png'); throw error })
    await nav(window, 'Tracks')
    await wait_rows(window)
    await window.waitForTimeout(1500)
  })

  await measure(report, window, 'idle_5s', async () => await window.evaluate(FRAME_SAMPLER, { frames: 300, kind: 'idle' as const }))

  await measure(report, window, 'scroll_300_frames', async () => {
    const frames = await window.evaluate(FRAME_SAMPLER, { frames: 300, kind: 'scroll' as const })
    const stopped = Date.now()
    await wait_rows(window)
    return { ...frames, rows_after_stop_ms: Date.now() - stopped }
  })

  // A fling: about 2,000 rows a second for 2 seconds.
  await measure(report, window, 'fling_10_pages', async () => {
    const frames = await window.evaluate(FRAME_SAMPLER, { frames: 120, kind: 'scroll' as const, step: 600 })
    const stopped = Date.now()
    await wait_rows(window)
    return { ...frames, rows_after_stop_ms: Date.now() - stopped }
  })

  await measure(report, window, 'jump_to_middle', async () => {
    const started = Date.now()
    const middle = Math.floor(TRACKS / 2)
    await window.evaluate((row) => {
      const scroller = document.querySelector('[data-testid=track-scroller]')
      if (scroller !== null) scroller.scrollTop = row * 36
    }, middle)
    await wait_rows(window, middle)
    return { rows_visible_ms: Date.now() - started }
  })

  // Reading speed, about 40 rows a second for 10 seconds at 120 Hz.
  await measure(report, window, 'read_scroll_10s', async () => await window.evaluate(FRAME_SAMPLER, { frames: 1200, kind: 'scroll' as const, step: 12 }))

  // Dragging the scrollbar thumb: about 550 rows a frame for a second.
  await measure(report, window, 'scrollbar_drag', async () => {
    const frames = await window.evaluate(FRAME_SAMPLER, { frames: 120, kind: 'scroll' as const, step: 20_000 })
    const stopped = Date.now()
    await wait_rows(window)
    return { ...frames, rows_after_stop_ms: Date.now() - stopped }
  })

  await window.getByTestId('track-row').first().click().catch(() => {})
  await measure(report, window, 'arrow_down_x60', async () => {
    const times: number[] = []
    for (let press = 0; press < 60; press++) {
      const started = performance.now()
      await window.keyboard.press('ArrowDown')
      await window.evaluate(() => new Promise((resolve) => { requestAnimationFrame(() => { requestAnimationFrame(resolve) }) }))
      times.push(performance.now() - started)
    }
    times.sort((a, b) => a - b)
    return { p50_ms: Math.round(times[30] ?? 0), max_ms: Math.round(times.at(-1) ?? 0) }
  })

  await measure(report, window, 'search_type_and_settle', async () => {
    await window.getByLabel('Search tracks').pressSequentially('techno', { delay: 60 })
    await window.locator('[data-testid=track-list][aria-busy=false]').waitFor()
    await wait_rows(window)
    return { total: await window.getByTestId('track-total').textContent() }
  })
  await window.getByLabel('Clear search').click().catch(() => {})
  await window.waitForTimeout(1500)

  await measure(report, window, 'ipc_tracks_page_x5', async () => await window.evaluate(async () => {
    const times: number[] = []
    for (let call = 0; call < 5; call++) {
      const started = performance.now()
      await (window as unknown as { record: { request: (request: unknown) => Promise<unknown> } }).record.request({ method: 'get', path_template: '/tracks', query: { offset: 200, limit: 200 } })
      times.push(Math.round(performance.now() - started))
    }
    return { renderer_round_trip_ms: times }
  }))

  // Playing: the engine's position ticks go through the store, which must
  // not re-render the list.
  await window.getByTestId('track-row').first().click().catch(() => {})
  await window.keyboard.press('Enter')
  await window.locator('[data-testid=player-position]').filter({ hasNotText: /^0:00$/ }).waitFor({ timeout: 60_000 }).catch(() => {})
  await measure(report, window, 'playing_5s', async () => await window.evaluate(FRAME_SAMPLER, { frames: 300, kind: 'idle' as const }))
  await window.keyboard.press('Space')

  await measure(report, window, 'ingest_burst_10s', async () => {
    for (let second = 0; second < 10; second++) {
      await seeder.add({ count: 20, batch: 1 })
      await window.waitForTimeout(1000)
    }
    await window.waitForTimeout(2000)
  })

  await measure(report, window, 'idle_after_burst_5s', async () => await window.evaluate(FRAME_SAMPLER, { frames: 300, kind: 'idle' as const }))

  report.main_memory_mb = await app.evaluate(() => Math.round(process.memoryUsage().rss / 1e6))
  // Reported, not asserted: a build under comparison may predate background mode.
  report.quiet_violations = await quiet_violations(app)
  await app.close()

  // Relaunch on the same profile: the hibernation snapshot, then fresh.
  const relaunch_started = performance.now()
  const again = await launch_app({ user_data_dir, app_root })
  const second = await again.firstWindow()
  await second.getByTestId('track-row').first().waitFor({ timeout: 60_000 })
  const snapshot_rows_ms = Math.round(performance.now() - relaunch_started)
  await second.locator('[data-testid=events-status][data-status=open][data-freshness=fresh]').waitFor({ timeout: 120_000 })
  report.relaunch = { snapshot_rows_ms, fresh_ms: Math.round(performance.now() - relaunch_started), node: summarize(proxy.take()) }
  await again.close()
}

try {
  for (const app_root of APP_ROOTS) {
    const report: Record<string, unknown> = {}
    reports[app_root] = report
    console.error(`== ${app_root}`)
    await run_app(app_root, report)
  }
} finally {
  proxy.close()
  await node.stop()
}

reports.proxy_errors = proxy.errors
console.log(JSON.stringify(reports, null, 2))
if (process.env.RECORD_PERF_OUT !== undefined) await writeFile(process.env.RECORD_PERF_OUT, JSON.stringify(reports, null, 2))
