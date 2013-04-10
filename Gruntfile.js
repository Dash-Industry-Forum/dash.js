module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      default_options: {}
    },
    watch: {},
    jshint: {
      all: [
        "dash.js/app/js/streaming/MediaPlayer.js",
        "dash.js/app/js/streaming/Context.js",
        "dash.js/app/js/streaming/Capabilities.js",
        "dash.js/app/js/streaming/Debug.js",
        "dash.js/app/js/streaming/VideoModel.js",
        "dash.js/app/js/streaming/vo/SegmentRequest.js",
        "dash.js/app/js/streaming/ManifestLoader.js",
        "dash.js/app/js/streaming/MediaSourceExtensions.js",
        "dash.js/app/js/streaming/SourceBufferExtensions.js",
        "dash.js/app/js/streaming/BufferExtensions.js",
        "dash.js/app/js/streaming/FragmentController.js",
        "dash.js/app/js/streaming/AbrController.js",
        "dash.js/app/js/streaming/FragmentLoader.js",
        "dash.js/app/js/streaming/Stream.js",
        "dash.js/app/js/streaming/BufferController.js",
        "dash.js/app/js/streaming/rules/BandwidthRule.js",
        "dash.js/app/js/streaming/rules/BaseRulesCollection.js",

        "dash.js/app/js/dash/Dash.js",
        "dash.js/app/js/dash/DashContext.js",
        "dash.js/app/js/dash/vo/Segment.js",
        "dash.js/app/js/dash/DashParser.js",
        "dash.js/app/js/dash/DashHandler.js",
        "dash.js/app/js/dash/BaseURLExtensions.js",
        "dash.js/app/js/dash/DashManifestExtensions.js"],

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
      src: [
        "dash.js/app/js/streaming/MediaPlayer.js",
        "dash.js/app/js/streaming/MetricsList.js",
        "dash.js/app/js/streaming/Context.js",
        "dash.js/app/js/streaming/Capabilities.js",
        "dash.js/app/js/streaming/Debug.js",
        "dash.js/app/js/streaming/VideoModel.js",
        "dash.js/app/js/streaming/vo/SegmentRequest.js",
        "dash.js/app/js/streaming/ManifestLoader.js",
        "dash.js/app/js/streaming/MediaSourceExtensions.js",
        "dash.js/app/js/streaming/SourceBufferExtensions.js",
        "dash.js/app/js/streaming/BufferExtensions.js",
        "dash.js/app/js/streaming/FragmentController.js",
        "dash.js/app/js/streaming/AbrController.js",
        "dash.js/app/js/streaming/FragmentLoader.js",
        "dash.js/app/js/streaming/Stream.js",
        "dash.js/app/js/streaming/BufferController.js",
        "dash.js/app/js/streaming/rules/BandwidthRule.js",
        "dash.js/app/js/streaming/rules/BaseRulesCollection.js",

        "dash.js/app/js/dash/Dash.js",
        "dash.js/app/js/dash/DashContext.js",
        "dash.js/app/js/dash/vo/Segment.js",
        "dash.js/app/js/dash/DashParser.js",
        "dash.js/app/js/dash/DashHandler.js",
        "dash.js/app/js/dash/BaseURLExtensions.js",
        "dash.js/app/js/dash/FragmentExtensions.js",
        "dash.js/app/js/dash/DashManifestExtensions.js"],

      options: {
        host: 'http://127.0.0.1:8000/',
        specs: [
          './test/js/dash/HandlerSuite.js',
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
  });

  // Require needed grunt-modules
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Define tasks
  grunt.registerTask('default', ['connect','jshint','jasmine']);
};