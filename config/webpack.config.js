/*
 * Webpack development server configuration
 */

'use strict';
const path = require('path')
const nib = require('nib')
const webpack = require('webpack')
const project = require('./project.config')

module.exports = {
  mode: 'development',
  output: {
    filename: 'main.js',
    publicPath: '/assets/'
  },
  cache: false,
  devtool: false,
  entry: [
    'webpack-dev-server/client?http://localhost:8000',
    '@babel/polyfill',
    './src/index.js'
  ],
  stats: {
    colors: true,
    reasons: true
  },
  plugins: [
    new webpack.DefinePlugin(project.globals),
    new webpack.LoaderOptionsPlugin({ debug: true }),
    new webpack.HotModuleReplacementPlugin()
  ],
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  module: {
    rules: [{
      test: /\.m?js$/,
      exclude: /(node_modules|bower_components)/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    }, {
      test: /\.(styl|css)$/,
      use: [{
	    loader: 'style-loader'
      }, {
	    loader: 'css-loader',
      }, {
	    loader: 'stylus-loader',
	    options: {
	      use: [nib()],
	      import: [
	        '~nib/lib/nib/index.styl',
	        path.resolve(__dirname, '../src/styles/variables.styl')
	      ]
	    }
      }]
    }, {
      test: /\.(png|jpg)$/,
      loader: 'url-loader',
      options: {
	    limit: 8192
      }
    }]
  }
};
