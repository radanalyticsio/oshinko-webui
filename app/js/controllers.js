'use strict';

/* Controllers */

angular.module('Oshinko.controllers', []).
  controller('ClusterCtrl', ['$scope', '$route', function($scope, $route) {

  }])
  .controller('AboutCtrl', ['$scope', '$route', function($scope, $route) {

  }])
  .controller('NavCtrl', function($scope, $location) {
    $scope.isActive = function(route) {
      $scope.path = $location.path();
      return $location.path() === route;
    };
  })
  .controller('GetStatusCtrl', function($scope, $http) {
    $scope.click = function() {
      $http.defaults.useXDomain = true;
      $http.get("http://10.16.40.63/index.html")
          .then(function(response) {
            $scope.details = response.data.Clusters;
          });
    };
  })
  .controller('ClusterDetailCtrl', function($scope, $http, $route) {
  // replace with clusters detail call
  $scope.click = function() {
    $http.defaults.useXDomain = true;
    $http.get("http://10.16.40.63/index.html")
        .then(function(response) {
          $scope.details = response.data.Clusters;
        });
  };
});
