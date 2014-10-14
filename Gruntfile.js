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
      all: ["app/js/*/**/*.js"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify : {
      min : {
        files: {
          "dash.min.js" : [
            "app/js/streaming/MediaPlayer.js",
            "app/js/streaming/Context.js",
            "app/js/dash/Dash.js",
            "app/js/dash/DashContext.js",
            "app/lib/xml2json.js",
            "app/lib/objectiron.js",
            "app/lib/dijon.js",
            "app/js/*/**/*.js"]
        }
      },
      all : {
        files: {
          "dash.all.js" : [
            "./app/lib/xml2json.js",
            "./app/lib/objectiron.js",
            "./app/lib/dijon.js",
            "./app/lib/Math.js",
            "./app/lib/long.js",
            "./app/lib/base64.js",
            "./app/js/streaming/MediaPlayer.js",
            "./app/js/streaming/Context.js",
            "./app/js/dash/Dash.js",
            "./app/js/dash/DashContext.js",
            "./app/js/*/**/*.js"]
        }
      }
    },
    jasmine: {
      tests: {
        src: [
            "./app/js/streaming/MediaPlayer.js",
            "./app/js/streaming/Context.js",
            "./app/js/dash/Dash.js",
            "./app/js/dash/DashContext.js",
            "./app/js/*/**/*.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          keepRunner: true,
          helpers: [
            "./test/js/utils/Helpers.js",
            "./test/js/utils/SpecHelper.js",
            "./test/js/utils/ObjectsHelper.js",
            "./test/js/utils/MpdHelper.js",
            "./test/js/utils/VOHelper.js"],
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
			"./app/lib/jquery/jquery-1.10.2.min.js",
            "./app/lib/xml2json.js",
            "./app/lib/objectiron.js",			
            "./app/lib/Math.js",
            "./app/lib/long.js",
            "./app/lib/kendo/kendo.web.min.js", 
			"./app/lib/dijon.js",
            "./app/lib/base64.js"],
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
