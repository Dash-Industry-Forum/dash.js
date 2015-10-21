module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      default_options: {},
      dev: {
        options: {
          port: 9999,
          keepalive: true
        }
      }
    },
    watch: {
      scripts: {
        files: ["./src/dash/**/*.js", 
			      "./src/streaming/**/*.js"],
        tasks: ['babel','uglify'],
        options: {
          interrupt: true,
          reload: true
        },
      },
    },
    jshint: {
      all: ["./src/dash/**/*.js", 
			      "./src/streaming/**/*.js"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify: {
      // TODO uncomment this after refactor is done
      // min: {
      //   files: {
      //     "dist/dash.min.js": [
      //       "./src/streaming/MediaPlayer.js",
      //       "./src/streaming/Context.js",
      //       "./src/dash/Dash.js",
      //       "./src/dash/DashContext.js",
      //       "./src/dash/**/*.js",
      //       "./src/streaming/**/*.js"
      //     ]
      //   }
      // },
      // all: {
      //   files: {
      //     "dist/dash.all.js": [
      //       "./externals/*.js",            
      //       "./src/streaming/MediaPlayer.js",
      //       "./src/streaming/Context.js",
      //       "./src/dash/Dash.js",
      //       "./src/dash/DashContext.js",
      //       "./src/dash/**/*.js",
      //       "./src/streaming/**/*.js"
      //     ]
      //   }
      // },
      debug: {
        options: {
          beautify: true,
          compress: false,
          mangle: false
        },
        files: {
          // TODO path to src should be updated after refactor is done
          "dist/dash.debug.js": [            
			      "./externals/*.js",
            "./dist/src/streaming/MediaPlayer.js",
            "./dist/src/streaming/Context.js",
            "./dist/src/dash/Dash.js",
            "./dist/src/dash/DashContext.js",
            "./dist/src/dash/**/*.js",
            "./dist/src/streaming/**/*.js"
          ]
        }
      }
    },
    jasmine: {
        tests: {        
          src: [
              "./src/streaming/MediaPlayer.js",
              "./src/streaming/Context.js",
              "./src/dash/Dash.js",
              "./src/dash/DashContext.js",
              "./src/dash/**/*.js",
              "./src/streaming/**/*.js"
          ],
        options: {
          host: 'http://127.0.0.1:8000',
          outfile: "./test/_SpecRunner.html",
          keepRunner: true,
          helpers: [
            "./test/js/utils/Helpers.js",
            "./test/js/utils/SpecHelper.js",
            "./test/js/utils/ObjectsHelper.js",
            "./test/js/utils/MPDHelper.js",
            "./test/js/utils/VOHelper.js"
          ],
          specs: [
            './test/js/dash/TimelineConverterSpec.js',
            './test/js/dash/DashHandlerSpec.js',
            './test/js/dash/RepresentationControllerSpec.js',
            './test/js/streaming/MediaPlayerSpec.js',
            './test/js/streaming/FragmentControllerSpec.js',
            './test/js/streaming/FragmentModelSpec.js',
            './test/js/streaming/AbrControllerSpec.js'
          ],
          vendor: [
            "./externals/*.js"
          ],
          template: require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: './build/reports/coverage.json',
            report: './build/reports/coverage',
            files: './**/*'
          },
          junit: {
            path: grunt.option('jsunit-path'),
            consolidate: true
          }
        }
      }
    },
    jsdoc: {
        dist: {
            options: {
                destination: './docs/jsdocs',
                configure: "./build/jsdoc/jsdoc_conf.json"
            }
        }
    },
    babel: {
      options: {
        sourceMap: "inline",
      },
      dist: {
        files: [{
          expand: true,
          cwd: 'src',
          src: ['**/*.js'],
          dest: 'dist/src',
          ext:'.js'
        }]
      }
    }
  });

  // Require needed grunt-modules
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Define tasks
  grunt.registerTask('default', ['babel', 'uglify', 'watch'/*,'jshint'  , 'connect:default_options','jasmine', 'jsdoc'*/]);
};