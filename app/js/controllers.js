/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
'use strict';

var module = angular.module('Oshinko.controllers', [
    'ngAnimate', 
    'ui.bootstrap',
    'patternfly.notification',
    'ui.cockpit',
    'ui.listing',
    'Oshinko.directives',
    ]);

module.controller('ClusterCtrl', [
    '$scope',
    '$interval',
    '$location',
    'clusterDataFactory',
    'sendNotifications',
    'clusterActions',
    "ListingState",
    function($scope, $interval, $location, clusterDataFactory, sendNotifications, clusterActions, ListingState) {
        $scope.predicate = 'name';
        $scope.reverse = false;
        angular.extend($scope, clusterActions);
        $scope.listing = new ListingState($scope);
        $scope.order = function(predicate) {
            $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
            $scope.predicate = predicate;
        };

        $scope.reloadClusters = function() {
            clusterDataFactory.getClusters()
                .then(function(response) {
                    console.log(response);
                    if(response.data.clusters)
                        $scope.details = response.data.clusters;
                    else
                        $scope.details = null;
                }, function(error) {
                    sendNotifications.notify("Error", "Unable to fetch data");
                });
        };

        $scope.gotoCluster = function gotoCluster(clusterName) {
            var path = '/clusters/' + encodeURIComponent(clusterName);
            $location.path(path);
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
    }
]);

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

module.controller('ClusterDeleteCtrl', [
    '$q',
    '$scope',
    "dialogData",
    "clusterData",
    "sendNotifications",
     function($q, $scope, dialogData, clusterData, sendNotifications) {
    
        $scope.clusterName = dialogData.clusterName || "";
        $scope.workerCount = dialogData.workerCount || "";

        $scope.deleteCluster = function deleteCluster() {
            var defer = $q.defer();
            clusterData.sendDeleteCluster($scope.clusterName)
                .then(function(response) {
                    sendNotifications.notify("Success", "Cluster " + $scope.clusterName + " deleted");
                    defer.resolve("Cluster " + $scope.clusterName + " deleted");
                }, function(error) {
                    sendNotifications.notify("Error", "Unable to delete cluster: " + $scope.clusterName);
                    defer.reject("Unable to delete cluster: " + $scope.clusterName);
                });
            return defer.promise;
        };

        $scope.scaleCluster = function scaleCluster(count) {
            var defer = $q.defer();
            clusterData.sendScaleCluster($scope.clusterName, count)
                .then(function(response) {
                    sendNotifications.notify("Success", "Cluster scaling initiated for: " + $scope.clusterName);
                    defer.resolve("Cluster scaling initiated for: " + $scope.clusterName);
                }, function(error) {
                    sendNotifications.notify("Error", "Unable to scale cluster " + $scope.clusterName);
                    defer.reject("Unable to scale cluster " + $scope.clusterName);
                });
            return defer.promise;
        };
    }
]);

module.controller('ClusterNewCtrl', [
    '$q',
    '$scope',
    "dialogData",
    "clusterData",
    "sendNotifications",
     function($q, $scope, dialogData, clusterData, sendNotifications) {
        var NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
        var fields = {
                name: "",
                workers: 0,
            };
        $scope.fields = fields;

        function validate(name, workers) {
            var defer = $q.defer();
            var ex;
            if (name !== undefined) {
                if (!name)
                    ex = new Error("The cluster name cannot be empty.");
                else if (!NAME_RE.test(name))
                    ex = new Error("The member name contains invalid characters.");

                if (ex) {
                    ex.target = "#cluster-new-name";
                    defer.reject(ex);
                }
            }
            if (!workers || workers == 0) {
                ex = new Error("Please set the number of workers.");
                ex.target = "#cluster-new-workers";
                defer.reject(ex);
            }

            if (!ex) {
                defer.resolve();
            }

            return defer.promise;
        }
        $scope.newCluster = function newCluster() {
            var defer = $q.defer();
            var name = $scope.fields.name.trim();
            var workers = $scope.fields.workers;
            var workersInt = parseInt(workers, 10);

            validate(name, workersInt)
                .then(function() {
                    clusterData.sendCreateCluster(name, workersInt).then(function(response) {
                        sendNotifications.notify("Success", "New cluster " + name + " deployed.");
                        defer.resolve("New cluster " + name + " deployed.");
                    }, function(error) {
                        sendNotifications.notify("Error", "Unable to deploy new cluster.");
                        defer.reject("Unable to deploy new cluster.");
                    });
                }, function(error) {
                    defer.reject(error);
                });
            return defer.promise;
        };
    }
]);

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
