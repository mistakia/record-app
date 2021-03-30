require('v8-compile-cache')

const fs = require('fs')
const path = require('path')
const jsonfile = require('jsonfile')
const RecordNode = require('record-node')
const electron = require('electron')

const createIPFSDaemon = require('record-ipfsd')

const { chromaprintPath, ffmpegPath } = require('./binaries')
const log = require('./logger')

const ipc = electron.ipcRenderer
const { app, dialog } = electron.remote

const getIpfsBinPath = () => require('go-ipfs')
  .path()
  .replace('app.asar', 'app.asar.unpacked')

const isDev = process.env.NODE_ENV === 'development'
log.info(`process id: ${process.pid}, isDev: ${isDev}`)

let record
let ipfsd

const main = async () => {
  const recorddir = path.resolve(isDev ? app.getPath('temp') : app.getPath('appData'), './record')
  if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

  const infoPath = path.resolve(recorddir, 'info.json')
  const info = (fs.existsSync(infoPath) && jsonfile.readFileSync(infoPath)) || {}
  const orbitAddress = info.address || 'record'
  const id = info.id
  log.info(`ID: ${id}`)
  log.info(`Orbit Address: ${orbitAddress}`)
  let opts = {
    directory: recorddir,
    store: {
      replicationConcurrency: 240
    },
    logger: {
      info: log.info.bind(log),
      error: log.error.bind(log)
    },
    address: orbitAddress,
    api: true,
    chromaprintPath,
    ffmpegPath
  }

  if (isDev) {
    opts.api = { port: 3001 }
    opts.bitboot = { enabled: false }
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
      log.info(JSON.stringify(data, null, 2))
      ipc.send('ready', data)
      record.on('redux', data => ipc.send('redux', data))

      jsonfile.writeFileSync(infoPath, {
        id: data.id,
        address: data.orbitdb.address
      }, { spaces: 2 })

      setTimeout(() => record.logs.connect(), 5000)
    } catch (error) {
      log.error(error)
    }
  })

  try {
    ipfsd = await createIPFSDaemon({
      repo: path.resolve(recorddir, 'ipfs'),
      log: log.info.bind(log),
      ipfsBin: getIpfsBinPath()
    })
    await record.init(ipfsd)
  } catch (error) {
    log.error(error)

    await dialog.showMessageBox({
      type: 'error',
      message: 'Startup error, please restart.',
      detail: error.toString()
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
} catch (error) {
  log.error(error)
}

const handler = async () => {
  log.info(`Online: ${navigator.onLine}`)

  if (ipfsd && navigator.onLine) {
    // await ipfsd.stop()
    // await ipfsd.start()
  }
}

ipc.on('STOP_IPFS', async () => {
  await ipfsd.stop()
  ipc.send('IPFS_STOPPED')
})
window.addEventListener('online', handler)
window.addEventListener('offline', handler)
window.onbeforeunload = async (e) => {
  if (ipfsd) {
    await ipfsd.stop()
    log.info('ipfs shutdown successfully')
  }

  if (record) {
    await record.stop()
    log.info('record shutdown successfully')
  }
  window.onbeforeunload = null
  app.exit()
  e.returnValue = false
}
