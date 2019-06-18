console.log(`Node version: ${process.versions.node}`)

require('@babel/polyfill')

const rnBridge = require('rn-bridge')
//const os = require('os')
const fs = require('fs')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')
const RecordNode = require('record-node')

// Log Record / IPFS / OrbitDB
debug.useColors = () => false // disable colors in log (fixes xcode issue)
const logger = debug('main')
debug.enable('main,ipfs,ipfs:err,record:*') //libp2p:switch:dial,libp2p:switch:transport,libp2p:swarm:dialer')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
process.on('uncaughtException', logger)

const docsPath = rnBridge.app.datadir()
const recorddir = path.resolve(docsPath, './record')
if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }
logger(`Record Dir: ${recorddir}`)

const sendState = (state) => {
  rnBridge.channel.send(JSON.stringify({
    action: 'ipfs:state',
    data: state
  }))
}

let record

try {
  const orbitAddressPath = path.resolve(recorddir, 'address.txt')
  const orbitAddress = fs.existsSync(orbitAddressPath) ?
    fs.readFileSync(orbitAddressPath, 'utf8') : 'record'

  const opts = {
    address: orbitAddress,
    store: {
      replicationConcurrency: 1
    },
    orbitdb: {
      directory: path.resolve(recorddir, './orbitdb')
    },
    bitboot: {
      enabled: false
    },
    api: true,
    ipfs: {
      init: {
        // log: sendState, see https://github.com/ipfs/js-ipfs/issues/2170
        bits: 1024
      },
      repo: path.resolve(recorddir, './ipfs'),
      config: {
        Addresses: {
          Swarm: [
            '/ip4/206.189.77.125/tcp/9090/ws/p2p-websocket-star/'
          ]
        }
      },
      connectionManager: {
        maxPeers: 10,
        minPeers: 2,
        pollInterval: 60000 // ms
      },
      libp2p: {
        config: {
          peerDiscovery: {
            mdns: {
              enabled: false
            }
          },
          relay: {
            enabled: false
          }
        }
      }
    }
  }

  logger('Starting Record & IPFS')
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
  logger(e)
  sendState('failed')
}
