'use strict'

var serveStatic = require('serve-static')

var mountFolder = function (dir) {
  return serveStatic(require('path').resolve(dir))
}

var webpackDistConfig = require('./config/webpack.dist.config.js')
var webpackDevConfig = require('./config/webpack.config.js')

module.exports = function (grunt) {
  // Let *load-grunt-tasks* require everything
  require('load-grunt-tasks')(grunt)

  // Read configuration from package.json
  var pkgConfig = grunt.file.readJSON('package.json')

  grunt.initConfig({
    'pkg': pkgConfig,

    'webpack': {
      options: webpackDistConfig,
      dist: {
        cache: false
      }
    },

    'webpack-dev-server': {
      options: {
        hot: true,
        port: 8000,
        webpack: webpackDevConfig,
        publicPath: '/assets/',
        contentBase: './<%= pkg.src %>/',
	historyApiFallback: {
	  index: 'index.web.html'
	}
      },

      start: {

      }
    },

    'connect': {
      options: {
        port: 8000
      },

      dist: {
        options: {
          keepalive: true,
          middleware: function () {
            return [
              mountFolder(pkgConfig.dist)
            ]
          }
        }
      }
    },

    'open': {
      options: {
        delay: 500
      },
      dev: {
        path: 'http://localhost:<%= connect.options.port %>/'
      },
      dist: {
        path: 'http://localhost:<%= connect.options.port %>/'
      }
    },

    'karma': {
      unit: {
        configFile: 'karma.conf.js'
      }
    },

    'copy': {
      dist: {
        files: [
          {
            flatten: true,
            src: ['<%= pkg.src %>/index.web.html'],
            dest: '<%= pkg.dist %>/index.html'
          },
          {
            flatten: true,
            src: ['<%= pkg.src %>/favicon.ico'],
            dest: '<%= pkg.dist %>/favicon.ico'
          }
        ]
      }
    },

    'clean': {
      dist: {
        options: {
          force: true
        },
        files: [{
          dot: true,
          src: [
            '<%= pkg.dist %>'
          ]
        }]
      }
    },

    'exec': {
      launch_electron: 'NODE_ENV=development electron electron.js --inspect',
      launch_electron_dist: 'NODE_ENV=production electron electron.js'
    },

    'concurrent': {
      electron: {
        tasks: ['webpack-dev-server', 'exec:launch_electron'],
        options: {
          logConcurrentOutput: true
        }
      },
      electron_dist: {
	task: ['webpack', 'exec:launch_electron_dist'],
	options: {
	  logConcurrentOutput: true
	}
      }
    }
  })

  grunt.registerTask('serve-web', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'open:dist', 'connect:dist'])
    }

    grunt.task.run([
      'open:dev',
      'webpack-dev-server'
    ])
  })

  grunt.registerTask('serve-electron', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['webpack', 'exec:launch_electron_dist'])
    }

    grunt.task.run([
      'concurrent:electron'
    ])
  })

  grunt.registerTask('test', ['karma'])
  grunt.registerTask('build', ['clean', 'copy', 'webpack'])
  grunt.registerTask('default', [])
}
