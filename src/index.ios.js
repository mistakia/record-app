import React from 'react' // eslint-disable-line no-unused-vars
import { AppRegistry } from 'react-native'
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch'
import 'whatwg-fetch'

import Root from '@views/root'

AppRegistry.registerComponent('record', () => Root)
