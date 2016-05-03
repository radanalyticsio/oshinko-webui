'use strict';


// Declare app level module which depends on filters, and services
angular.module('Oshinko', [
  'ngRoute',
  'Oshinko.filters',
  'Oshinko.services',
  'Oshinko.directives',
  'Oshinko.controllers'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/clusters/:Id',
      {templateUrl: 'partials/cluster-detail.html',
       controller: 'ClusterDetailCtrl',
       activetab: 'clusters'});
  $routeProvider.when('/clusters',
      {templateUrl: 'partials/clusters.html',
       controller: 'ClusterCtrl',
       activetab: 'clusters'});
  $routeProvider.when('/about',
      {templateUrl: 'partials/about.html',
       controller: 'AboutCtrl',
       activetab: 'about'});
  $routeProvider.otherwise({redirectTo: '/clusters'});
}]);
