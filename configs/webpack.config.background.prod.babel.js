/**
 * Webpack config for production electron main process
 */

import fs from 'fs'
import path from 'path'
import webpack from 'webpack'
import merge from 'webpack-merge'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import baseConfig from './webpack.config.base'
import CheckNodeEnv from '../internals/scripts/CheckNodeEnv'
import DeleteSourceMaps from '../internals/scripts/DeleteSourceMaps'

CheckNodeEnv('production')
DeleteSourceMaps()

export default merge.smart(baseConfig, {
  devtool: 'source-map',

  mode: 'production',

  target: 'node',

  entry: [
    'core-js',
    'regenerator-runtime/runtime',
    './app/background.dev.js'
  ],

  output: {
    path: path.join(__dirname, '..'),
    filename: './app/background.prod.js'
  },

  module: {
    rules: [
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },

  // https://github.com/webpack/webpack/issues/7953
  /* resolve: {
   *   mainFields: ['module', 'main']
   * },
   */

  optimization: {
      minimize: false
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode:
        process.env.OPEN_ANALYZER === 'true' ? 'server' : 'disabled',
      openAnalyzer: process.env.OPEN_ANALYZER === 'true'
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      START_MINIMIZED: false,
      E2E_BUILD: false
    })
  ],

  /**
   * Disables webpack processing of __dirname and __filename.
   * If you run the bundle in node.js it falls back to these values of node.js.
   * https://github.com/webpack/webpack/issues/2010
   */
  node: {
    __dirname: false,
    __filename: false
  }
})
