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

module.controller('ClusterCtrl',
  function ($scope, $interval, $location, $route, $filter, sendNotifications, clusterActions, ListingState, DataService) {
    $scope.cluster_id = $route.current.params.Id || '';
    var services, pods, routes, dcs;
    var watches = [];
    $scope.predicate = 'name';
    $scope.reverse = false;
    var label = $filter('label');
    angular.extend($scope, clusterActions);
    $scope.listing = new ListingState($scope);
    $scope.order = function (predicate) {
      $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
      $scope.predicate = predicate;
    };

    function oshinkoCluster(resource) {
      if (label(resource, "oshinko-cluster")) {
        return true;
      }
      return false;
    }

    function groupByClusters(pods, services, routes, dcs) {
      var clusters = {};
      var clusterName;
      var type;
      var podName;
      var svcName;
      var svc;
      _.each(pods, function (pod) {
        if (!oshinkoCluster(pod)) {
          return;
        }
        clusterName = label(pod, "oshinko-cluster");
        podName = _.get(pod, 'metadata.name', '');
        type = label(pod, "oshinko-type");
        //find matching services
        svc = _.find(services, function (service) {
          var svcSelector = new LabelSelector(service.spec.selector);
          return svcSelector.matches(pod);
        });

        if (svc) {
          svcName = _.get(svc, 'metadata.name', '');
          _.set(clusters, [clusterName, type, 'svc', svcName], svc);
        }
        _.set(clusters, [clusterName, type, 'pod', podName], pod);
      });
      //find webui services
      _.each(services, function (service) {
        type = label(service, "oshinko-type");
        if (type === "webui") {
          clusterName = label(service, "oshinko-cluster");
          svcName = _.get(service, 'metadata.name', '');
          _.set(clusters, [clusterName, type, 'svc', svcName], service);
        }
      });
      _.each(routes, function (route) {
        clusterName = label(route, "oshinko-cluster");
        if (clusterName) {
          _.set(clusters, [clusterName, 'uiroute'], route);
        }

      });
      _.each(dcs, function (dc) {
        clusterName = label(dc, "oshinko-cluster");
        if (clusterName) {
          _.set(clusters, [clusterName, 'dc'], dc);
        }

      });
      return clusters;
    }

    var setClusterDetails = function (clusterName, allClusters) {
      try {
        $scope.cluster_details = allClusters[clusterName];
        $scope.cluster_details['name'] = $scope.cluster_details.master.svc[Object.keys($scope.cluster_details.master.svc)[0]].metadata.labels['oshinko-cluster'];
        $scope.cluster_details['workerCount'] = Object.keys($scope.cluster_details.worker.pod).length;
        $scope.cluster_details['masterCount'] = Object.keys($scope.cluster_details.master.pod).length;
        $scope.cluster_details['allPods'] = Object.values($scope.cluster_details.worker.pod);
        $scope.cluster_details['allPods'].push(Object.values($scope.cluster_details.master.pod)[0]);
        $scope.cluster_details['containers'] = clusterName + "-m|" + clusterName + "-w";
        var masterPodName = Object.keys($scope.cluster_details.master.pod)[0];
        $scope.metricsAvailable = $scope.cluster_details.master.pod[masterPodName].metadata.labels["oshinko-metrics-enabled"] && $scope.cluster_details.master.pod[masterPodName].metadata.labels["oshinko-metrics-enabled"] === "true";
      } catch (e) {
        // most likely recently deleted
        $scope.cluster_details = null;
      }
    };

    var groupClusters = function () {
      if (!pods || !services) {
        return;
      }
      $scope.oshinkoClusters = groupByClusters(pods, services, routes, dcs);
      $scope.oshinkoClusterNames = Object.keys($scope.oshinkoClusters);
      if ($scope.cluster_id !== '' && $scope.oshinkoClusters[$scope.cluster_id]) {
        setClusterDetails($scope.cluster_id, $scope.oshinkoClusters);
      } else {
        $scope.cluster_details = null;
      }
    };
    $scope.countWorkers = function (cluster) {
      if (!cluster || !cluster.worker || !cluster.worker.pod) {
        return 0;
      }
      var pods = cluster.worker.pod;
      var length = Object.keys(pods).length;
      return length;
    };
    $scope.countMasters = function (cluster) {
      if (!cluster || !cluster.master || !cluster.master.pod) {
        return 0;
      }
      var pods = cluster.master.pod;
      var length = Object.keys(pods).length;
      return length;
    };
    $scope.getClusterName = function (cluster) {
      var name = Object.keys(cluster);
      return name[0];
    };
    $scope.getClusterConfig = function(cluster) {
      if (!cluster || !cluster.dc) {
        return "";
      }
      return JSON.stringify(JSON.parse(cluster.dc.metadata.annotations['oshinko-config']), undefined, 2);
    };
    $scope.getSparkWebUi = function (cluster) {
      var route = "";
      try {
        route = "http://" + cluster.uiroute.spec.host;
      } catch (e) {
        route = null;
      }
      return route;
    };
    $scope.getClusterStatus = function (cluster) {
      var status = "Starting...";
      var podStatus;
      var isPod = false;
      // no longer checking workers since scaling to zero is possible
      if (!cluster || !cluster.master || !cluster.master.pod) {
        return "Pending";
      }
      //TODO look at more states
      if (cluster.worker && cluster.worker.pod) {
        _.each(cluster.worker.pod, function (worker) {
          isPod = true;
          if (worker.status.phase !== "Running") {
            podStatus = worker.status.phase;
          }
        });
      }

      _.each(cluster.master.pod, function (master) {
        isPod = true;
        if (master.status.phase !== "Running") {
          podStatus = master.status.phase;
        }
      });
      //return pod status
      if (isPod && podStatus) {
        return podStatus;
      }
      else if (isPod) {
        return "Running";
      }
      //return starting...
      return status;
    };
    $scope.getSparkMasterUrl = function (clusterName) {
      var masterUrl = "spark://" + clusterName + ":7077";
      return masterUrl;
    };
    $scope.getCluster = function () {
      if (!$scope.oshinkoClusters || !$scope.cluster) {
        return;
      }

      var cluster = $scope.oshinkoClusters[$scope.cluster];
      return cluster;
    };

    $scope.context = {
      namespace: window.__env.namespace,
      projectName: window.__env.namespace
    };

    var REFRESH_MS = window.__env.refresh_interval * 1000;

    watches.push(DataService.watch("pods", $scope.context, function (podsData) {
      $scope.pods = pods = podsData.by("metadata.name");
      groupClusters();
    }, {"poll": true, "pollInterval": REFRESH_MS}));

    watches.push(DataService.watch("services", $scope.context, function (serviceData) {
      $scope.services = services = serviceData.by("metadata.name");
      groupClusters();
    }, {"poll": true, "pollInterval": REFRESH_MS}));

    watches.push(DataService.watch("routes", $scope.context, function (routeData) {
      $scope.routes = routes = routeData.by("metadata.name");
      groupClusters();
    }, {"poll": true, "pollInterval": REFRESH_MS}));

    watches.push(DataService.watch("deploymentconfigs", $scope.context, function (dcData) {
      $scope.dcs = dcs = dcData.by("metadata.name");
      groupClusters();
    }, {"poll": true, "pollInterval": REFRESH_MS}));

    $scope.$on('$destroy', function () {
      DataService.unwatchAll(watches);
    });

    $scope.gotoCluster = function gotoCluster(clusterName) {
      var path = '/clusters/' + encodeURIComponent(clusterName);
      $location.path(path);
    };
  }
);

module.controller('NavCtrl', function ($rootScope, $scope, $location) {
  $scope.isActive = function (route) {
    return $location.path() === route;
  };
});

module.controller('ClusterDeleteCtrl', function ($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {

    $scope.clusterName = dialogData.clusterName || "";
    $scope.masterCount = dialogData.masterCount || "";
    $scope.masterCount = parseInt($scope.masterCount) || 0;
    $scope.workerCount = dialogData.workerCount || "";
    $scope.workerCount = parseInt($scope.workerCount) || 0;
    $scope.context = {
      namespace: window.__env.namespace,
      projectName: window.__env.namespace
    };


    $scope.deleteCluster = function deleteCluster() {
      var defer = $q.defer();
      clusterData.sendDeleteCluster($scope.clusterName, $scope.context)
        .then(function (response) {
          var successMsg = "Cluster " + $scope.clusterName + " deleted";
          errorHandling.handle(response, null, defer, successMsg);
        }, function (error) {
          errorHandling.handle(null, error, defer, null);
        });
      return defer.promise;
    };

    $scope.scaleCluster = function scaleCluster(clusterName, workercount, mastercount) {
      var defer = $q.defer();
      clusterData.sendScaleCluster($scope.clusterName, workercount, mastercount, $scope.context)
        .then(function (response) {
          var successMsg = "Cluster scaling initiated for: " + $scope.clusterName;
          errorHandling.handle(response, null, defer, successMsg);
        }, function (error) {
          errorHandling.handle(null, error, defer, null);
        });
      return defer.promise;
    };
  }
);

module.controller('ClusterNewCtrl', function ($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {
    $scope.NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
    $scope.NUMBER_RE = /^-?[0-9]*$/;
    $scope.fields = {
      name: "",
      workers: 1,
      configName: null,
      masterconfigname: null,
      workerconfigname: null,
      exposewebui: true,
      sparkimage: "",
      enablemetrics: true
    };
    $scope.advanced = false;
    $scope.context = {
      namespace: window.__env.namespace,
      projectName: window.__env.namespace
    };

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
      var clusterConfig = {
        clusterName: name,
        masterCount: 1,
        workerCount: workersInt,
        configName: $scope.advanced ? $scope.fields.configname : null,
        masterConfigName: $scope.advanced ? $scope.fields.masterconfigname : null,
        workerConfigName: $scope.advanced ? $scope.fields.workerconfigname : null,
        exposewebui: $scope.advanced ? $scope.fields.exposewebui : true,
        sparkImage: $scope.advanced && $scope.fields.sparkimage !== "" ? $scope.fields.sparkimage  : "SPARK_DEFAULT",
        sparkDefaultUsed: $scope.advanced && $scope.fields.sparkimage !== "" ? false  : true,
        metrics: $scope.advanced && !$scope.fields.enablemetrics ? false : true,
      };

      validate(name, workersInt)
        .then(function () {
          clusterData.sendCreateCluster(clusterConfig, $scope.context).then(function (response) {
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
);
