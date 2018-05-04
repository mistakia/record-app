#!/bin/bash
      # Helper script for Gradle to call node on macOS in case it is not found
      export PATH=$PATH:/Users/t3rr0r/.nvm/versions/node/v8.9.4/lib/node_modules/npm/node_modules/npm-lifecycle/node-gyp-bin:/Volumes/Projects/record/node_modules/nodejs-mobile-react-native/node_modules/.bin:/Volumes/Projects/record/node_modules/.bin:/Users/t3rr0r/.nvm/versions/node/v8.9.4/bin:/Users/t3rr0r/go/bin:/usr/local/git/bin:/sw/bin/:/usr/local/bin:/usr/local/:/usr/local/sbin:/usr/local/mysql/bin:/Users/t3rr0r/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/X11/bin:/usr/local/bin/:/usr/local/Cellar/android-sdk/24.0.2/tools:/usr/local/Cellar/android-sdk/24.0.2/platform-tools:/Volumes/Projects/quotwit/::/usr/local/opt/go/libexec/bin
      node $@
    