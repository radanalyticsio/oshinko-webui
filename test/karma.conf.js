// Karma configuration
// Generated on 2016-05-17

module.exports = function(config) {
  'use strict';

  config.set({
    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // base path, that will be used to resolve files and exclude
    basePath: '../',

    // testing framework to use (jasmine/mocha/qunit/...)
    // as well as any additional frameworks (requirejs/chai/sinon/...)
    frameworks: [
      'jasmine'
    ],

    // list of files / patterns to load in the browser
    files: [
      // bower:js
      'app/bower_components/jquery/dist/jquery.js',
      'app/bower_components/angular/angular.js',
      'app/bower_components/angular-animate/angular-animate.js',
      'app/bower_components/angular-touch/angular-touch.js',
      'app/bower_components/angular-route/angular-route.js',
      'app/bower_components/bootstrap/dist/js/bootstrap.js',
      'app/bower_components/bootstrap-combobox/js/bootstrap-combobox.js',
      'app/bower_components/bootstrap-datepicker/js/bootstrap-datepicker.js',
      'app/bower_components/bootstrap-select/dist/js/bootstrap-select.js',
      'app/bower_components/bootstrap-switch/dist/js/bootstrap-switch.js',
      'app/bower_components/bootstrap-treeview/dist/bootstrap-treeview.min.js',
      'app/bower_components/d3/d3.js',
      'app/bower_components/c3/c3.js',
      'app/bower_components/datatables/media/js/jquery.dataTables.js',
      'app/bower_components/datatables-colreorder/js/dataTables.colReorder.js',
      'app/bower_components/datatables-colvis/js/dataTables.colVis.js',
      'app/bower_components/google-code-prettify/bin/prettify.min.js',
      'app/bower_components/matchHeight/dist/jquery.matchHeight.js',
      'app/bower_components/moment/moment.js',
      'app/bower_components/moment-timezone/builds/moment-timezone-with-data-2010-2020.js',
      'app/bower_components/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min.js',
      'app/bower_components/patternfly/dist/js/patternfly.js',
      'app/bower_components/angular-sanitize/angular-sanitize.js',
      'app/bower_components/angular-bootstrap/ui-bootstrap-tpls.js',
      'app/bower_components/lodash/lodash.js',
      'app/bower_components/angular-patternfly/dist/angular-patternfly.js',
      // endbower
      'app/scripts/**/*.js',
      'test/mock/**/*.js',
      'test/spec/**/*.js'
    ],

    // list of files / patterns to exclude
    exclude: [
    ],

    // web server port
    port: 8080,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: [
      'PhantomJS'
    ],

    // Which plugins to enable
    plugins: [
      'karma-phantomjs-launcher',
      'karma-jasmine'
    ],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: false,

    colors: true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    // Uncomment the following lines if you are using grunt's server to run the tests
    // proxies: {
    //   '/': 'http://localhost:9000/'
    // },
    // URL root prevent conflicts with the site root
    // urlRoot: '_karma_'
  });
};
