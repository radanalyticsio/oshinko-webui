/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
'use strict';

angular.module('Oshinko')
    .controller('ClusterCtrl',
/*        [
        '$scope',
        '$interval',
        '$location',
        '$route',
        'clusterDataFactory',
        'sendNotifications',
        'clusterActions',
        "ListingState",
        "errorHandling",
        "DataService",
        "AuthService",*/
        function($scope, $interval, $location, $route, clusterDataFactory,
                 sendNotifications, clusterActions, ListingState,
                 DataService, AuthService, ProjectsService, $routeParams,
                 $rootScope) {

            var watches = [];
            $scope.projects = {};
            $scope.alerts = $scope.alerts || {};
            $scope.showGetStarted = false;
            $scope.myname ="";
            $scope.mytoken = "";
            $scope.projectName = $routeParams.project;


            var cluster_id = $route.current.params.Id || '';
            $scope.predicate = 'name';
            $scope.reverse = false;
            angular.extend($scope, clusterActions);
            $scope.listing = new ListingState($scope);
            $scope.order = function(predicate) {
                $scope.reverse = ($scope.predicate === predicate) ? !$scope.reverse : false;
                $scope.predicate = predicate;
            };

            AuthService.withUser().then(function() {
                console.log(" AuthService.withUser()......");
                console.log(AuthService.UserStore().getUser());
                $scope.myname = AuthService.UserStore().getUser().metadata.name;
                $scope.mytoken = AuthService.UserStore().getToken();

                $rootScope.globals = {
                            currentUser: {
                                username: $scope.myname
                            }
                        };
                // watches.push(DataService.watch("projects", $scope, function(projects) {
                //     $scope.projects = projects.by("metadata.name");
                //     console.log(" AuthService.withUser()......projects")
                //     //$scope.showGetStarted = hashSizeFilter($scope.projects) === 0;
                // }));


            // ProjectsService
            //     .get($routeParams.project)
            //     .then(_.spread(function(project, context) {
            //             $scope.project = project;
            //             // FIXME: DataService.createStream() requires a scope with a
            //             // projectPromise rather than just a namespace, so we have to pass the
            //             // context into the log-viewer directive.
            //             $scope.projectContext = context;
            //             DataService.get("projects", "myproject", context).then(
            //                 function(p) {
            //                 // success
            //                 console.log("found ", p);
            //                 },
            //                 // failure
            //                 function(e) {
            //                     $scope.loaded = true;
            //                     $scope.alerts["load"] = {
            //                         type: "error",
            //                         message: "The pod details could not be loaded.",
            //                         details: "Reason: " +(e)
            //                     };
            //                 }
            //             );
            // }));
            


            if (!cluster_id) {
                $scope.reloadData = function() {
                    clusterDataFactory.getClusters()
                        .then(function(response) {
                            console.log(response);
                            if(response.data.clusters)
                                $scope.details = response.data.clusters;
                            else
                                $scope.details = null;
                        }, function(error) {
                            sendNotifications.notify(
                                "Error", "Unable to fetch data.  Error code: "
                                + error.data.code);
                        });
                };
            } else {
                $scope.reloadData = function() {
                    clusterDataFactory.getCluster(cluster_id)
                        .then(function(response) {
                            $scope.cluster_details = response.data.cluster;
                        }, function(error) {
                            sendNotifications.notify(
                                "Error", "Unable to fetch cluster details.  Error code: "
                                + error.data.code);
                        });
                };
            }

            $scope.gotoCluster = function gotoCluster(clusterName) {
                var path = '/clusters/' + encodeURIComponent(clusterName);
                $location.path(path);
            };

            var intervalPromise;
            var REFRESH_SECONDS = 10;
            intervalPromise = $interval(function() {
                $scope.reloadData();
            }.bind(this), REFRESH_SECONDS * 1000);

            //no update when this page isn't displayed
            $scope.$on('$destroy', function() {
                if (intervalPromise)
                    $interval.cancel(intervalPromise);
            });

            $scope.reloadData();


            });
        }
    //]
    )
    .controller('NavCtrl', function($rootScope, $scope, $location, OshinkoAuthService) {
        $scope.isActive = function(route) {
            return $location.path() === route;
        };
        // $scope.logout = function() {
        //     OshinkoAuthService.ClearCredentials();
        //     $location.path('/login');
        // };
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
                        });
                    }, function(error) {
                        defer.reject(error);
                    });
                return defer.promise;
            };
        }
    ])
    .controller('LoginController', ['$scope', '$rootScope', '$location', 'OshinkoAuthService',
        function($scope, $rootScope, $location, OshinkoAuthService) {
            $scope.username = '';
            $scope.password = '';
            // OshinkoAuthService.ClearCredentials();
            // $scope.login = function() {
            //     $scope.dataLoading = true;
            //     OshinkoAuthService.Login($scope.username, $scope.password, function(response) {
            //         OshinkoAuthService.ClearCredentials();
            //         if (response.success) {
            //             OshinkoAuthService.SetCredentials($scope.username, $scope.password);
            //             $location.path('/clusters');
            //         } else {
            //             $scope.error = response.message;
            //             $scope.dataLoading = false;
            //         }
            //     });
            // };
        }
    ]);
