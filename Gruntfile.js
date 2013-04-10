module.exports = function(grunt) {
  grunt.initConfig({
    connect: {
      server: {
        base: ".",
        port: 8000
      }
    },
    watch: {},
    jshint: {
      all: [
        "app/js/streaming/MediaPlayer.js",
        "app/js/streaming/Context.js",
        "app/js/streaming/Capabilities.js",
        "app/js/streaming/Debug.js",
        "app/js/streaming/VideoModel.js",
        "app/js/streaming/vo/SegmentRequest.js",
        "app/js/streaming/ManifestLoader.js",
        "app/js/streaming/MediaSourceExtensions.js",
        "app/js/streaming/SourceBufferExtensions.js",
        "app/js/streaming/BufferExtensions.js",
        "app/js/streaming/FragmentController.js",
        "app/js/streaming/AbrController.js",
        "app/js/streaming/FragmentLoader.js",
        "app/js/streaming/Stream.js",
        "app/js/streaming/BufferController.js",
        "app/js/streaming/rules/BandwidthRule.js",
        "app/js/streaming/rules/BaseRulesCollection.js",

        "app/js/dash/Dash.js",
        "app/js/dash/DashContext.js",
        "app/js/dash/vo/Segment.js",
        "app/js/dash/DashParser.js",
        "app/js/dash/DashHandler.js",
        "app/js/dash/BaseURLExtensions.js",
        "app/js/dash/DashManifestExtensions.js"],

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
          "app/js/streaming/MediaPlayer.js",
          "app/js/streaming/MetricsList.js",
          "app/js/streaming/Context.js",
          "app/js/streaming/Capabilities.js",
          "app/js/streaming/Debug.js",
          "app/js/streaming/VideoModel.js",
          "app/js/streaming/vo/SegmentRequest.js",
          "app/js/streaming/ManifestLoader.js",
          "app/js/streaming/MediaSourceExtensions.js",
          "app/js/streaming/SourceBufferExtensions.js",
          "app/js/streaming/BufferExtensions.js",
          "app/js/streaming/FragmentController.js",
          "app/js/streaming/AbrController.js",
          "app/js/streaming/FragmentLoader.js",
          "app/js/streaming/Stream.js",
          "app/js/streaming/BufferController.js",
          "app/js/streaming/rules/BandwidthRule.js",
          "app/js/streaming/rules/BaseRulesCollection.js",

          "app/js/dash/Dash.js",
          "app/js/dash/DashContext.js",
          "app/js/dash/vo/Segment.js",
          "app/js/dash/DashParser.js",
          "app/js/dash/DashHandler.js",
          "app/js/dash/BaseURLExtensions.js",
          "app/js/dash/FragmentExtensions.js",
          "app/js/dash/DashManifestExtensions.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          specs: [
            './test/js/dash/DashParserSuite.js',
            './test/js/streaming/MediaPlayerSuite.js',
            './test/js/streaming/SourceBufferExtensionsSuite.js'],
          helpers: './test/js/helper/matchers.js',
          vendor: [
            "app/lib/xml2json.js",
            "app/lib/objectiron.js",
            "app/lib/q.js",
            "app/lib/dijon.js",
          ],
          junit: {
              path: grunt.option('jsunit-path'),
              consolidate: true
          }
        }
      }
    },
	istanbul: {
      tests: {
        src: [
          "app/js/streaming/MediaPlayer.js",
          "app/js/streaming/MetricsList.js",
          "app/js/streaming/Context.js",
          "app/js/streaming/Capabilities.js",
          "app/js/streaming/Debug.js",
          "app/js/streaming/VideoModel.js",
          "app/js/streaming/vo/SegmentRequest.js",
          "app/js/streaming/ManifestLoader.js",
          "app/js/streaming/MediaSourceExtensions.js",
          "app/js/streaming/SourceBufferExtensions.js",
          "app/js/streaming/BufferExtensions.js",
          "app/js/streaming/FragmentController.js",
          "app/js/streaming/AbrController.js",
          "app/js/streaming/FragmentLoader.js",
          "app/js/streaming/Stream.js",
          "app/js/streaming/BufferController.js",
          "app/js/streaming/rules/BandwidthRule.js",
          "app/js/streaming/rules/BaseRulesCollection.js",

          "app/js/dash/Dash.js",
          "app/js/dash/DashContext.js",
          "app/js/dash/vo/Segment.js",
          "app/js/dash/DashParser.js",
          "app/js/dash/DashHandler.js",
          "app/js/dash/BaseURLExtensions.js",
          "app/js/dash/FragmentExtensions.js",
          "app/js/dash/DashManifestExtensions.js"],

        options: {
          host: 'http://127.0.0.1:8000/',
          specs: [
            './test/js/dash/DashParserSuite.js',
            './test/js/streaming/MediaPlayerSuite.js',
            './test/js/streaming/SourceBufferExtensionsSuite.js'],
          helpers: './test/js/helper/matchers.js',
          vendor: [
            "app/lib/xml2json.js",
            "app/lib/objectiron.js",
            "app/lib/q.js",
            "app/lib/dijon.js",
          ],
          junit: {
              path: grunt.option('jsunit-path'),
              consolidate: true
          }
        }
      }
    }
  });

  // Require needed grunt-modules
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-istanbul');

  // Define tasks
  grunt.registerTask('default', ['connect','jasmine','jshint','istanbul']);
};