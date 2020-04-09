const path = require('path')

require('@babel/register')({
  extensions: ['.es6', '.es', '.js'],
  cwd: path.join(__dirname, '..', '..')
})
