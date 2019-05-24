import nodejs from 'nodejs-mobile-react-native'

export const api = {
  fetchContacts: ({ logId }) => ({
    action: 'contacts:get',
    data: { logId }
  }),
  fetchFeed: ({ logId, params }) => ({
    action: 'feed:get',
    data: { params }
  }),
  fetchInfo: () => ({
    action: 'info:get'
  }),
  fetchPeers: () => ({
    action: 'peers:get'
  }),
  fetchProfile: ({ logId }) => ({
    action: 'profile:get',
    data: { logId }
  }),
  fetchSuggestedContacts: () => ({
    action: 'suggested:contacts:get'
  }),
  fetchTags: ({ logId }) => ({
    action: 'tags:get',
    data: { logId }
  }),
  postTag: ({ logId, data }) => {
    const { cid, tag } = data
    return {
      action: 'tags:add',
      data: { cid, tag }
    }
  },
  deleteTag: ({ logId, data }) => {
    const { trackId, tag } = data
    return {
      action: 'tags:delete',
      data: { trackId, tag }
    }
  },
  fetchTrack: ({ logId, params }) => ({
    action: 'tracks:get',
    data: { logId, params }
  }),
  fetchTracks: ({ logId, params }) => ({
    action: 'tracks:get',
    data: { logId, params }
  }),
  postContact: ({ logId, data }) => {
    const { address, alias } = data
    return {
      action: 'contacts:add',
      data: { logId, address, alias }
    }
  },
  deleteContact: ({ logId, data }) => {
    const { contactId } = data
    return {
      action: 'contacts:delete',
      data: { contactId }
    }
  },
  postProfile: ({ data }) => ({
    action: 'profile:set',
    data
  }),
  postTrack: ({ logId, data }) => {
    const { title, url } = data
    return {
      action: 'tracks:add',
      data: { logId, title, url }
    }
  }
}

export const apiRequest = (apiFunction, opts) => {
  let listener

  const msg = apiFunction(opts)

  const abort = () => {
    nodejs.channel.removeListener('message', listener)
  }

  const request = () => {
    return new Promise((resolve, reject) => {
      listener = (response) => {
        const res = JSON.parse(response)
        if (res.action === msg.action) {
          nodejs.channel.removeListener('message', listener)

          if (res.error) {
            return reject(res.error)
          }
          resolve(res.data)
        }
      }
      nodejs.channel.addListener('message', listener)
      nodejs.channel.send(JSON.stringify(msg))
    })
  }

  return { abort, request }
}
