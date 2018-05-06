'use strict'

const { default: installExtension, REDUX_DEVTOOLS } = require('electron-devtools-installer');
const electron = require('electron')
const Logger  = require('logplease')
const path = require('path')
const RecordNode = require('record-node')
const config = require('./config/project.config')
const debug = require('debug')

debug.enable('jsipfs:*,record:*')

let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

process.on('uncaughtException', (err) => {
  logger.error(err)
})

// Module to control application life.
const app = electron.app

const userDataPath = app.getPath('userData')
logger.info(`User Data: ${userDataPath}`)

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
    minWidth: 300,
    minHeight: 475,
    maxWidth: 800,
    maxHeight: 600
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
  installExtension(REDUX_DEVTOOLS)
    .then((name) => logger.info(`Added Extension: ${name}`))
    .catch((err) => logger.error('An error occurred: ', err));


  const node = new RecordNode({
    ipfsConfig: {
      repo: path.resolve(userDataPath, './ipfs')
    },
    orbitPath: path.resolve(userDataPath, './orbitdb')
  })

  node.on('ready', function() {
    logger.info('Record Node running.')
    createWindow()
  })
 
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
