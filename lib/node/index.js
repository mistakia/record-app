//const wrtc = require('wrtc') // or require('electron-webrtc')()
//const WStar = require('libp2p-webrtc-star')
//const wstar = new WStar({ wrtc: wrtc })
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const express = require('express')
const EventEmitter = require('events')

const defaultOptions = {
  repo: './orbitDB/record',
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
	'/ip4/0.0.0.0/tcp/4002',
	'/ip4/0.0.0.0/tcp/4003/ws'
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
    this._ipfs = new IPFS(this._options || defaultOptions)

    this._ipfs.on('error', (e) => this.emit('error', e))

    const self = this
    this._ipfs.on('ready', async () => {

      /* setInterval(async () => {
	 const networkPeers = await self._ipfs.swarm.peers()
	 console.log(`IPFS Online: ${Date.now()} - ${self._ipfs.isOnline()}`)
	 console.log(`Network Peers: ${networkPeers.length}`)
	 networkPeers.forEach(function(p) {
	 console.log(`Network PeerId: ${p.peer.id.toB58String()}`)
	 })
       * }, 10000)
       */
      const ipfsInfo = await self._ipfs.id()
      self._orbitdb = new OrbitDB(self._ipfs, self._options && self._options.directory)

      console.log(`IPFS ID: ${ipfsInfo.id}`)
      console.log(`Orbit ID: ${self._orbitdb.id}`)

      self.emit('ready')
    })

    this._app = express()

    this._app.use(function(req, res, next) {
      res.header('Access-Control-Allow-Origin', '*')
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })

    this._app.get('/', async (req, res) => {
      const ipfsInfo = await self._ipfs.id()

      res.send({
	id: self._orbitdb.id,
	addresses: ipfsInfo.addresses
      })
    })

    this._app.post('/orbitdb/db/', async (req, res) => {
      const address = req.query.address
      const db = await self._orbitdb.log(address, { sync: true })

      setInterval(async () => {
	const databasePeers = await self._ipfs.pubsub.peers(db.address.toString())
	console.log(`Databse Peers: ${databasePeers.length}`)
      }, 10000)

      console.log(`DB Address: ${db.address}`)

      db.events.on('synced', (res) => {
	console.log('db synced', res)
      })

      db.events.on('load.progress', (address, hash, entry, progress, total) => {
	console.log('db - load.progress', progress, total)
      })

      db.events.on('replicate', (address) => console.log('db - replicate', address ) )
      db.events.on('replicate.progress', (address) => console.log('db - replicate progress', address) )

      db.events.on('ready', () => {
	console.log('db ready')
      })

      db.events.on('updated', (res) => {
	console.log('updated')
	console.log(res)
      })

      db.events.on('replicated', (address) => {
	console.log(`Replicated: ${address}`)

	//const latest = db.iterator({ limit: 5 }).collect()
	//console.log(JSON.stringify(latest, null, 2))
      })

      db.events.on('peer', (peer) => {
	console.log(peer)
      })

      await db.load()
    })

    this._app.post('/ipfs/swarm/connect', (req, res) => {
      const multiaddr = req.query.multiaddr
      self._ipfs.swarm.connect(multiaddr, (err, data) => {
	res.send( err ? { error: err } : { data : data })
      })
    })

    this._app.listen(3000, () => console.log('Node API listening on port 3000'))
  }

}

module.exports = RecordNode
