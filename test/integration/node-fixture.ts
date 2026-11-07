// An in-process record-node with `cors_origins: []`, as the canonical node
// runs, plus generated audio. URL import resolves to a fixed entry and
// "downloads" by generating a file, so it never touches the network.

import { execFileSync } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { as_api_resolver, create_api_server, create_peer, start_peer, stop_api_server, stop_peer, type ApiServer, type NetworkConfig, type Peer } from 'record-node'

export interface TestNode {
  peer: Peer
  server: ApiServer
  node_url: string
  work_dir: string
  // A distinct noise track (its own fingerprint per seed) at work_dir/name.
  make_audio: (input: { name: string, seed: number, seconds?: number }) => string
  stop: () => Promise<void>
}

// Loopback-only libp2p (TCP on 127.0.0.1, no discovery), for a test whose
// second peer must replicate to or from the node; it dials the node itself.
export const LOOPBACK_NETWORK: NetworkConfig = {
  mode: 'public',
  listen: ['/ip4/127.0.0.1/tcp/0'],
  announce_addresses: [],
  bootstrap: [],
  mdns: false,
  dht: false,
  upnp: false,
  mainline_rendezvous: false,
  relay_server: false
}

// A multiaddr another peer can dial the given one on.
export const dial_address = async (peer: Peer): Promise<string> => {
  const { addresses, peer_id } = await peer.get_settings()
  const address = addresses?.find((candidate) => candidate.includes('/tcp/'))
  if (address === undefined) throw new Error(`peer ${peer_id} listens on no TCP address`)
  return address.includes('/p2p/') ? address : `${address}/p2p/${peer_id}`
}

// authenticate makes it a hosted node that requires a bearer token.
// managed_label_libraries is read on every request, so a test can mark a
// library it created as node-managed after seeding its labels. network
// puts the node on a network instead of none.
export const start_test_node = async ({ authenticate, managed_label_libraries, network = false }: {
  authenticate?: (token: string | undefined) => boolean
  managed_label_libraries?: Map<string, string>
  network?: NetworkConfig | false
} = {}): Promise<TestNode> => {
  const work_dir = await mkdtemp(join(tmpdir(), 'record-app-test-node-'))
  const make_audio = ({ name, seed, seconds = 6 }: { name: string, seed: number, seconds?: number }): string => {
    const path = join(work_dir, name)
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anoisesrc=d=${seconds}:c=pink:seed=${seed}:a=0.3`, '-metadata', `title=${name.replace(/\.[a-z0-9]+$/, '')}`, path])
    return path
  }
  let url_seed = 1000
  const peer = await create_peer({
    config: { network, allow_toolchain_mismatch: process.env.RECORD_TOOLCHAIN_PREFLIGHT === 'bypass' },
    resolve: async (url) => [{ extractor: 'fixture', id: url, url: 'https://media.example.test/audio.flac', ext: 'flac', fulltitle: 'From a URL' }],
    download: async ({ output_path }) => {
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `anoisesrc=d=6:c=brown:seed=${url_seed++}:a=0.3`, output_path])
    }
  })
  await start_peer(peer)
  const server = await create_api_server({ peer, resolve: as_api_resolver(peer.context.resolve), port: 0, cors_origins: [], log: false, validate_responses: true, ...(authenticate === undefined ? {} : { authenticate }), ...(managed_label_libraries === undefined ? {} : { managed_label_libraries }) })
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
