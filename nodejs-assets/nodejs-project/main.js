const rnBridge = require('rn-bridge')
const os = require('os')
const fs = require('fs')
const IPFS = require('ipfs')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')

const OrbitDB = require('orbit-db')
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

let rn = null
let ipfs = null
let started = false

const init = (docsPath) => {
  if (started) {
    if (!ipfs) {
      // shit

      return
    }

    if (ipfs.state.state() === 'running') {
      return rnBridge.channel.send(JSON.stringify({ action: 'ready' }))
    }

    ipfs.on('ready', () => {
      console.log('sending ready')
      rnBridge.channel.send(JSON.stringify({ action: 'ready' }))
    })
    return
  }

  started = true

  const recorddir = path.resolve(docsPath, './record')

  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  logger(`Record Dir: ${recorddir}`)

  const ipfsConfig = {
    init: {
      bits: 1024
    },
    repo: path.resolve(recorddir, './ipfs'),
    EXPERIMENTAL: {
      dht: false, // TODO: BRICKS COMPUTER
      relay: {
        enabled: true,
        hop: {
          enabled: false, // TODO: CPU hungry on mobile
          active: false
        }
      },
      pubsub: true
    },
    config: {
      Bootstrap: [],
      Addresses: {
	    Swarm: [
          '/ip4/159.203.117.254/tcp/9090/ws/p2p-websocket-star'
	    ]
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
    ipfs = new IPFS(ipfsConfig)

    ipfs.on('ready', async () => {
      const orbitAddressPath = path.resolve(recorddir, 'address.txt')
      const orbitAddress = fs.existsSync(orbitAddressPath) ?
                           fs.readFileSync(orbitAddressPath, 'utf8') : undefined

      logger(`Orbit Address: ${orbitAddress}`)

      const opts = {
        orbitPath: path.resolve(recorddir, './orbitdb')
      }
      rn = new RecordNode(ipfs, OrbitDB, opts)

      try {
        await rn.init(orbitAddress)
        const log = await rn.log.get()
        fs.writeFileSync(orbitAddressPath, rn._log.address)
      } catch (e) {
        console.log(e)
      }

      rnBridge.channel.send(JSON.stringify({ action: 'ready' }))
    })

  } catch (e) {
    console.log(e)
  }

  logger('initialized')
}

rnBridge.channel.on('message', async (message) => {

  const msg = JSON.parse(message)
  logger(msg)

  const send = (reply) => {
    const m = Object.assign({}, { action: msg.action }, reply)
    rnBridge.channel.send(JSON.stringify(m))
  }

  let data

  switch(msg.action) {
    case 'init':
      init(msg.data.docsPath)
      break

    case 'suspend':
      ipfs.stop()
      break

    case 'resume':
      ipfs.start((err) => {
        if (err) {
          console.log(err)
        }

        logger('ipfs started')
      })
      break

    case 'resolve':
      if (!rn) {
        return
      }

      try {
        data = await rn.resolve(msg.data.url)
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }

    case 'contacts:get':
      if (!rn) {
        return
      }

      try {
        data = await rn.contacts.list(msg.data.logId)
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'contacts:add':
      if (!rn) {
        return
      }

      try {
        const { address, alias } = msg.data
        data = await log.contacts.add({ address, alias })
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'info:get':
      if (!rn) {
        return
      }

      try {
        data = await rn.info()
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'tracks:get':
      if (!rn) {
        return
      }

      try {
        const { start, limit } = msg.data.params
        data = await rn.tracks.list(msg.data.logId, { start, limit })
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'tracks:add':
      if (!rn) {
        return
      }

      try {
        const { title, url } = msg.data
        data = await rn.tracks.add({ url, title })
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'tags:get':
      if (!rn) {
        return
      }

      try {
        const { logId } = msg.data
        data = await rn.tags.list(logId)
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'tags:add':
      if (!rn) {
        return
      }

      try {
        const { track, tag } = msg.data
        data = await rn.tags.add(track, tag)
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }
      break

    case 'tags:delete':
      if (!rn) {
        return
      }

      try {
        const { trackId, tag } = msg.data
        data = await rn.tags.remove(trackId, tag)
        send({ data })
      } catch (e) {
        console.log(e)
        send({ error: e.toString() })
      }

    default:
      logger(`Invalid message action: ${msg.action}`)
  }

})
