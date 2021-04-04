/**
 * Build config for electron renderer process
 */

import path from 'path'
import webpack from 'webpack'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import OptimizeCSSAssetsPlugin from 'optimize-css-assets-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import nib from 'nib'
import merge from 'webpack-merge'
import TerserPlugin from 'terser-webpack-plugin'
import baseConfig from './webpack.config.base'
import CheckNodeEnv from '../internals/scripts/CheckNodeEnv'
import DeleteSourceMaps from '../internals/scripts/DeleteSourceMaps'

CheckNodeEnv('production')
DeleteSourceMaps()

export default merge.smart(baseConfig, {
  devtool: 'source-map',

  mode: 'production',

  target: 'electron-preload',

  entry: [
    'core-js',
    'regenerator-runtime/runtime',
    path.join(__dirname, '..', 'src/index.js')
  ],

  output: {
    path: path.join(__dirname, '..', 'src/dist'),
    publicPath: './dist/',
    filename: 'renderer.prod.js'
  },

  module: {
    rules: [{
      test: /\.css$/,
      use: [{
	    loader: 'style-loader'
      }, {
	    loader: 'css-loader',
      }]
    }, {
      test: /\.styl$/,
      use: [{
	    loader: 'style-loader'
      }, {
	    loader: 'css-loader',
      }, {
	    loader: 'stylus-loader',
	    options: {
          stylusOptions: {
	        use: [nib()],
	        import: [
	          '~nib/lib/nib/index.styl',
	          path.resolve(__dirname, '../src/styles/variables.styl')
	        ]
          }
	    }
      }]
    }, {
      test: /\.(png|jpg)$/,
      type: 'assets'
    }]
  },

  optimization: {
    minimizer: process.env.E2E_BUILD
      ? []
      : [
        new TerserPlugin({
          parallel: true
        })
      ]
  },

  plugins: [
    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      E2E_BUILD: false
    }),

    /* new MiniCssExtractPlugin({
     *   filename: 'style.css'
     * }),
     */
    new BundleAnalyzerPlugin({
      analyzerMode:
        process.env.OPEN_ANALYZER === 'true' ? 'server' : 'disabled',
      openAnalyzer: process.env.OPEN_ANALYZER === 'true'
    })
  ]
})
