import IPFS from 'ipfs-api'

export let ipfs = null

export function init() {
  return new Promise((resolve, reject) => {
    ipfs = new IPFS()

    ipfs.id((err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
}
