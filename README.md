# Record App

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat)](https://github.com/RichardLitt/standard-readme)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmistakia%2Frecord-app.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmistakia%2Frecord-app?ref=badge_shield)

> Desktop, mobile and web app for Record.

A proof of concept distributed social & music application (library, sharing, discovery & curation) network built entirely on [IPFS](https://github.com/ipfs/js-ipfs). User data is stored via a [scuttlebot](http://scuttlebot.io/)-like immutable log via [IPFS-Log](https://github.com/orbitdb/ipfs-log) & [OrbitDB](https://github.com/orbitdb/orbit-db). Bootstraping/peer discovery is done via [bitboot](https://github.com/tintfoundation/bitboot)

##### Record Node
This repo is a react & react native UI for [Record Node](https://github.com/mistakia/record-node).

## Install
```
npm install
```

## Usage
### Desktop (Electron)
```
npm run rebuild:electron // rebuild node bindings for electron
npm run start:electron
```

Note: fpcalc ([chromaprint](https://github.com/acoustid/chromaprint)) must be installed to be able to import audio files.
##### OSX using Homebrew
```
brew install chromaprint
```

##### Ubuntu
```
sudo apt-get install libchromaprint-tools
```

### Mobile (React Native)
First, install packages needed by nodejs-mobile:
```
npm run install:nodejs-mobile
```

Then, start react native packager with:
```
npm run start
```

#### iOS
```
npm run build:ios // or `npm run build:ios:dev`
npm run start:ios // or open & build with xcode `open ios/Record.xcodeproj/`
```

#### Android
```
npm run build:android
npm run start:android
```

## License
MIT


[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fmistakia%2Frecord-app.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fmistakia%2Frecord-app?ref=badge_large)
