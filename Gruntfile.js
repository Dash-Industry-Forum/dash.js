module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      default_options: {}
    },
    watch: {},
    jshint: {
      all: ["app/js/*/**/*.js"],
      options: {
        jshintrc: ".jshintrc"
      }
    },
    uglify : {
      dist : {
        files: {
          "dash.min.js" : [
            "app/js/streaming/MediaPlayer.js",
            "app/js/streaming/Context.js",
            "app/js/dash/Dash.js",
            "app/js/dash/DashContext.js",
            "app/js/*/**/*.js"],
        }
      }
    },
    jasmine: {
      tests: {
        src: [
            "app/js/streaming/MediaPlayer.js",
            "app/js/streaming/Context.js",
            "app/js/dash/Dash.js",
            "app/js/dash/DashContext.js",
            "app/js/*/**/*.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          specs: [
            'test/js/dash/ParserSuite.js',
            'test/js/dash/FragmentExtensionsSuite.js',
            'test/js/dash/DashMetricsExtensionsSuite.js',
            'test/js/dash/DashManifestExtensionsSuite.js'],
          vendor: [
            "app/lib/jquery/js/jquery-1.8.3.min.js",
            "app/lib/jquery/js/jquery-ui-1.9.2.custom.min.js",
            "app/lib/q.min.js",
            "app/lib/xml2json.js",
            "app/lib/objectiron.js",
            "app/lib/dijon.js",
            "test/js/utils/MPDfiles.js"],
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
  grunt.registerTask('default', ['uglify', 'connect', 'jasmine', 'jshint']);
};