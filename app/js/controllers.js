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
                $scope.details = response.data;
                sendNotifications.notify("Success", "Cluster information updated");
            }, function(error) {
                sendNotifications.notify("Error", "Unable to fetch data");
            });
    };

    var intervalPromise;
    intervalPromise = $interval(function() {
        $scope.reloadClusters();
    }.bind(this), 10000);

    // do not continuously update when this page isn't displayed
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

module.controller('ClusterDetailCtrl', function($scope, $route, clusterDataFactory) {
    $scope.cluster_details = {};
    $scope.cluster_id = $route.current.params.Id;
    $scope.reloadDetails = function() {
        clusterDataFactory.getCluster($scope.cluster_id)
            .then(function(response) {
                $scope.cluster_details = response.data[Math.floor(Math.random() * response.data.length)];
            }, function(error) {
                console.log("Unable to fetch data");
            });
    };
    $scope.reloadDetails();
});

module.controller('ModalCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.cluster = {
        "id": $scope.entry.id,
        "name": $scope.entry.name,
        "worker_count": $scope.entry.worker_count
    };
    $scope.animationsEnabled = true;
    $scope.open = function(size, template, ctrl) {

        var modalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: '/forms/' + template,
            controller: ctrl,
            size: size,
            resolve: {
                cluster: function() {
                    return $scope.cluster;
                }
            }
        });

        modalInstance.result.then(function(result) {
            sendNotifications.notify("Success", "Test message");
        }, function() {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.toggleAnimation = function() {
        $scope.animationsEnabled = !$scope.animationsEnabled;
    };
});

module.controller('DetailsModalCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.animationsEnabled = true;
    $scope.open = function(size, template, ctrl) {

        var modalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: '/forms/' + template,
            controller: ctrl,
            size: size,
            resolve: {
                cluster: function() {
                    return {
                        "id": $scope.cluster_details.id,
                        "name": $scope.cluster_details.name,
                        "worker_count": $scope.cluster_details.worker_addresses.length
                    }
                }
            }
        });

        modalInstance.result.then(function(result) {
            sendNotifications.notify("Success", "Test message");
        }, function() {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.toggleAnimation = function() {
        $scope.animationsEnabled = !$scope.animationsEnabled;
    };
});

module.controller('NewClusterCtrl', function($scope, $uibModal, $log, sendNotifications) {
    $scope.animationsEnabled = true;
    $scope.openNewCluster = function() {

        var modalInstance = $uibModal.open({
            animation: $scope.animationsEnabled,
            templateUrl: '/forms/newform.html',
            controller: 'NewModalInstanceCtrl',
            size: 'lg',
            resolve: {
                cluster: function() {
                    return $scope.cluster;
                }
            }
        });

        modalInstance.result.then(function(result) {
            sendNotifications.notify("Success", "Test message");
        }, function() {
            $log.info('Modal dismissed at: ' + new Date());
        });
    };

    $scope.toggleAnimation = function() {
        $scope.animationsEnabled = !$scope.animationsEnabled;
    };
});

module.controller('StartModalInstanceCtrl', function($scope, $uibModalInstance, clusterDataFactory, cluster) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;
    $scope.cluster = cluster;

    $scope.ok = function() {
        $uibModalInstance.close($scope.cluster);
        clusterDataFactory.getCluster($scope.cluster_id);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('StopModalInstanceCtrl', function($scope, $uibModalInstance, cluster, clusterDataFactory) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;
    $scope.cluster = cluster;

    $scope.ok = function() {
        clusterDataFactory.deleteCluster($scope.cluster_id);
        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('ScaleModalInstanceCtrl', function($scope, $uibModalInstance, clusterDataFactory, cluster) {

    $scope.cluster_id = cluster.id;
    $scope.cluster_name = cluster.name;
    $scope.worker_count = cluster.worker_count;
    $scope.cluster = cluster;

    $scope.ok = function() {
        $uibModalInstance.close($scope.cluster);
    };

    $scope.cancel = function() {
        $uibModalInstance.dismiss('cancel');
    };
});

module.controller('NewModalInstanceCtrl', function($scope, $uibModalInstance, clusterDataFactory) {
    $scope.clusterName = "";
    $scope.workerCount = 1;

    $scope.ok = function() {
        $uibModalInstance.close($scope.cluster);
        clusterDataFactory.getCluster($scope.cluster_id);
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
