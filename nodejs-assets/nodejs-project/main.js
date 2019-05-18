console.log(`Node version: ${process.versions.node}`)

require('@babel/polyfill')

const rnBridge = require('rn-bridge')
const os = require('os')
const fs = require('fs')
const IPFS = require('ipfs')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')

const RecordNode = require('record-node')

debug.useColors = () => false // disable colors in log (fixes xcode issue)

// Log Record / IPFS / OrbitDB
const logger = debug('main')
debug.enable('main,jsipfs,record:*') //libp2p:switch:dial,libp2p:switch:transport,libp2p:swarm:dialer')
Logger.setLogLevel(Logger.LogLevels.DEBUG)

process.on('uncaughtException', (err) => {
  console.log(err)
})

logger('starting')

let record = null
let ipfs = null
let started = false

const init = (docsPath) => {
  if (started) {
    if (!ipfs || !record) {
      // shit
      return
    }

    if (ipfs.state.state() === 'running') {
      return rnBridge.channel.send(JSON.stringify({ action: 'ready', data: record.address }))
    }

    // shit
    return
  }

  started = true

  const recorddir = path.resolve(docsPath, './record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }
  logger(`Record Dir: ${recorddir}`)

  const sendState = (state) => {
    rnBridge.channel.send(JSON.stringify({
      action: 'ipfs:state',
      data: state
    }))
  }

  const ipfsConfig = {
    init: {
      bits: 1024,
      emptyRepo: true,
      log: sendState
    },
    repo: path.resolve(recorddir, './ipfs'),
    preload: {
      enabled: false
    },
    EXPERIMENTAL: {
      dht: false, // TODO: BRICKS COMPUTER
      pubsub: true
    },
    config: {
      Bootstrap: [],
      Addresses: {
	    Swarm: [
          '/ip4/0.0.0.0/tcp/4002',
          '/ip4/0.0.0.0/tcp/4003/ws',
          '/ip4/159.203.117.254/tcp/9090/ws/p2p-websocket-star'
	    ]
      }
    },
    libp2p: {
      config: {
        relay: {
          enabled: false
        }
      }
    },
    connectionManager: {
      maxPeers: 10,
      minPeers: 2,
      pollInterval: 20000 // ms
    }
  }

  try {
    // Create the IPFS node instance
    logger('Starting IPFS')
    ipfs = new IPFS(ipfsConfig)

    ipfs.state.on('done', () => {
      sendState(ipfs.state._state)
    })

    ipfs.on('ready', async () => {
      const orbitAddressPath = path.resolve(recorddir, 'address.txt')
      const orbitAddress = fs.existsSync(orbitAddressPath) ?
                           fs.readFileSync(orbitAddressPath, 'utf8') : undefined

      logger(`Orbit Address: ${orbitAddress}`)

      const opts = {
        orbitdb: {
          directory: path.resolve(recorddir, './orbitdb')
        },
        bitboot: {
          enabled: true
        }
      }
      record = new RecordNode(ipfs, opts)

      try {
        await record.init(orbitAddress)
        const log = await record.log.get()
        fs.writeFileSync(orbitAddressPath, record._log.address)
      } catch (e) {
        console.log(e)
      }

      rnBridge.channel.send(JSON.stringify({ action: 'ready', data: record.address }))
    })

  } catch (e) {
    console.log(e)
  }

  logger('initialized')
}

init(rnBridge.app.datadir())

rnBridge.app.on('pause', (pauseLock) => {
  logger('node app paused')
  ipfs.stop(() => {
    logger('ipfs stopped, pauseLock releasing')
    pauseLock.release()
  })
})

rnBridge.app.on('resume', () => {
  logger('node app resumed')
  ipfs.start((err) => {
    if (err) {
      return logger(err)
    }

    logger('ipfs started')
  })
})

rnBridge.channel.on('message', async (message) => {

  const msg = JSON.parse(message)
  logger(msg)

  const send = (data) => {
    const m = Object.assign({}, { action: msg.action }, data)
    rnBridge.channel.send(JSON.stringify(m))
  }

  const RPC = async (apiFunction, params = []) => {
    if (!record) {
      return
    }

    try {
      const data = await apiFunction.call(record, ...params)
      send({ data })
    } catch (e) {
      console.log(e)
      send({ error: e.toString() })
    }
  }

  switch(msg.action) {
    case 'init':
      //init(msg.data.docsPath)
      break

    case 'suspend':
      //ipfs.stop()
      break

    case 'resume':
      /* ipfs.start((err) => {
       *   if (err) {
       *     return console.log(err)
       *   }

       *   logger('ipfs started')
       * }) */
      break

    case 'resolve':
      RPC(record.resolve, [msg.data.url])
      break

    case 'contacts:get':
      RPC(record.contacts.list, [msg.data.logId])
      break

    case 'contacts:add': {
      const { address, alias } = msg.data
      RPC(record.contacts.add, [{ address, alias }])
      break
    }

    case 'contacts:delete': {
      const { contactId } = msg.data
      RPC(record.contacts.remove, [contactId])
      break
    }

    case 'feed:get':
      RPC(record.feed.list, [msg.data.params])
      break

    case 'info:get':
      RPC(record.info)
      break

    case 'peers:get':
      RPC(record.peers.list)
      break

    case 'profile:get':
      RPC(record.profile.get, [msg.data.logId])
      break

    case 'profile:set':
      RPC(record.profile.set, [msg.data])
      break

    case 'suggested:contacts:get':
      RPC(record.suggested.contacts)
      break

    case 'tracks:get':
      RPC(record.tracks.list, [msg.data.logId, msg.data.params])
      break

    case 'tracks:add': {
      const { url, title } = msg.data
      RPC(record.tracks.add, [{ url, title }])
      break
    }

    case 'tags:get':
      RPC(record.tags.list, [msg.data.logId])
      break

    case 'tags:add': {
      const { cid, tag } = msg.data
      RPC(record.tags.add, [cid, tag])
      break
    }

    case 'tags:delete': {
      const { trackId, tag } = msg.data
      RPC(record.tags.remove, [trackId, tag])
      break
    }

    default:
      logger(`Invalid message action: ${msg.action}`)
  }

})
