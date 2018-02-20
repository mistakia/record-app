const config = require('./config/project.config')
const OrbitDB = require('orbit-db')
const IPFS = require('ipfs')

// Create IPFS instance
const ipfs = new IPFS(config.ipfsConfig)

ipfs.on('error', (e) => console.error(e))
ipfs.on('ready', async () => {
  console.log(await ipfs.id())
  // Create a database
  const orbitdb = new OrbitDB(ipfs)
  const db = await orbitdb.log('record/log', config.dbConfig)
  // Add an entry to the database
  const hash = await db.add('hello world')
  // Get last 5 entries
  await db.load()
  const latest = db.iterator({ limit: 5 }).collect()
  console.log(JSON.stringify(latest, null, 2))
  console.log(JSON.stringify(db.address.toString(), null, 2))
})
