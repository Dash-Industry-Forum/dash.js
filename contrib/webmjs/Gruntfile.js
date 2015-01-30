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
    watch: {},
    jshint: {
      all: ["../../src/**/*.js","!../../src/lib/*.js", "./app/js/webm/*.js"],
      options: {
        jshintrc: "../../build/.jshintrc"
      }
    },
    uglify : {
      min : {
        files: {
          "dash.webm.min.js" : [
            "../../src/streaming/MediaPlayer.js",
            "../../src/streaming/Context.js",
            "../../src/dash/Dash.js",
            "../../src/dash/DashContext.js",
            "app/js/webm/Webm.js",
            "app/js/webm/WebmContext.js",
            "app/js/webm/WebmURLExtensions.js",
            "../../src/**/*.js"]
        }
      },
      all : {
        files: {
          "dash.webm.all.js" : [
            "../../src/lib/xml2json.js",
            "../../src/lib/objectiron.js",
            "../../src/lib/dijon.js",
            "../../src/lib/Math.js",
            "../../src/lib/long.js",
            "../../src/lib/base64.js",
            "../../src/streaming/MediaPlayer.js",
            "../../src/streaming/Context.js",
            "../../src/dash/Dash.js",
            "../../src/dash/DashContext.js",
            "app/js/webm/Webm.js",
            "app/js/webm/WebmContext.js",
            "app/js/webm/WebmURLExtensions.js",
            "../../src/**/*.js"
		  ]
        }
      },
      debug: {
        options: {
          beautify: true,
          compress: false,
          mangle: false
        },
        files: {
            "dash.webm.debug.js" : [
              "../../src/lib/xml2json.js",
              "../../src/lib/objectiron.js",
              "../../src/lib/dijon.js",
              "../../src/lib/Math.js",
              "../../src/lib/long.js",
              "../../src/lib/base64.js",
              "../../src/streaming/MediaPlayer.js",
              "../../src/streaming/Context.js",
              "../../src/dash/Dash.js",
              "../../src/dash/DashContext.js",
              "app/js/webm/Webm.js",
              "app/js/webm/WebmContext.js",
              "app/js/webm/WebmURLExtensions.js",
              "../../src/**/*.js"
  		  ]
        }
      }
    },
    jasmine: {
      tests: {
        src: [
            "../../src/streaming/MediaPlayer.js",
            "../../src/streaming/Context.js",
            "../../src/dash/Dash.js",
            "../../src/dash/DashContext.js",
            "app/js/webm/Webm.js",
            "app/js/webm/WebmContext.js",
            "app/js/webm/WebmURLExtensions.js",
            "../../src/**/*.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          keepRunner: true,
          helpers: [
            "./app/js/Main.js"],
          specs: [
             './test/js/webm/WebmURLExtensions_Suite.js'
     			],
          vendor: [
                "../../src/lib/dijon.js"
            ],
          template : require('grunt-template-jasmine-istanbul'),
          templateOptions: {
            coverage: 'reports/coverage.json',
            report: 'reports/coverage'},
          junit: {
              path: grunt.option('jsunit-path'),
              consolidate: true}
        }
      }
    }
  });

  // Require needed grunt-modules
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');


  // Define tasks
  grunt.registerTask('default', ['jshint','connect:default_options','jasmine','uglify']);
};
