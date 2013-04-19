module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      default_options: {}
    },
    watch: {},
    jshint: {
      all: [
        "dash.js/app/js/*/**/*.js"],

      options: {
        browser: true,
        devel: true, // this should be temporary
        jquery: true,
        globals: {
          dijon: true,
          Q: true,
          X2JS: true,
          ObjectIron: true
        }
      }
    },
    jasmine: {
      tests: {
        src: [
            "dash.js/app/js/streaming/MediaPlayer.js",
            "dash.js/app/js/streaming/Context.js",
            "dash.js/app/js/dash/Dash.js",
            "dash.js/app/js/dash/DashContext.js",
            "dash.js/app/js/*/**/*.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          specs: [
            './test/js/dash/ParserSuite.js',
            './test/js/dash/FragmentExtensionsSuite.js',
            './test/js/dash/DashMetricsExtensionsSuite.js',
            './test/js/dash/DashManifestExtensionsSuite.js'],
          vendor: [
            "dash.js/app/lib/jquery/js/jquery-1.8.3.min.js",
            "dash.js/app/lib/jquery/js/jquery-ui-1.9.2.custom.min.js",
            "dash.js/app/lib/q.min.js",
            "dash.js/app/lib/xml2json.js",
            "dash.js/app/lib/objectiron.js",
            "dash.js/app/lib/dijon.js"],
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

  // Define tasks
  grunt.registerTask('default', ['connect','jshint','jasmine']);
};