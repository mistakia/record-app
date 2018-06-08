import nodejs from 'nodejs-mobile-react-native'

export const api = {
  fetchContacts (logId) {
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'contacts:get',
        data: { logId }
      }
      nodejs.channel.send(JSON.stringify(msg))

      const listener = (message) => {
        const msg = JSON.parse(message)
        if (msg.action === 'contacts:get') {
          resolve(msg.data)
          nodejs.channel.removeListener('message', listener)
        }
      }
      nodejs.channel.addListener('message', listener, this)
    })
  },
  fetchInfo () {
    return new Promise((resolve, reject) => {
      const msg = { action: 'info:get' }
      nodejs.channel.send(JSON.stringify(msg))

      const listener = (message) => {
        const msg = JSON.parse(message)
        console.log(msg)
        if (msg.action === 'info:get') {
          resolve(msg.data)
          nodejs.channel.removeListener('message', listener)
        }
      }
      nodejs.channel.addListener('message', listener, this)
    })
  },
  fetchTracks (logId) {
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'tracks:get',
        data: { logId }
      }
      console.log(msg)
      nodejs.channel.send(JSON.stringify(msg))
      console.log('here tracks')

      const listener = (message) => {
        const msg = JSON.parse(message)
        console.log(msg)
        if (msg.action === 'tracks:get') {
          resolve(msg.data)
          nodejs.channel.removeListener('message', listener)
        }
      }
      nodejs.channel.addListener('message', listener, this)
    })
  },
  postContact (logId, data) {
    const { address, alias } = data
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'contacts:add',
        data: { logId, address, alias }
      }
      nodejs.channel.send(JSON.stringify(msg))

      const listener = (message) => {
        const msg = JSON.parse(message)
        if (msg.action === 'contacts:add') {
          resolve(msg.data)
          nodejs.channel.removeListener('message', listener)
        }
      }
      nodejs.channel.addListener('message', listener, this)
    })
  }
}
