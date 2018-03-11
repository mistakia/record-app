import React from 'react'
import { AppRegistry } from 'react-native'
import 'react-native-browser-polyfill'
import 'node-libs-react-native/globals'

import './globals'

import Root from '@views/root'

AppRegistry.registerComponent('record', () => Root)
