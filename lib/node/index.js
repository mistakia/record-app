//const wrtc = require('wrtc') // or require('electron-webrtc')()
//const WStar = require('libp2p-webrtc-star')
//const wstar = new WStar({ wrtc: wrtc })
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const EventEmitter = require('events')
const extend = require('deep-extend')
const path = require('path')
const os = require('os')
const Logger  = require('logplease')

let logger = Logger.create('record-node', { color: Logger.Colors.Magenta })

const api = require('./api')

const RecordLog = require('./log')

const defaults = {
  orbitPath: path.resolve(os.tmpdir(), './orbitdb'),
  ipfsConfig: {
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
}


class RecordNode extends EventEmitter {
  constructor(options) {
    super()

    this._ipfs = null
    this._orbitdb = null
    this._options = extend(defaults, options || {})

    this._start()
  }


  _start() {
    logger.info('Starting RecordNode')
    this._ipfs = new IPFS(this._options.ipfsConfig)

    this._ipfs.on('error', (e) => this.emit('error', e))

    const self = this
    this._ipfs.on('ready', async () => {

      self._orbitdb = new OrbitDB(self._ipfs, self._options.orbitPath)

      const ipfsConfig = await self._ipfs.config.get()
      const ipfsInfo = await self._ipfs.id()
      logger.info(`IPFS ID: ${ipfsInfo.id}`)
      logger.info(`IPFS Config: ${JSON.stringify(ipfsConfig, null, 2)}`)
      logger.info(`Orbit ID: ${self._orbitdb.id}`)
      logger.info(`Orbit Dir: ${self._orbitdb.directory}`)

      self._log = new RecordLog(self._orbitdb)
      await self._log.load()

      self.emit('ready')

    })

    this._api = api(this)

    this._api.listen(3000, () => logger.info('RecordNode API listening on port 3000'))
  }

}

module.exports = RecordNode
