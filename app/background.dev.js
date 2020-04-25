require('v8-compile-cache')

const fs = require('fs')
const path = require('path')
const jsonfile = require('jsonfile')
const RecordNode = require('record-node')
const electron = require('electron')
const ipc = electron.ipcRenderer
const { app, dialog } = electron.remote
const { chromaprintPath } = require('./binaries')

console.log(`process id: ${process.pid}`)

const isDev = process.env.NODE_ENV === 'development'

if (isDev || process.env.DEBUG_PROD === 'true') {
  const Logger = require('logplease')
  const debug = require('debug')
  debug.enable('record:*,ipfs,libp2p,libp2p:gossipsub,bitswap,libp2p:connection-manager,ipfs:bitswap')
  Logger.setLogLevel(Logger.LogLevels.DEBUG)
}

let record

const main = async () => {
  const recorddir = path.resolve(isDev ? app.getPath('temp') : app.getPath('appData'), './record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  const infoPath = path.resolve(recorddir, 'info.json')
  const info = (fs.existsSync(infoPath) && jsonfile.readFileSync(infoPath)) || {}
  const orbitAddress = info.address || 'record'
  const id = info.id

  console.log(`ID: ${id}`)
  console.log(`Orbit Address: ${orbitAddress}`)
  let opts = {
    directory: recorddir,
    store: {
      replicationConcurrency: 240
    },
    address: orbitAddress,
    api: true,
    chromaprintPath
  }

  if (isDev) {
    opts.api = { port: 3001 }
    opts.bitboot = { enabled: false }
    opts.ipfs = {
      config: {
        Addresses: {
          Swarm: [
            '/ip4/0.0.0.0/tcp/0/ws',
            '/ip4/206.189.77.125/tcp/5892/ws/p2p-stardust/p2p/QmPb9StGzfenPYnkyjpc5taLXwoC5hxdUgQub5LSi4AewA'
          ]
        }
      }
    }
  }

  if (id) {
    opts.id = id
  }

  if (app.isPackaged) {
    opts.youtubedlPath = path.join(path.dirname(app.getAppPath()), 'app.asar.unpacked/node_modules/youtube-dl/bin/youtube-dl')
  }

  record = new RecordNode(opts)
  record.on('id', (data) => {
    jsonfile.writeFileSync(infoPath, {
      id: data.id,
      address: data.orbitdb.address
    }, { spaces: 2 })
  })

  record.on('ready', async (data) => {
    try {
      console.log(data)
      ipc.send('ready', data)
      record.on('redux', data => ipc.send('redux', data))

      jsonfile.writeFileSync(infoPath, {
        id: data.id,
        address: data.orbitdb.address
      }, { spaces: 2 })

      setTimeout(() => record.logs.connect(), 5000)
    } catch (e) {
      console.log(e)
    }
  })

  try {
    await record.init()
  } catch (err) {
    console.log(err)

    await dialog.showMessageBox({
      type: 'error',
      message: 'Startup error, please restart.',
      detail: err.toString()
    })

    if (
      process.env.NODE_ENV === 'production' &&
        process.env.DEBUG_PROD !== 'true'
    ) {
      ipc.send('error')
    }
  }
}

try {
  main()
} catch (err) {
  console.log(err)
}

window.onbeforeunload = async (e) => {
  if (record) {
    await record.stop()
    console.log('record shutdown successfully')
    window.onbeforeunload = null
    app.exit()
  }
  e.returnValue = false
}
