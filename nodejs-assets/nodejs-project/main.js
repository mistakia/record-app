console.log(`Node version: ${process.versions.node}`)

require('@babel/polyfill')

const rnBridge = require('rn-bridge')
const os = require('os')
const fs = require('fs')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')
const RecordNode = require('record-node')

debug.useColors = () => false // disable colors in log (fixes xcode issue)

// Log Record / IPFS / OrbitDB
const logger = debug('main')
debug.enable('main,ipfs:*,record:*') //libp2p:switch:dial,libp2p:switch:transport,libp2p:swarm:dialer')
Logger.setLogLevel(Logger.LogLevels.DEBUG)

process.on('uncaughtException', (err) => {
  console.log(err)
})

logger('starting')

let record = null
let started = false

const init = (docsPath) => {
  if (started) {
    if (!record) {
      // shit
      return
    }

    if (record._ipfs.state.state() === 'running') {
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

  try {
    const orbitAddressPath = path.resolve(recorddir, 'address.txt')
    const orbitAddress = fs.existsSync(orbitAddressPath) ?
      fs.readFileSync(orbitAddressPath, 'utf8') : 'record'

    const opts = {
      address: orbitAddress,
      orbitdb: {
        directory: path.resolve(recorddir, './orbitdb')
      },
      bitboot: {
        enabled: true
      },
      api: true,
      ipfs: {
        init: {
          // log: sendState, see https://github.com/ipfs/js-ipfs/issues/2170
          bits: 1024
        },
        repo: path.resolve(recorddir, './ipfs'),
        connectionManager: {
          maxPeers: 10,
          minPeers: 2,
          pollInterval: 20000 // ms
        }
      }
    }

    logger('Starting Node')
    record = new RecordNode(opts)
    record.on('ipfs:state', (state) => sendState(state))
    record.on('ready', async () => {
      try {
        const log = await record.log.get()
        logger(`Orbit Address: ${record._log.address}`)
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
  record._ipfs.stop(() => {
    logger('ipfs stopped, pauseLock releasing')
    pauseLock.release()
  })
})

rnBridge.app.on('resume', () => {
  logger('node app resumed')
  record._ipfs.start((err) => {
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
      init(rnBridge.app.datadir())
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
