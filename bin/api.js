const Logger  = require('logplease')

let logger = Logger.create('record-electron', { color: Logger.Colors.Yellow })

require('../api').listen(8080, () => {
  logger.info('api server is running at http://localhost:8080/')
})
