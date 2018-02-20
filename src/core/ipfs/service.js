import IPFS from 'ipfs'
import ipfsConfig from '@config/ipfs.config'

export const ipfs = {
  init() {
    const self = this
    return new Promise((resolve, reject) => {
      self._ipfs = new IPFS(ipfsConfig)

      self._ipfs.on('ready', () => {
	self._ipfs.id((err, res) => {
	  if (err) return reject(err)
	  resolve(res)
	})
      })
    })
  }
}
