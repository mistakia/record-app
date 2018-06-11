# Record App

[![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat)](https://github.com/RichardLitt/standard-readme)

> Desktop, mobile and web app for Record.

A proof of concept distributed social & music application (library, sharing, discovery & curation) network built entirely on [IPFS](https://github.com/ipfs/js-ipfs). User data is stored via a [scuttlebot](http://scuttlebot.io/)-like immutable log via [IPFS-Log](https://github.com/orbitdb/ipfs-log) & [OrbitDB](https://github.com/orbitdb/orbit-db).

##### Record Node
This repo is a react & react native UI for [Record Node](https://github.com/mistakia/record-node).

## Install
```
npm install
```

## Usage
### Desktop (Electron)
```
npm run start:electron
```

### Mobile (React Native)
First, start react native packager with:
```
npm run start
```

#### iOS
```
npm run start:ios
```

#### Android
```
npm run start:android
```

## License
MIT
