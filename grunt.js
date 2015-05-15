module.exports = function(grunt) {
  require('time-grunt')(grunt);

//  let pkg = grunt.file.readJSON('package.json');

//  let version.majorMinor = '${version.major}.${version.minor}';
// let grunt.vjsVersion = version;

  // Project configuration.
  grunt.initConfig({
    clean: {
      build: ['build/temp'],
      dist: ['dist/*']
    },
    jshint: {
      src: {
        src: ['src/**/*.js', 'Gruntfile.js'],
        options: {
          "esnext": true
        //  jshintrc: '.jshintrc'
        }
      }
    },
   concat: {
      all: {
        options: {
          separator: '\n',
        },
        src: ['src/lib/*.js', 'build/temp/Dash.js'],
        dest: 'build/temp/Dash.all.js',
      },
    },
    uglify: {
      options: {
        sourceMap: true,
        sourceMapIn: 'build/temp/Dash.js.map',
        sourceMapRoot: '../../src',
        preserveComments: 'some',
        mangle: true,
        compress: {
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          unused: true,
          if_return: true,
          join_vars: true,
          drop_console: true
        }
      },
      build: {
        files: {
          'build/temp/Dash.min.js': 'build/temp/Dash.js',
          'build/temp/Dash.all.min.js': 'build/temp/Dash.all.js'
        }
      }
    },
    watch: {
      default: {
        files: ['src/**/*', 'Gruntfile.js'],
        tasks: 'dev'
      }
    },
    copy: {
      dist: { expand: true, cwd: 'build/temp/', src: ['**/**'], dest: 'dist/', filter: 'isFile' }
    },
    exorcise: {
      build: {
        options: {},
        files: {
          'build/temp/Dash.js.map': ['build/temp/Dash.js'],
          'build/temp/Dash.all.js.map': ['build/temp/Dash.all.js'],
        }
      }
    },
    browserify: {
      build: {
        files: {
          'build/temp/Dash.js': ['src/Dash.js']
        },
        options: {
          browserifyOptions: {
            debug: true,
            standalone: 'dash'
          },
          plugin: [
            [ 'browserify-derequire' ]
          ],
          transform: [
            require('babelify').configure({
              sourceMapRelative: './src/'
            })
          ]
        }
      },
      watch: {
        files: {
          'build/temp/Dash.js': ['src/js/Dash.js']
        },
        options: {
          watch: true,
          keepAlive: true,
          browserifyOptions: {
            standalone: 'dash'
          },
          transform: ['babelify'],
          plugin: [
            [ 'browserify-derequire' ]
          ]
        }
      }
    }
  });

  // load all the npm grunt tasks
  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('videojs-doc-generator');
  grunt.loadNpmTasks('chg');

  grunt.registerTask('build', [
    'clean:build',
    //'jshint',
    'browserify:build',
    'concat:all',
 //   'exorcise',
 //   'uglify'
  ]);

  grunt.registerTask('dist', [
    'clean:dist',
    'build',
    'copy:dist'
  ]);

  // Default task.
  grunt.registerTask('default', ['dist']);
};
