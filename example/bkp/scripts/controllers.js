/*
 * This file is part of Oshinko WebUI.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
'use strict';

angular.module('Oshinko')
    .filter('label', function() {
        return function(resource, key) {
            if (resource && resource.metadata && resource.metadata.labels) {
                return resource.metadata.labels[key];
            }
            return null;
        };
    })
    .controller('ClusterCtrl',
        function($scope, $interval, $location, $route, clusterDataFactory,
                 sendNotifications, clusterActions, ListingState,
                 DataService, AuthService, ProjectsService, $routeParams,
                 $rootScope, $filter) {

            var watches = [];
            var services, pods;
            $scope.projects = {};
            $scope.oshinkoClusters;
            $scope.oshinkoClusterNames = [];
            $scope.alerts = $scope.alerts || {};
            $scope.showGetStarted = false;
            $scope.myname = "";
            $scope.mytoken = "";
            var label = $filter('label');
            $scope.clusterId = $route.current.params.Id || '';
            $scope.predicate = 'name';
            $scope.reverse = false;
            angular.extend($scope, clusterActions);
            $scope.listing = new ListingState($scope);
            $scope.order = function (predicate) {
                $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
                $scope.predicate = predicate;
            };
            //TODO move this to a factory
            function oshinkoCluster(resource) {
                if(label(resource, "oshinko-cluster")) {
                    return true;
                }
                return false;
            }
            function groupByCluster(pods, services, clusterId) {
                var clusters = {};
                var clusterName;
                var type;
                var podName;
                var svcName;
                var svc;
                _.each(pods, function(pod) {
                    if (!oshinkoCluster(pod)) {
                        return;
                    }
                    clusterName = label(pod, "oshinko-cluster");
                    if(clusterName != clusterId) {
                        return;
                    }

                    podName = _.get(pod, 'metadata.name', '');
                    type = label(pod, "oshinko-type");
                    //find matching services
                    svc = _.find(services, function(service) {
                        var svcSelector = new LabelSelector(service.spec.selector);
                        return svcSelector.matches(pod);
                    });

                    if(svc) {
                        svcName = _.get(svc, 'metadata.name', '');
                        _.set(clusters, [clusterName, type, 'svc', svcName], svc);
                    }
                    _.set(clusters, [clusterName, type, 'pod', podName], pod);
                });
                //find webui services
                _.each(services, function(service) {
                    if (!oshinkoCluster(service)) {
                        return;
                    }
                    clusterName = label(service, "oshinko-cluster");
                    if(clusterName != clusterId) {
                        return;
                    }
                    type = label(service, "oshinko-type");
                    if(type === "webui") {
                        svcName = _.get(service, 'metadata.name', '');
                        _.set(clusters, [clusterName, type, 'svc', svcName], service);
                    }
                });

                return clusters;
            }
            var groupByClusterId = function(clusterId) {
                if (!pods || !services) {
                    return;
                }
                $scope.oshinkoClusters = groupByCluster(pods, services, clusterId);
                $scope.oshinkoClusterNames = Object.keys($scope.oshinkoClusters);
            };
            $scope.countWorkers = function(cluster) {
                if (!cluster || !cluster.worker || !cluster.worker.pod)
                    return 0;
                var pods =  cluster.worker.pod;
                var length = Object.keys(pods).length;
                return length;
            };
            $scope.getClusterName = function(cluster) {
                var name = Object.keys(cluster);
                return name[0];
            };
            $scope.getClusterStatus = function(cluster) {
                var status = "Starting...";
                var podStatus;
                var isPod = false;
                if (!cluster || !cluster.worker || !cluster.worker.pod
                    || !cluster.master || !cluster.master.pod) {
                    return "Error";
                }
                //TODO look at more states
                _.each(cluster.worker.pod, function(worker) {
                    isPod = true;
                    if(worker.status.phase !== "Running") {
                        podStatus = worker.status.phase;
                        return;
                    }
                });

                _.each(cluster.master.pod, function(master) {
                    isPod = true;
                    if(master.status.phase !== "Running") {
                        podStatus = master.status.phase;
                        return;
                    }
                });
                //return pod status
                if(isPod && podStatus)
                    return podStatus;
                else if (isPod)
                    return "Running";

                //return starting...
                return status;
            };
            $scope.getSparkMasterUrl = function(cluster) {
                if (!cluster || !cluster.master || !cluster.master.svc) {
                    return "";
                }
                var masterSvc = Object.keys(cluster.master.svc);
                if (masterSvc.length == 0) {
                    return "";
                }
                var svcName = masterSvc[0];
                var port = cluster.master.svc[svcName].spec.ports[0].port;
                return "spark://" + svcName + ":" + port;
            };
            $scope.getCluster = function() {
                if(!$scope.oshinkoClusters || !$scope.cluster)
                    return;

                var cluster = $scope.oshinkoClusters[$scope.cluster];
                return cluster;
            };

            AuthService.withUser().then(function() {
                console.log(" AuthService.withUser()......");
                $scope.myname = AuthService.UserStore().getUser().metadata.name;
                console.log("Logged in as :" + $scope.myname);
                //$scope.mytoken = AuthService.UserStore().getToken();
                $rootScope.globals = {
                    currentUser: {
                        username: $scope.myname
                    }
                };
            });

            ProjectsService
                .get("oshinko")
                .then(_.spread(function(project, context) {
                    $scope.project = project;
                    $scope.projectContext = context;
                    console.log("In Project : " +project);
                    watches.push(DataService.watch("pods", context, function(podsData) {
                        $scope.pods =pods = podsData.by("metadata.name");
                        groupByClusterId($scope.clusterId);
                    }));

                    watches.push(DataService.watch("services", context, function(serviceData) {
                        $scope.services = services = serviceData.by("metadata.name");
                        groupByClusterId($scope.clusterId);
                    }));

                    $scope.$on('$destroy', function(){
                        DataService.unwatchAll(watches);
                    });

                }));

            $scope.$on('$destroy', function(){
                DataService.unwatchAll(watches);
            });
        })
    .controller('ClustersCtrl',
        function($scope, $interval, $location, $route, clusterDataFactory,
                 sendNotifications, clusterActions, ListingState,
                 DataService, AuthService, ProjectsService, $routeParams,
                 $rootScope, $filter) {

            var watches = [];
            var services, pods;
            $scope.projects = {};
            $scope.oshinkoClusters;
            $scope.oshinkoClusterNames = [];
            $scope.alerts = $scope.alerts || {};
            $scope.showGetStarted = false;
            $scope.myname ="";
            $scope.mytoken = "";
            var label = $filter('label');
            $scope.cluster_id = $route.current.params.Id || '';
            $scope.predicate = 'name';
            $scope.reverse = false;
            angular.extend($scope, clusterActions);
            $scope.listing = new ListingState($scope);
            $scope.order = function(predicate) {
                $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
                $scope.predicate = predicate;
            };
            //TODO move this to a factory
            function oshinkoCluster(resource) {
                if(label(resource, "oshinko-cluster")) {
                    return true;
                }
                return false;
            }
            function groupByClusters(pods, services) {
                var clusters = {};
                var clusterName;
                var type;
                var podName;
                var svcName;
                var svc;
                _.each(pods, function(pod) {
                    if (!oshinkoCluster(pod)) {
                        return;
                    }
                    clusterName = label(pod, "oshinko-cluster");
                    podName = _.get(pod, 'metadata.name', '');
                    type = label(pod, "oshinko-type");
                    //find matching services
                    svc = _.find(services, function(service) {
                        var svcSelector = new LabelSelector(service.spec.selector);
                        return svcSelector.matches(pod);
                    });

                    if(svc) {
                        svcName = _.get(svc, 'metadata.name', '');
                        _.set(clusters, [clusterName, type, 'svc', svcName], svc);
                    }
                    _.set(clusters, [clusterName, type, 'pod', podName], pod);
                });
                //find webui services
                _.each(services, function(service) {
                    type = label(service, "oshinko-type");
                    if(type === "webui") {
                        clusterName = label(service, "oshinko-cluster");
                        svcName = _.get(service, 'metadata.name', '');
                        _.set(clusters, [clusterName, type, 'svc', svcName], service);
                    }
                });

                return clusters;
            }
            var groupClusters = function() {
                if (!pods || !services) {
                    return;
                }
                $scope.oshinkoClusters = groupByClusters(pods, services);
                $scope.oshinkoClusterNames = Object.keys($scope.oshinkoClusters);
            };
            $scope.countWorkers = function(cluster) {
                if (!cluster || !cluster.worker || !cluster.worker.pod)
                    return 0;
                var pods =  cluster.worker.pod;
                var length = Object.keys(pods).length;
                return length;
            };
            $scope.getClusterName = function(cluster) {
                var name = Object.keys(cluster);
                return name[0];
            };
            $scope.getClusterStatus = function(cluster) {
                var status = "Starting...";
                var podStatus;
                var isPod = false;
                if (!cluster || !cluster.worker || !cluster.worker.pod
                    || !cluster.master || !cluster.master.pod) {
                    return "Error";
                }
                //TODO look at more states
                _.each(cluster.worker.pod, function(worker) {
                    isPod = true;
                    if(worker.status.phase !== "Running") {
                        podStatus = worker.status.phase;
                        return;
                    }
                });

                _.each(cluster.master.pod, function(master) {
                    isPod = true;
                    if(master.status.phase !== "Running") {
                        podStatus = master.status.phase;
                        return;
                    }
                });
                //return pod status
                if(isPod && podStatus)
                    return podStatus;
                else if (isPod)
                    return "Running";

                //return starting...
                return status;
            };
            $scope.getSparkMasterUrl = function(cluster) {
                if (!cluster || !cluster.master || !cluster.master.svc) {
                    return "";
                }
                var masterSvc = Object.keys(cluster.master.svc);
                if (masterSvc.length == 0) {
                    return "";
                }
                var svcName = masterSvc[0];
                var port = cluster.master.svc[svcName].spec.ports[0].port;
                return "spark://" + svcName + ":" + port;
            };
            $scope.getCluster = function() {
                if(!$scope.oshinkoClusters || !$scope.cluster)
                    return;

                var cluster = $scope.oshinkoClusters[$scope.cluster];
                return cluster;
            };
            $scope.gotoCluster = function(clusterName) {
                var path = '/clusters/' + encodeURIComponent(clusterName);
                $location.path(path);
            };

            AuthService.withUser().then(function() {
                console.log(" AuthService.withUser()......");
                $scope.myname = AuthService.UserStore().getUser().metadata.name;
                console.log("Logged in as :" + $scope.myname);
                //$scope.mytoken = AuthService.UserStore().getToken();
                $rootScope.globals = {
                    currentUser: {
                        username: $scope.myname
                    }
                };
            });

            ProjectsService
                .get("oshinko")
                .then(_.spread(function(project, context) {
                    $scope.project = project;
                    $scope.projectContext = context;
                    console.log("In Project : " +project);
                    watches.push(DataService.watch("pods", context, function(podsData) {
                        $scope.pods =pods = podsData.by("metadata.name");
                        groupClusters();
                    }));

                    watches.push(DataService.watch("services", context, function(serviceData) {
                        $scope.services = services = serviceData.by("metadata.name");
                        groupClusters();
                    }));

                    $scope.$on('$destroy', function(){
                        DataService.unwatchAll(watches);
                    });

                }));

            $scope.$on('$destroy', function(){
                DataService.unwatchAll(watches);
            });
        }
    )
    .controller('NavCtrl', function($rootScope, $scope, $location, OshinkoAuthService) {
        $scope.isActive = function(route) {
            return $location.path() === route;
        };
    })
    .controller('ClusterDeleteCtrl', [
        '$q',
        '$scope',
        "dialogData",
        "clusterData",
        "sendNotifications",
        "errorHandling",
         function($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {

            $scope.clusterName = dialogData.clusterName || "";
            $scope.workerCount = dialogData.workerCount || "";

            $scope.deleteCluster = function deleteCluster() {
                var defer = $q.defer();
                clusterData.sendDeleteCluster($scope.clusterName)
                    .then(function(response) {
                        var successMsg = "Cluster " + $scope.clusterName + " deleted";
                        errorHandling.handle(response, null, defer, successMsg);
                    }, function(error) {
                        errorHandling.handle(null, error, defer, null);
                    });
                return defer.promise;
            };

            $scope.scaleCluster = function scaleCluster(count) {
                var defer = $q.defer();
                clusterData.sendScaleCluster($scope.clusterName, count)
                    .then(function(response) {
                        var successMsg = "Cluster scaling initiated for: " + $scope.clusterName;
                        errorHandling.handle(response, null, defer, successMsg);
                    }, function(error) {
                        errorHandling.handle(null, error, defer, null);
                    });
                return defer.promise;
            };
        }
    ])
    .controller('ClusterNewCtrl', [
        '$q',
        '$scope',
        "dialogData",
        "clusterData",
        "sendNotifications",
        "errorHandling",
         function($q, $scope, dialogData, clusterData, sendNotifications, errorHandling) {
            var NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
            var NUMBER_RE = /^[0-9]*$/;
            var fields = {
                    name: "",
                    workers: 1,
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
                if (workers !== undefined) {
                    if (!workers)
                        ex = new Error("The number of workers count cannot be empty.");
                    else if (!NUMBER_RE.test(workers))
                        ex = new Error("Please give a valid number of workers.");
                    else if (workers <= 0)
                        ex = new Error("Please give a value greater than 0.");

                    if (ex) {
                        ex.target = "#cluster-new-workers";
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
                var workersInt = $scope.fields.workers;

                validate(name, workersInt)
                    .then(function() {
                        clusterData.sendCreateCluster(name, workersInt).then(function(response) {
                            var successMsg = "New cluster " + name + " deployed.";
                            errorHandling.handle(response, null, defer, successMsg);
                        }, function(error) {
                            errorHandling.handle(null, error, defer, null);
                            console.log(error);
                        });
                    }, function(error) {
                        defer.reject(error);
                    });
                return defer.promise;
            };
        }
    ]);

