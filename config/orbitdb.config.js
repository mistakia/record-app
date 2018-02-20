module.exports = {
  // If database doesn't exist, create it
  create: true,
  // Don't wait to load from the network
  sync: false,
  // Load only the local version of the database
  localOnly: false,
  // Allow anyone to write to the database,
  // otherwise only the creator of the database can write
  admin: ['*'],
  write: ['*']
}
