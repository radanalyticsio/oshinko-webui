/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 */
'use strict';

/* jshint -W098 */
var module = angular.module('Oshinko.directives', []);
module.directive('appVersion',
  ['version',
    function (version) {
      return function (scope, elm, attrs) {
        elm.text(version);
      };
    }
  ]
);
module.directive('clusterPanel', [
  '$q',
  'sendNotifications',
  '$interval',
  function ($q) {
    return {
      restrict: 'A',
      scope: true,
      link: function (scope, element, attrs) {

        function queryFirst(element, selector) {
          var result = null;
          var i, len = element.length;
          for (i = 0; !result && i < len; i++) {
            result = element[i].querySelector(selector);
          }
          return angular.element(result);
        }

        var wait = angular.element("<div class='dialog-wait-ct pull-right'>");
        var notify = angular.element("<span>");

        function appendSpinner() {
          wait.append(angular.element("<div class='spinner spinner-bg'>"));
          wait.append(notify);
          queryFirst(element, ".table-footer").prepend(wait);
        }

        function appendSpinnerPromise() {
          var defer = $q.defer();
          appendSpinner();
          defer.resolve();
          return defer.promise;
        }

        var clusterId = scope.clusterId;
        var setClusterDetails = function (clusterName) {
          try {
            scope.cluster_details = scope.oshinkoClusters[clusterName];
            scope.cluster_details['name'] = scope.cluster_details.master.svc[Object.keys(scope.cluster_details.master.svc)[0]].metadata.labels['oshinko-cluster'];
            scope.cluster_details['workerCount'] = Object.keys(scope.cluster_details.worker.pod).length;
            scope.cluster_details['masterCount'] = Object.keys(scope.cluster_details.master.pod).length;
            scope.cluster_details['allPods'] = Object.values(scope.cluster_details.worker.pod);
            scope.cluster_details['allPods'].push(Object.values(scope.cluster_details.master.pod)[0]);
            scope.cluster_details['containers'] = clusterName + "-m|" + clusterName + "-w";
            var masterPodName = Object.keys(scope.cluster_details.master.pod)[0];
            var clusterMetrics = scope.cluster_details.master.pod[masterPodName].metadata.labels["oshinko-metrics-enabled"] && scope.cluster_details.master.pod[masterPodName].metadata.labels["oshinko-metrics-enabled"] === "true";
            scope.metricsAvailable = clusterMetrics;
          } catch (e) {
            // most likely recently deleted
            scope.cluster_details = null;
          }
        };
        setClusterDetails(clusterId);


        var tab = 'main';
        var REFRESH_SECONDS = 10;
        scope.tab = function (name, ev) {
          if (ev) {
            tab = name;
            ev.stopPropagation();
          }
          return tab === name;
        };

      },
      templateUrl: "webui/partials/cluster-panel.html"
    };
  }
]);
module.directive('clusterBody', [
  function () {
    return {
      restrict: 'A',
      templateUrl: 'webui/partials/cluster-body.html',
      link: function (scope, element, attrs) {
      }
    };
  }
]);
/* jshint +W098 */