'use strict';


var module = angular.module('Oshinko.directives', []);
module.directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]);
