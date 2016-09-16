/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
'use strict';


angular.module('Oshinko')
	.directive('appVersion',
		['version',
			function (version) {
			    return function (scope, elm, attrs) {
			        elm.text(version);
			    };
			}
		]
	)
	.directive('clusterPanel', [
		'$q',
		'clusterDataFactory',
		'sendNotifications',
		'$interval',
        function($q, clusterDataFactory, sendNotifications, $interval) {
            return {
                restrict: 'A',
                scope: true,
                link: function(scope, element, attrs) {

                	function queryFirst(element, selector) {
				        var result = null;
				        var i, len = element.length;
				        for (i = 0; !result && i < len; i++)
				            result = element[i].querySelector(selector);
				        return angular.element(result);
    				}

    				var wait = angular.element("<div class='dialog-wait-ct pull-right'>");
    				var notify = angular.element("<span>");
                	function appendSpinnerPromise() {
                		var defer = $q.defer();
                		appendSpinner();
				        defer.resolve();
				        return defer.promise;
    				}

    				function appendSpinner() {
						wait.append(angular.element("<div class='spinner spinner-bg'>"));
				        wait.append(notify);
				        queryFirst(element, ".table-footer").prepend(wait);
    				}

                    var tab = 'main';
                    var REFRESH_SECONDS = 10;
                    scope.tab = function(name, ev) {
                        if (ev) {
                            tab = name;
                            ev.stopPropagation();
                        }
                        return tab === name;
                    };
                    var clusterId = scope.clusterId;
                    scope.cluster_details = {};

				    scope.reloadDetails = function() {
				    	wait.remove();
				    	appendSpinnerPromise().
				    		then(function(){
				    			clusterDataFactory.getCluster(clusterId)
						            .then(function(response) {
						                scope.cluster_details = response.data.cluster;
						            }, function(error) {
						                sendNotifications.notify("Error", "Unable to fetch cluster details");
						            })
						            .then(function(){
						            	wait.remove();
						            	REFRESH_SECONDS = 10;
						            });
				    		});

				    };


				    var intervalPromise = $interval(function() {
				        scope.reloadDetails();
				    }.bind(this), REFRESH_SECONDS * 1000);

				    // no update when this page isn't displayed
				    scope.$on('$destroy', function() {
				        if (intervalPromise)
				            $interval.cancel(intervalPromise);
				    });

				    scope.reloadDetails();
                },
                templateUrl: "views/cluster-panel.html"
            };
        }
    ])
	.directive('clusterBody', [
        function() {
            return {
                restrict: 'A',
                templateUrl: 'views/cluster-body.html',
                link: function(scope, element, attrs) {
                },
            };
        }
    ]);
