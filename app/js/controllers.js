'use strict';

var module = angular.module('Oshinko.controllers', ['ngAnimate', 'ui.bootstrap', 'patternfly.notification']);

module.controller('ClusterCtrl', function($scope, $interval, clusterDataFactory, sendNotifications) {
    $scope.predicate = 'name';
    $scope.reverse = false;

    $scope.order = function(predicate) {
        $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
        $scope.predicate = predicate;
    };

    $scope.reloadClusters = function() {
        clusterDataFactory.getClusters()
            .then(function(response) {
                $scope.details = response.data.clusters;
            }, function(error) {
                sendNotifications.notify("Error", "Unable to fetch data");
            });
    };

    var intervalPromise;
    var REFRESH_SECONDS = 10;
    intervalPromise = $interval(function() {
        $scope.reloadClusters();
    }.bind(this), REFRESH_SECONDS * 1000);

    // no update when this page isn't displayed
    $scope.$on('$destroy', function() {
        if (intervalPromise)
            $interval.cancel(intervalPromise);
    });

    $scope.reloadClusters();
});

module.controller('NavCtrl', function($rootScope, $scope, $location, OshinkoAuthService) {
    $scope.isActive = function(route) {
        $scope.path = $location.path();
        return $location.path() === route;
    };
    $scope.logout = function() {
        OshinkoAuthService.ClearCredentials();
        $location.path('/login');
    };
});

module.controller('ClusterDetailCtrl', function($scope, $interval, $route, clusterDataFactory) {
    $scope.cluster_details = {};
    $scope.cluster_id = $route.current.params.Id;
    $scope.reloadDetails = function() {
        clusterDataFactory.getCluster($scope.cluster_id)
            .then(function(response) {
                $scope.cluster_details = response.data.cluster;
            }, function(error) {
                sendNotifications.notify("Error", "Unable to fetch cluster details");
            });
    };

    var intervalPromise;
    var REFRESH_SECONDS = 10;
    intervalPromise = $interval(function() {
        $scope.reloadDetails();
    }.bind(this), REFRESH_SECONDS * 1000);

    // no update when this page isn't displayed
    $scope.$on('$destroy', function() {
        if (intervalPromise)
            $interval.cancel(intervalPromise);
    });

    $scope.reloadDetails();
});

module.controller('ModalCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.cluster = {
        "name": $scope.entry.name,
        "workerCount": $scope.entry.workerCount
    };
    $scope.open = function(size, template, ctrl) {

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/forms/' + template,
            controller: ctrl,
            size: size,
            resolve: {
                cluster: function() {
                    return $scope.cluster;
                }
            }
        });
    };
});

module.controller('DetailsModalCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.open = function(size, template, ctrl) {

        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/forms/' + template,
            controller: ctrl,
            size: size,
            resolve: {
                cluster: function() {
                    return {
                        "name": $scope.cluster_details.name,
                        "workerCount": $scope.cluster_details.workerCount
                    }
                }
            }
        });
    };
});

module.controller('NewClusterCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.openNewCluster = function() {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/forms/newform.html',
            controller: 'NewModalInstanceCtrl',
            size: 'lg',
            resolve: {
                cluster: function() {
                    return $scope.cluster;
                }
            }
        });
    };
});

module.controller('StopModalInstanceCtrl', function($scope, $uibModalInstance, cluster, clusterDataFactory, sendNotifications) {
    $scope.cluster_name = cluster.name;
    $scope.cluster = cluster;

    $scope.ok = function() {
        clusterDataFactory.deleteCluster($scope.cluster_name).then(function(response) {
          sendNotifications.notify("Success", "Cluster " + $scope.cluster_name + " deleted");
        }, function(error) {
          sendNotifications.notify("Error", "Unable to delete cluster: " + $scope.cluster_name);
        });
        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('ScaleModalInstanceCtrl', function($scope, $uibModalInstance, clusterDataFactory, cluster, sendNotifications) {

    $scope.cluster_name = cluster.name;
    $scope.workerCount = cluster.workerCount;
    $scope.cluster = cluster;

    $scope.ok = function() {
        clusterDataFactory.updateCluster($scope.cluster_name, $scope.cluster_name, $scope.workerCount).then(function(response) {
          sendNotifications.notify("Success", "Cluster scaling initiated for: " + $scope.cluster_name);
        }, function(error) {
          sendNotifications.notify("Error", "Unable to scale cluster " + $scope.cluster_name);
        });
        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('NewModalInstanceCtrl', function($scope, $uibModalInstance, clusterDataFactory, sendNotifications) {
    $scope.clusterName = "";
    $scope.workerCount = 1;

    $scope.ok = function() {
        $uibModalInstance.close($scope.cluster);
        clusterDataFactory.createCluster($scope.clusterName, $scope.workerCount).then(function(response) {
          sendNotifications.notify("Success", "New cluster " + $scope.clusterName + " started");
        }, function(error) {
          sendNotifications.notify("Error", "Unable to start new cluster");
        });
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});


module.controller('LoginController', ['$scope', '$rootScope', '$location', 'OshinkoAuthService',
    function($scope, $rootScope, $location, OshinkoAuthService) {
        $scope.username = '';
        $scope.password = '';
        OshinkoAuthService.ClearCredentials();
        $scope.login = function() {
            $scope.dataLoading = true;
            OshinkoAuthService.Login($scope.username, $scope.password, function(response) {
                OshinkoAuthService.ClearCredentials();
                if (response.success) {
                    OshinkoAuthService.SetCredentials($scope.username, $scope.password);
                    $location.path('/clusters');
                } else {
                    $scope.error = response.message;
                    $scope.dataLoading = false;
                }
            });
        };
    }
]);
