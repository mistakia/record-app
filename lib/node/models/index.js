const fs = require('fs')
const path = require('path')

const models = {}

fs.readdirSync(__dirname).forEach(file => {
  if (file !== 'index.js') {
    const model_name = file.replace('.js','')
    const file_path = path.resolve(__dirname, file)
    models[model_name] = require(file_path)
  }
})

module.exports = models
