// An in-process record-node with `cors_origins: []`, as the canonical node
// runs, plus generated audio. URL import resolves to a fixed entry and
// "downloads" by generating a file, so it never touches the network.

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { as_api_resolver, create_api_server, create_peer, start_peer, stop_api_server, stop_peer, type ApiServer, type Peer } from 'record-node'

export interface TestNode {
  peer: Peer
  server: ApiServer
  node_url: string
  work_dir: string
  // A distinct noise track (its own fingerprint per seed) at work_dir/name.
  make_audio: (input: { name: string, seed: number, seconds?: number }) => string
  stop: () => Promise<void>
}

export const start_test_node = async (): Promise<TestNode> => {
  const work_dir = await mkdtemp(join(tmpdir(), 'record-app-test-node-'))
  const make_audio = ({ name, seed, seconds = 6 }: { name: string, seed: number, seconds?: number }): string => {
    const path = join(work_dir, name)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anoisesrc=d=${seconds}:c=pink:seed=${seed}:a=0.3`, '-metadata', `title=${name.replace(/\.[a-z0-9]+$/, '')}`, path])
    return path
  }
  let url_seed = 1000
  const peer = await create_peer({
    config: { network: false, allow_toolchain_mismatch: process.env.RECORD_TOOLCHAIN_PREFLIGHT === 'bypass' },
    resolve: async (url) => [{ extractor: 'fixture', id: url, url: 'https://media.example.test/audio.flac', ext: 'flac', fulltitle: 'From a URL' }],
    download: async ({ output_path }) => {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anoisesrc=d=6:c=brown:seed=${url_seed++}:a=0.3`, output_path])
    }
  })
  await start_peer(peer)
  const server = await create_api_server({ peer, resolve: as_api_resolver(peer.context.resolve), port: 0, cors_origins: [], log: false, validate_responses: true })
  return {
    peer,
    server,
    node_url: `http://127.0.0.1:${server.port}`,
    work_dir,
    make_audio,
    stop: async () => {
      await stop_api_server(server)
      await stop_peer(peer)
      await rm(work_dir, { recursive: true, force: true })
    }
  }
}
