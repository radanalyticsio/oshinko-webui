'use strict';

var module = angular.module('Oshinko.filters', []);

module.filter('interpolate', ['version', function (version) {
    return function (text) {
        return String(text).replace(/\%VERSION\%/mg, version);
    }
}]);
