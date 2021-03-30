const { createLogger, format, transports } = require('winston')
const { join } = require('path')

let electron
try {
  // eslint-disable-next-line global-require
  electron = require('electron')
} catch (e) {
  electron = null
}

const app = electron ? (electron.app || electron.remote.app) : null

const { combine, splat, timestamp, printf, errors, ms, colorize } = format
const logsPath = app ? app.getPath('logs') : null

const errorPath = join(logsPath, 'error.log')
const errorFile = new transports.File({
  level: 'error',
  filename: errorPath,
  format: errors({ stack: true })
})

errorFile.on('finish', () => {
  process.exit(1)
})

const logger = createLogger({
  transports: [
    new transports.Console({
      level: 'debug',
      silent: process.env.NODE_ENV === 'production',
      format: combine(
        colorize(),
        timestamp(),
        splat(),
        ms(),
        printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.ms}`)
      )
    }),
    errorFile,
    new transports.File({
      level: 'debug',
      maxsize: 20000000,
      maxFiles: 4,
      filename: join(logsPath, 'combined.log'),
      format: combine(
        timestamp(),
        splat(),
        ms(),
        printf(info => `${info.timestamp} ${info.level}: ${info.message} ${info.ms}`)
      )
    })
  ],
  exceptionHandlers: [
    new transports.File({ filename: errorPath, format: errors({ stack: true }) })
  ],
  rejectionHandlers: [
    new transports.File({ filename: errorPath, format: errors({ stack: true }) })
  ]
})

logger.info(`[app] logs: ${logsPath}`)

module.exports = logger
