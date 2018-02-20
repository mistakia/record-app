import { Record } from 'immutable'

export const Track = new Record({
  id: null,
  timestamp: null,
  type: null,
  root: null,
  branch: null,
  channel: null,
  text: null,
  received_timestamp: null
})

export function createTrack(data) {
  return new Track({
    id: data.key,
    timestamp: data.value.timestamp,
    type: data.value.content.type,
    root: data.value.content.root,
    branch: data.value.content.branch,
    channel: data.value.content.channel,
    text: data.value.content.text,
    received_timestamp: data.timestamp
  })
}
