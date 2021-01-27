/**
 * Base webpack config used across other specific configs
 */

import path from 'path'
import webpack from 'webpack'
import nib from 'nib'
import { dependencies as externals } from '../app/package.json'

export default {
  externals: [...Object.keys(externals || {}), 'vertx', 'electron', 'mssql', 'mssql/lib/base', 'mssql/package.json', 'mysql', 'mysql2', 'oracledb', 'pg', 'pg-query-stream', 'tedious'],

  module: {
    rules: [
      {
        test: /\.m?js$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
          }
        }
      }, {
        test: /\.css$/,

        use: [{
	      loader: 'style-loader'
        }, {
	      loader: 'css-loader'
        }]
      }, {
        test: /\.styl$/,
        use: [{
	      loader: 'style-loader'
        }, {
	      loader: 'css-loader',
          options: {
            importLoaders: 1
          }
        }, {
	      loader: 'stylus-loader',
	      options: {
            stylusOptions: {
	          use: [nib()],
	          import: [
	            'nib',
	            path.resolve(__dirname, '../app/styles/variables.styl')
	          ],
              includeCSS: true
            }
	      }
        }]
      }, {
        test: /\.(png|jpg)$/,
        type: 'asset'
      }, { // https://github.com/ashtuchkin/iconv-lite/issues/204#issuecomment-432048618
        test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
        resolve: {
          aliasFields: ['main']
        }
      }
    ]
  },

  optimization: {
    moduleIds: 'named'
  },

  output: {
    path: path.join(__dirname, '..', 'app'),
    // https://github.com/webpack/webpack/issues/1114
    libraryTarget: 'commonjs2'
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    mainFields: ['main', 'module'],
    extensions: ['.js', '.json'],
    modules: [path.join(__dirname, '..', 'app'), 'node_modules']
  },

  plugins: [
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production'
    })
  ]
}
