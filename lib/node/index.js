//const wrtc = require('wrtc') // or require('electron-webrtc')()
//const WStar = require('libp2p-webrtc-star')
//const wstar = new WStar({ wrtc: wrtc })
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const EventEmitter = require('events')
const path = require('path')
const os = require('os')

const app = require('./app')

const defaultOptions = {
  directory: path.resolve(os.tmpdir(), './orbitdb'),
  repo: path.resolve(os.tmpdir(), './ipfs'),
  init: true,
  pass: '2662d47e3d692fe8c2cdb70b907ebb12b216a9d9ca5110dd336d12e7bf86073b',
  EXPERIMENTAL: {
    pubsub: true
  },

  /* config: {
   *   Addresses: {
   *     Swarm: [
   *   	"/ip4/0.0.0.0/tcp/4002",
   *   	"/ip4/127.0.0.1/tcp/4003/ws",
   *   	"/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star"
   *     ]
   *   }
   * },
   * libp2p: {
   *   modules: {
   *     transport: [wstar],
   *     discovery: [wstar.discovery]
   *   }
   * }
   */

  
  config: {
    Addresses: {
      Swarm: [
	//'/ip4/0.0.0.0/tcp/4002',
	//'/ip4/0.0.0.0/tcp/4003/ws'
	//'/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star'
	//'/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
      ]
    }
  }
}


class RecordNode extends EventEmitter {
  constructor(options) {
    super()

    this._ipfs = null
    this._orbitdb = null
    this._options = options

    this._start()
  }


  _start() {
    console.log('Starting RecordNode')
    this._ipfs = new IPFS(this._options || defaultOptions)

    this._ipfs.on('error', (e) => this.emit('error', e))

    const self = this
    this._ipfs.on('ready', async () => {

      setInterval(async () => {
	const networkPeers = await self._ipfs.swarm.peers()
	console.log(`IPFS Online: ${Date.now()} - ${self._ipfs.isOnline()}`)
	console.log(`Network Peers: ${networkPeers.length}`)
	networkPeers.forEach(function(p) {
	  console.log(`Network PeerId: ${p.peer.id.toB58String()}`)
	})
      }, 10000)

      self._orbitdb = new OrbitDB(self._ipfs, self._options && self._options.directory)

      const ipfsInfo = await self._ipfs.id()
      console.log(`IPFS ID: ${ipfsInfo.id}`)
      console.log(`Orbit ID: ${self._orbitdb.id}`)
      console.log(`Orbit Dir: ${self._orbitdb.directory}`)

      self.emit('ready')

      await self._ipfs.swarm.connect('/ip4/159.203.117.254/tcp/4003/ws/ipfs/QmPoJPyC5XYshh3DixgQMC5egDnFcFHFMG8V1Et6fWpaFq')

      const address = '/orbitdb/QmWnGoDpb4h767jz5BGMpo1agxAthyZa1yq8NYdp8RuQVL/record'
      const db = await self._orbitdb.log(address, { sync: true })

      const limit = -1

      console.log(`DB Address: ${db.address}`)

      db.events.on('load.progress', (address, hash, entry, progress, total) => {
	console.log('db - load.progress', progress, total)
      })

      db.events.on('replicate', (address) => console.log('db - replicate', address ))
      db.events.on('replicate.progress', (address, hash, entry, progress, total) => console.log(`replicate progress for ${address} - ${progress} of ${total}`))

      db.events.on('ready', () => {
	console.log('db ready')
      })

      db.events.on('replicated', (address, length) => {
	console.log(`Replicated: ${address} - ${length}`)

	//TODO: figure out when the entire remote database has replicated
	/* const result = db.iterator({ limit: limit }).collect()
	 * res.send({
	 *   result: result
	 * })*/
      })

      db.events.on('peer', (peer) => {
	console.log(`Peer: ${peer}`)
      })

      await db.load()
    })

    this._app = app(this)

    this._app.listen(3000, () => console.log('Node API listening on port 3000'))
  }

}

module.exports = RecordNode
