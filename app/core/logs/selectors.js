export function getLogs (state) {
  return state.get('logs')
}

export function getAllLogs (state) {
  const logs = getLogs(state)
  return logs.map(v => v).toList()
}

export function getLogByAddress (state, address) {
  return getLogs(state).get(address)
}

export function getMyLog (state) {
  const address = state.get('app').get('address')
  return getLogByAddress(state, address)
}

export function getAllPeers (state) {
  const logs = getLogs(state)
  const peers = logs.map(v => v.peers).toList().toJS().flat()
  const dedupPeers = Array.from(new Set(peers))
  return dedupPeers
}

export function getReplicationProgress (state) {
  const logs = getLogs(state)
  let result = {
    progress: 0,
    total: 0

  }
  for (const log of logs.values()) {
    const length = log.get('length')
    const max = log.get('max')
    result.progress += length
    result.total += Math.max(max, length)
  }

  return result
}
