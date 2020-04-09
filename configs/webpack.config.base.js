/**
 * Base webpack config used across other specific configs
 */

import path from 'path'
import webpack from 'webpack'
import nib from 'nib'
import { dependencies as externals } from '../app/package.json'

export default {
  externals: [...Object.keys(externals || {}), 'vertx', 'youtube-dl', 'electron'],

  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true
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
	          path.resolve(__dirname, '../app/styles/variables.styl')
	        ]
	      }
        }]
      }, {
        test: /\.(png|jpg)$/,
        loader: 'url-loader',
        options: {
	      limit: 8192
        }
      }, { // https://github.com/ashtuchkin/iconv-lite/issues/204#issuecomment-432048618
        test: /node_modules[\/\\](iconv-lite)[\/\\].+/,
        resolve: {
          aliasFields: ['main']
        }
      }
    ]
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
    }),

    new webpack.NamedModulesPlugin()
  ]
}
