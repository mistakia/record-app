/*
 * Webpack development server configuration
 */

'use strict';
const path = require('path')
const { spawn } = require('child_process')
const nib = require('nib')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  output: {
    filename: 'app.js',
    publicPath: '/assets/'
  },
  cache: false,
  devtool: false,
  entry: [
    '@babel/polyfill',
    './src/index.js'
  ],
  stats: {
    colors: true,
    reasons: true
  },
  plugins: [
    new webpack.DefinePlugin({ __DEV__ : true }),
    new webpack.LoaderOptionsPlugin({ debug: true }),
    new webpack.HotModuleReplacementPlugin()
  ],
  target: 'electron-renderer',
  devServer: {
    contentBase: path.resolve(__dirname, '../'),
    compress: true,
    hot: true,
    port: 8000,
    publicPath: '/assets/',
	historyApiFallback: {
	  index: 'index.web.html'
	},
    stats: {
      colors: true,
      chunks: false,
      children: false
    },
    before() {
      spawn(
        'electron',
        ['. --inspect'],
        { shell: true, env: { NODE_ENV: 'development', ...process.env }, stdio: 'inherit' }
      )
        .on('close', code => process.exit(0))
        .on('error', spawnError => console.error(spawnError))
    }
  },
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
