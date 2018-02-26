import OrbitDB from 'orbit-db'
import PeerId from 'peer-id'
import { ec as EC } from 'elliptic'

import { ipfs } from '@core/ipfs'

export let orbitdb = null

const ec = new EC('secp256k1')

export function init({peerId, privateKey}) {
  return new Promise((resolve, reject) => {

    if (peerId) {
      orbitdb = new OrbitDB(ipfs, './orbitdb', { peerId })
      return resolve(orbitdb.id)
    }

    PeerId.create((err, peer) => {
      if (err)
	return reject(err)

      const p = peer.toJSON()
      const peerId = p.id
      const key = ec.keyFromPrivate(privateKey || p.privKey)

      localStorage.setItem(peerId, JSON.stringify({
	publicKey: key.getPublic('hex'),
	privateKey: key.getPrivate('hex')
      }))

      localStorage.setItem('peerId', peerId)

      orbitdb = new OrbitDB(ipfs, './orbitdb', { peerId })
      resolve(orbitdb.id)
    })
  })
}
