/*
 * Webpack distribution configuration
 *
 * This file is set up for serving the distribution version. It will be compiled to dist/ by default
 */

'use strict';

const webpack = require('webpack')
const project = require('./project.config')

module.exports = {
  output: {
    publicPath: '/assets/',
    path: 'dist/assets/',
    filename: 'main.js'
  },
  devtool: false,
  entry: [
    'whatwg-fetch',
    'babel-polyfill',
    './src/index.js'
  ],
  stats: {
    colors: true,
    reasons: false
  },
  plugins: [
    new webpack.DefinePlugin(project.globals),
    new webpack.optimize.AggressiveMergingPlugin()
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader'
    }, {
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    }, {
      test: /\.sass/,
      loader: 'style-loader!css-loader!sass-loader?outputStyle=expanded&indentedSyntax'
    }, {
      test: /\.(png|jpg)$/,
      loader: 'url-loader?limit=8192'
    }]
  }
}
