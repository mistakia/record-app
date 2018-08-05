import nodejs from 'nodejs-mobile-react-native'

const handleResponse = (action, resolve, reject) => {
  const listener = (message) => {
    const msg = JSON.parse(message)
    if (msg.action === action) {
      nodejs.channel.removeListener('message', listener)

      if (msg.error) {
        return reject(msg.error)
      }
      resolve(msg.data)
    }
  }
  nodejs.channel.addListener('message', listener, this)
}

export const api = {
  fetchContacts (logId) {
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'contacts:get',
        data: { logId }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  },
  fetchInfo () {
    return new Promise((resolve, reject) => {
      const msg = { action: 'info:get' }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  },
  fetchTags (logId) {
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'tags:get',
        data: { logId }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  },
  postTag (logId, data) {
    return new Promise((resolve, reject) => {
      const { track, tag } = data
      const msg = {
        action: 'tags:add',
        data: { track, tag }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  },
  deleteTag (logId, data) {
    return new Promise((resolve, reject) => {
      const { trackId, tag } = data
      const msg = {
        action: 'tags:delete',
        data: { trackId, tag }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  },
  fetchTracks (logId, params) {
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'tracks:get',
        data: { logId, params }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
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
      handleResponse(msg.action, resolve, reject)
    })
  },
  postTrack (logId, data) {
    const { title, url } = data
    return new Promise((resolve, reject) => {
      const msg = {
        action: 'tracks:add',
        data: { logId, title, url }
      }
      nodejs.channel.send(JSON.stringify(msg))
      handleResponse(msg.action, resolve, reject)
    })
  }
}
