'use strict'

const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
const electron = require('electron')
const Logger  = require('logplease')
const path = require('path')
const os = require('os')
const fs = require('fs')
const RecordNode = require('record-node')
const debug = require('debug')
const IPFS = require('ipfs')

const config = require('./config/project.config')

if (config.globals.__DEV__) {
  require('electron-debug')()
}

debug.enable('record:*')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

process.on('uncaughtException', error => {
  logger.error(error)
  process.exit()
})

process.on('unhandledRejection', error => {
  logger.error(error)
  process.exit()
});

logger.info(`Electron Node version: ${process.versions.node}`)

// Module to control application life.
const app = electron.app

// const userDataPath = app.getPath('userData')
// logger.info(`User Data: ${userDataPath}`)
const recorddir = path.resolve(os.homedir(), './.record')
if (!fs.existsSync(recorddir)) { fs.mkdirSync(recorddir) }

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const logToRenderer = (source, level, text) => {
  if (mainWindow)
    mainWindow.webContents.send('log', source, level, text)
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    minWidth: 600,
    minHeight: 475,
    maxWidth: 1000,
    maxHeight: 800,
    show: false
  })

  const indexUrl = config.globals.__DEV__
		 ? 'http://localhost:8000/'
		 : 'file://' + __dirname + '/index.desktop.html'

  mainWindow.loadURL(indexUrl)

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null

  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })
}

function clearData () {
  const ses = mainWindow.webContents.session
  ses.clearStorageData((err) => {
    if (err) logger.error(err)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  installExtension(REDUX_DEVTOOLS.id)
    .then((name) => logger.info(`Added Extension: ${name}`))
    .catch((err) => logger.error('An error occurred: ', err));

  createWindow()

  try {
    const ipfsConfig = {
      init: {
        bits: 2048
      },
      repo: path.resolve(recorddir, './ipfs'),
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
            enabled: true
          }
        }
      },
      connectionManager: {
        maxPeers: 100,
        minPeers: 10,
        pollInterval: 60000 // ms
      }
    }
    const ipfs = new IPFS(ipfsConfig)
    ipfs.state.on('done', () => {
      mainWindow.webContents.send('ipfs:state', ipfs.state._state)
    })
    ipfs.on('ready', async () => {

      const orbitAddressPath = path.resolve(recorddir, 'address.txt')
      const orbitAddress = fs.existsSync(orbitAddressPath) ?
                           fs.readFileSync(orbitAddressPath, 'utf8') : undefined

      logger.info(`Orbit Address: ${orbitAddress}`)

      let opts = {
        orbitdb: {
          directory: path.resolve(recorddir, './orbitdb')
        },
        api: true
      }

      const record = new RecordNode(ipfs, opts)
      try {
        await record.init(orbitAddress)
        const log = await record.log.get()

        fs.writeFileSync(orbitAddressPath, record.address)

        mainWindow.webContents.send('ready', record.adresss)
        mainWindow.webContents.on('did-finish-load', () => {
          // TODO: check if ipfs status first
          mainWindow.webContents.send('ready', record.address)
        })
      } catch (e) {
        console.log(e)
      }
    })
  } catch (err) {
    logger.error(`Error starting node: ${err.toString()}`)
    console.log(err)
  }

  // Pass log messages to the renderer process
  Logger.events.on('data', logToRenderer)

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})
