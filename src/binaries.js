'use strict'

const path = require('path')
const { remote } = require('electron')
const { platform } = require('os')

const IS_PROD = process.env.NODE_ENV === 'production'
const root = process.cwd()
const { isPackaged, getAppPath } = remote.app

const getPlatform = () => {
  switch (platform()) {
    case 'aix':
    case 'freebsd':
    case 'linux':
    case 'openbsd':
    case 'android':
      return 'linux'
    case 'darwin':
    case 'sunos':
      return 'mac'
    case 'win32':
      return 'win'
  }
}

const binariesPath =
  IS_PROD && isPackaged
    ? path.join(path.dirname(getAppPath()), '..', './Resources', './bin')
    : path.join(root, './resources', getPlatform(), './bin')

module.exports = {
  chromaprintPath: path.resolve(path.join(binariesPath, './fpcalc')),
  ffmpegPath: path.resolve(path.join(binariesPath, './ffmpeg'))
}
