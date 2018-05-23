const rnBridge = require('rn-bridge')
const os = require('os')
const path = require('path')
const debug = require('debug')
const Logger = require('logplease')
const RecordNode = require('record-node')

debug.useColors = () => false // disable colors in log (fixes xcode issue)

// Log Record / IPFS / OrbitDB
const log = debug('main')
debug.enable('main,record:*,jsipfs')
Logger.setLogLevel(Logger.LogLevels.DEBUG)

process.on('uncaughtException', (err) => {
  console.log(err)
})

log('starting')

let started = false

rnBridge.channel.on('message', (msg) => {

  if (started)
    return

  started = true

  const docsDir = msg
  const recorddir = path.resolve(docsDir, './record')

  log(`Record Dir: ${recorddir}`)

  const nodeConfig = {
    path: recorddir,
    orbitPath: path.resolve(recorddir, './orbitdb'),
    ipfsConfig: {
      EXPERIMENTAL: {
        dht: true,
        relay: false,
        pubsub: true
      },
      init: {
        bits: 1024,
        log: debug('main:init')
      },
      repo: path.resolve(recorddir, './ipfs'),
      config: {
        Addresses: {
	  Swarm: [
	    // '/ip4/0.0.0.0/tcp/4002',
	    // '/ip4/0.0.0.0/tcp/4003/ws'
	    // '/dns4/star-signal.cloud.ipfs.team/wss/p2p-webrtc-star'
	    //'/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star'
	  ]
        }
      }
    }
  }

  try {
    const node = new RecordNode(nodeConfig)

    node.on('error', function(err) {
      console.log(err)
    })

    node.on('ready', function() {
      log('RecordNode ready')
      rnBridge.channel.send('ready')
    })

  } catch(e) {
    console.log(e)
  }

  log('initialized')
})
