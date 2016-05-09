'use strict';

var module = angular.module('Oshinko.controllers', ['ngAnimate','ui.bootstrap']);

module.controller('ClusterCtrl', function($scope, $interval, clusterDataFactory) {
      $scope.predicate = 'name';
      $scope.reverse = false;

      $scope.order = function(predicate) {
        $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
        $scope.predicate = predicate;
      };

      $scope.reloadClick = function() {
        clusterDataFactory.getClusters()
            .then(function(response) {
              $scope.details = response.data;
            }, function(error) {
              console.log("Unable to fetch data");
            });
      };

      $interval(function() {
        $scope.reloadClick();
      }.bind(this), 10000);
      $scope.reloadClick();
  });

module.controller('AboutCtrl', ['$scope', '$route', function($scope, $route) {

  }]);

module.controller('NavCtrl', function($scope, $location) {
    $scope.isActive = function(route) {
      $scope.path = $location.path();
      return $location.path() === route;
    };
  });

module.controller('ClusterDetailCtrl', function($scope, $route, $interval, clusterDataFactory) {
    $scope.cluster_id = $route.current.params.Id;
    $scope.reloadDetails = function() {
      clusterDataFactory.getCluster($scope.cluster_id)
          .then(function(response) {
            $scope.cluster_details = response.data[Math.floor(Math.random() * response.data.length)];
          }, function(error) {
            console.log("Unable to fetch data");
          });
      };

      // $interval(function() {
      //   $scope.reloadDetails();
      // }.bind(this), 5000);
      $scope.reloadDetails();
});

module.controller('ModalDemoCtrl', function ($scope, $uibModal, $log) {
    $scope.cluster = {
        "id": $scope.entry.id,
        "name": $scope.entry.name,
        "worker_count": $scope.entry.worker_count
    };
    $scope.animationsEnabled = true;
    $scope.open = function (size, template, ctrl) {

        var modalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: '/forms/' + template,
            controller: ctrl,
            size: size,
            resolve: {
                cluster: function () {
                    return $scope.cluster;
                }
            }
        });

        modalInstance.result.then(function (selectedItem) {
            $scope.selected = selectedItem;
        }, function () {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.toggleAnimation = function () {
        $scope.animationsEnabled = !$scope.animationsEnabled;
    };
});

module.controller('StartModalInstanceCtrl', function ($scope, $uibModalInstance, clusterDataFactory, cluster) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;

    $scope.ok = function () {
        alert("Here's where I'd restart cluster: " + $scope.cluster_id);
        $uibModalInstance.close($scope.cluster);
        clusterDataFactory.getCluster($scope.cluster_id);
    };

    $scope.cancel = function () {
        alert("Not gonna do it");
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('StopModalInstanceCtrl', function ($scope, $uibModalInstance, cluster) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;

    $scope.ok = function () {
        alert("Here's where I'd stop cluster: " + $scope.cluster_id);
        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function () {
        alert("Not gonna stop it");
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('ScaleModalInstanceCtrl', function ($scope, $uibModalInstance, clusterDataFactory, cluster) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;
    $scope.worker_count = cluster.worker_count;

    $scope.ok = function () {
        alert("Here's where I'd scale cluster: " + $scope.cluster_id);

        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function () {
        alert("Not gonna scale it");
        $uibModalInstance.dismiss('cancel');
    };
});