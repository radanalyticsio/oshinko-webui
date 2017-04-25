/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 */
'use strict';

var module = angular.module('Oshinko.controllers', [
  'ngAnimate',
  'ui.bootstrap',
  'patternfly.notification',
  'ui.cockpit',
  'ui.listing',
  'Oshinko.directives'
]);

module.controller('ClusterCtrl', [
  '$scope',
  '$interval',
  '$location',
  '$route',
  'clusterDataFactory',
  'sendNotifications',
  'clusterActions',
  "ListingState",
  "errorHandling",
  function ($scope, $interval, $location, $route, clusterDataFactory, sendNotifications, clusterActions, ListingState) {
    var cluster_id = $route.current.params.Id || '';
    $scope.predicate = 'name';
    $scope.reverse = false;
    angular.extend($scope, clusterActions);
    $scope.listing = new ListingState($scope);
    $scope.order = function (predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    if (!cluster_id) {
      $scope.reloadData = function () {
        clusterDataFactory.getClusters()
          .then(function (response) {
            console.log(response);
            if (response.data.clusters) {
              try {
                $scope.details = JSON.parse(response.data.clusters);
              } catch (err) {
                $scope.details = null;
              }
            }
            else {
              $scope.details = null;
            }
          }, function (error) {
            sendNotifications.notify(
              "Error", "Unable to fetch data.  Error code: " +
              error.status);
          });
      };
    } else {
      $scope.reloadData = function () {
        clusterDataFactory.getCluster(cluster_id)
          .then(function (response) {
            try {
              $scope.cluster_details = JSON.parse(response.data.clusters)[0];
            } catch (e) {
              $scope.cluster_details = null;
            }

          }, function (error) {
            sendNotifications.notify(
              "Error", "Unable to fetch cluster details.  Error code: " +
              error.status);
          });
      };
    }

    $scope.gotoCluster = function gotoCluster(clusterName) {
      var path = '/clusters/' + encodeURIComponent(clusterName);
      $location.path(path);
    };

    var intervalPromise;
    var REFRESH_SECONDS = window.__env.refresh_interval;
    intervalPromise = $interval(function () {
      $scope.reloadData();
    }.bind(this), REFRESH_SECONDS * 1000);

    // no update when this page isn't displayed
    $scope.$on('$destroy', function () {
      if (intervalPromise) {
        $interval.cancel(intervalPromise);
      }
    });

    $scope.reloadData();
  }
]);

module.controller('NavCtrl', function ($rootScope, $scope, $location) {
  $scope.isActive = function (route) {
    return $location.path() === route;
  };
});

module.controller('ClusterDeleteCtrl', [
  '$q',
  '$scope',
  "dialogData",
  "clusterData",
  "sendNotifications",
  "errorHandling",
  function ($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {

    $scope.clusterName = dialogData.clusterName || "";
    $scope.workerCount = dialogData.workerCount || "";
    $scope.workerCount = parseInt($scope.workerCount) || 0;

    $scope.deleteCluster = function deleteCluster() {
      var defer = $q.defer();
      clusterData.sendDeleteCluster($scope.clusterName)
        .then(function (response) {
          var successMsg = "Cluster " + $scope.clusterName + " deleted";
          errorHandling.handle(response, null, defer, successMsg);
        }, function (error) {
          errorHandling.handle(null, error, defer, null);
        });
      return defer.promise;
    };

    $scope.scaleCluster = function scaleCluster(count) {
      var defer = $q.defer();
      clusterData.sendScaleCluster($scope.clusterName, count)
        .then(function (response) {
          var successMsg = "Cluster scaling initiated for: " + $scope.clusterName;
          errorHandling.handle(response, null, defer, successMsg);
        }, function (error) {
          errorHandling.handle(null, error, defer, null);
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
  "errorHandling",
  function ($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {
    $scope.NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    $scope.NUMBER_RE = /^-?[0-9]*$/;
    $scope.fields = {
      name: "",
      workers: 1,
      configName: null,
      masterconfigname: null,
      workerconfigname: null
    };
    $scope.advanced = false;

    $scope.toggleAdvanced = function () {
      $scope.advanced = !$scope.advanced;
      if ($scope.advanced) {
        // set to -1 to indicate it's unset and to use the value in the cluster config
        $scope.fields.workers = -1;
      } else {
        $scope.fields.workers = 1;
      }
    };

    function validate(name, workers) {
      var defer = $q.defer();
      var ex;
      if (name !== undefined) {
        if (!name) {
          ex = new Error("The cluster name cannot be empty.");
        }
        else if (!$scope.NAME_RE.test(name)) {
          ex = new Error("The member name contains invalid characters.");
        }
        if (ex) {
          ex.target = "#cluster-new-name";
          defer.reject(ex);
        }
      }
      if (workers !== undefined) {
        if (workers < -1 && !$scope.advanced) {
          ex = new Error("The number of workers count cannot be empty.");
        }
        else if (!$scope.NUMBER_RE.test(workers)) {
          ex = new Error("Please give a valid number of workers.");
        }
        else if (workers < -1) {
          ex = new Error("Please give a value greater than 0.");
        }
        if (ex) {
          ex.target = $scope.advanced ? "#cluster-adv-workers" : "#cluster-new-workers";
          defer.reject(ex);
        }
      }

      if (!ex) {
        defer.resolve();
      }

      return defer.promise;
    }

    $scope.newCluster = function newCluster() {
      var defer = $q.defer();
      var name = $scope.fields.name.trim();
      var workersInt = $scope.fields.workers || 0;
      var configName = $scope.advanced ? $scope.fields.configName : null;
      var masterConfigName = $scope.advanced ? $scope.fields.masterconfigname : null;
      var workerConfigName = $scope.advanced ? $scope.fields.workerconfigname : null;

      validate(name, workersInt)
        .then(function () {
          clusterData.sendCreateCluster(name, workersInt, configName, masterConfigName, workerConfigName).then(function (response) {
            var successMsg = "New cluster " + name + " deployed.";
            errorHandling.handle(response, null, defer, successMsg);
          }, function (error) {
            errorHandling.handle(null, error, defer, null);
          });
        }, function (error) {
          defer.reject(error);
        });
      return defer.promise;
    };
  }
]);
