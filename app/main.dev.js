'use strict'

import 'v8-compile-cache'
import electron from 'electron'
import path from 'path'
import os from 'os'

const { BrowserWindow, app, ipcMain: ipc } = electron

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support')
  sourceMapSupport.install()
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')({
    devToolsMode: 'detach'
  })
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS']

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log)
}


process.on('uncaughtException', error => {
  console.log(error)
  process.exit(1)
})

process.on('unhandledRejection', error => {
  console.log(error)
  process.exit(1)
});

console.log(`Electron Node version: ${process.versions.node}`)
console.log(`Development Mode: ${process.env.NODE_ENV}`)

// Module to control application life.
app.disableHardwareAcceleration()

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let backgroundWindow

const createMainWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    maxWidth: 1800,
    maxHeight: 1000,
    show: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: true
    }
    /* process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
     *   ? {
     *     nodeIntegration: true
     *   }
     *   : {
     *     preload: path.join(__dirname, 'dist/renderer.prod.js')
     *   } */
  })

  mainWindow.loadURL(`file://${__dirname}/index.html`);

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

const createBackgroundWindow = () => {
  backgroundWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true
    }
        /* process.env.NODE_ENV === 'development' || process.env.E2E_BUILD === 'true'
         *   ? {
         *     nodeIntegration: true
         *   }
         *   : {
         *     preload: path.join(__dirname, 'background.prod.js')
         *   } */
  })
  backgroundWindow.loadURL(`file://${__dirname}/background.html`)

  ipc.on('ipfs:state', (event, data) => {
    if (mainWindow) mainWindow.webContents.send('ipfs:state', data)
  })

  ipc.on('ready', (event, data) => {
    const sendReady = () => mainWindow.webContents.send('ready', data)
    sendReady()
    mainWindow.webContents.on('did-finish-load', sendReady)
  })

  ipc.on('redux', (event, data) => {
    if (data.type === 'TRACK_ADDED') {
      mainWindow.show()
    }
    if (mainWindow) mainWindow.webContents.send('redux', data)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  if (
    process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  createMainWindow()
  createBackgroundWindow()
  // TODO : on loadPrivateKey from mainWindow - recreate background node
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
    createMainWindow()
  }
})
