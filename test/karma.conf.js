// Karma configuration
// Generated on Tue May 24 2016 13:28:14 GMT-0400 (EDT)

module.exports = function(config) {
  config.set({

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    basePath : '../',

    plugins: [
      'karma-firefox-launcher',
      'karma-jasmine',
      'karma-requirejs'
    ],

    // list of files / patterns to load in the browser
    files: [
      'app/bower_components/jquery/dist/jquery.js',
      'app/bower_components/patternfly/dist/js/patternfly.js',
      'app/bower_components/angular/angular.js',
      'node_modules/requirejs/require.js',
      'node_modules/karma-requirejs/lib/adapter.js',
      'app/bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'app/bower_components/angular-patternfly/dist/angular-patternfly.js',
      'app/bower_components/angular-route/angular-route.js',
      'node_modules/jasmine/lib/jasmine.js',
      'app/bower_components/angular-mocks/angular-mocks.js',
      'app/bower_components/angular-animate/angular-animate.js',
      'app/bower_components/lodash/lodash.js',
      'app/bower_components/js-logger/src/logger.js',
      'app/bower_components/hawtio-core/dist/hawtio-core.js',
      'app/bower_components/hawtio-extension-service/dist/hawtio-extension-service.js',
      'app/bower_components/angular-utf8-base64/angular-utf8-base64.js',
      'app/js/app.js',
      'app/js/clusterops.js',
      'app/js/DataService.js',
      'app/js/dialog.js',
      'app/js/directives.js',
      'app/js/factories.js',
      'app/js/listing.js',
      'test/unit/controllersSpec.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Firefox'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
