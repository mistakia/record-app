'use strict'

const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
const electron = require('electron')
const Logger  = require('logplease')
const path = require('path')
const os = require('os')
const fs = require('fs')
const RecordNode = require('record-node')
const debug = require('debug')
const OrbitDB = require('orbit-db')
const IPFS = require('ipfs')

const config = require('./config/project.config')

debug.enable('repo,jsipfs:*,record:*,libp2p:*,bitswap:*')
Logger.setLogLevel(Logger.LogLevels.DEBUG)
let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

process.on('uncaughtException', (err) => {
  console.log(err)
  process.exit()
})

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
    maxHeight: 800
  })

  const indexUrl = config.globals.__DEV__
		 ? 'http://localhost:8000/'
		 : 'file://' + __dirname + '/index.desktop.html'

  mainWindow.loadURL(indexUrl)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null

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


  try {
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
      }
    }
    const ipfs = new IPFS(ipfsConfig)
    ipfs.on('ready', async () => {
      createWindow()

      const orbitAddressPath = path.resolve(recorddir, 'address.txt')
      const orbitAddress = fs.existsSync(orbitAddressPath) ?
                           fs.readFileSync(orbitAddressPath, 'utf8') : undefined

      logger.info(`Orbit Address: ${orbitAddress}`)

      const opts = {
        orbitAddress: orbitAddress,
        orbitPath: path.resolve(recorddir, './orbitdb'),
        api: true
      }

      const rn = new RecordNode(ipfs, OrbitDB, opts)
      try {
        await rn.loadLog()
        fs.writeFileSync(orbitAddressPath, rn._log.address)

        rn.syncContacts()
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
