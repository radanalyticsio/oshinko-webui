/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */

'use strict';


var app = angular.module('Oshinko', [
  'ngRoute',
  'Oshinko.controllers',
  'Oshinko.factories',
  'ab-base64'
]);

app.constant("API_CFG", _.get(window.OPENSHIFT_CONFIG, "api", {}));
app.constant("APIS_CFG", _.get(window.OPENSHIFT_CONFIG, "apis", {}));
app.config(['$locationProvider', function($locationProvider) {

  $locationProvider.html5Mode(false);

}]);

app.config(['$routeProvider', function ($routeProvider) {
  $routeProvider.when('/clusters/:Id?',
    {
      templateUrl: function (params) {
        if (!params.Id) {
          return 'webui/partials/clusters.html';
        }
        else {
          return 'webui/partials/cluster-detail.html';
        }
      },
      controller: 'ClusterCtrl',
      activetab: 'clusters'
    });
  $routeProvider.when('/login',
    {
      templateUrl: 'partials/login.html',
      controller: 'LoginController',
      activetab: ''
    });
  $routeProvider.otherwise({redirectTo: '/clusters'});
}]);

hawtioPluginLoader.addModule('Oshinko');
hawtioPluginLoader.registerPreBootstrapTask(function(next) {
  // Skips api discovery, needed to run spec tests
  if ( _.get(window, "OPENSHIFT_CONFIG.api.k8s.resources") ) {
    next();
    return;
  }

  var api = {
    k8s: {},
    openshift: {}
  };
  var apis = {};
  var API_DISCOVERY_ERRORS = [];
  var protocol = window.location.protocol + "//";

  // Fetch /api/v1 for legacy k8s resources, we will never bump the version of these legacy apis so fetch version immediately
  var k8sBaseURL = protocol + window.OPENSHIFT_CONFIG.api.k8s.hostPort + window.OPENSHIFT_CONFIG.api.k8s.prefix;
  var k8sDeferred = $.get(k8sBaseURL + "/v1")
    .done(function(data) {
      api.k8s.v1 =  _.keyBy(data.resources, 'name');
    })
    .fail(function(data, textStatus, jqXHR) {
      API_DISCOVERY_ERRORS.push({
        data: data,
        textStatus: textStatus,
        xhr: jqXHR
      });
    });

  // Fetch /oapi/v1 for legacy openshift resources, we will never bump the version of these legacy apis so fetch version immediately
  var osBaseURL = protocol + window.OPENSHIFT_CONFIG.api.openshift.hostPort + window.OPENSHIFT_CONFIG.api.openshift.prefix;
  var osDeferred = $.get(osBaseURL + "/v1")
    .done(function(data) {
      api.openshift.v1 =  _.keyBy(data.resources, 'name');
    })
    .fail(function(data, textStatus, jqXHR) {
      API_DISCOVERY_ERRORS.push({
        data: data,
        textStatus: textStatus,
        xhr: jqXHR
      });
    });

  // Fetch /apis to get the list of groups and versions, then fetch each group/
  // Because the api discovery doc returns arrays and we want maps, this creates a structure like:
  // {
  //   extensions: {
  //     name: "extensions",
  //     preferredVersion: "v1beta1",
  //     versions: {
  //       v1beta1: {
  //         version: "v1beta1",
  //         groupVersion: "extensions/v1beta1"
  //         resources: {
  //           daemonsets: {
  //             /* resource returned from discovery API */
  //           }
  //         }
  //       }
  //     }
  //   }
  // }
  var apisBaseURL = protocol + window.OPENSHIFT_CONFIG.apis.hostPort + window.OPENSHIFT_CONFIG.apis.prefix;
  var getGroups = function(baseURL, hostPrefix, data) {
    var apisDeferredVersions = [];
    _.each(data.groups, function(apiGroup) {
      var group = {
        name: apiGroup.name,
        preferredVersion: apiGroup.preferredVersion.version,
        versions: {},
        hostPrefix: hostPrefix
      };
      apis[group.name] = group;
      _.each(apiGroup.versions, function(apiVersion) {
        var versionStr = apiVersion.version;
        group.versions[versionStr] = {
          version: versionStr,
          groupVersion: apiVersion.groupVersion
        };
        apisDeferredVersions.push($.get(baseURL + "/" + apiVersion.groupVersion)
          .done(function(data) {
            group.versions[versionStr].resources =  _.keyBy(data.resources, 'name');
          })
          .fail(function(data, textStatus, jqXHR) {
            API_DISCOVERY_ERRORS.push({
              data: data,
              textStatus: textStatus,
              xhr: jqXHR
            });
          }));
      });
    });
    return $.when.apply(this, apisDeferredVersions);
  };
  var apisDeferred = $.get(apisBaseURL)
    .then(_.partial(getGroups, apisBaseURL, null), function(data, textStatus, jqXHR) {
      API_DISCOVERY_ERRORS.push({
        data: data,
        textStatus: textStatus,
        xhr: jqXHR
      });
    });

  // Additional servers can be defined for debugging and prototyping against new servers not yet served by the aggregator
  // There can not be any conflicts in the groups/resources from these API servers.
  var additionalDeferreds = [];
  _.each(window.OPENSHIFT_CONFIG.additionalServers, function(server) {
    var baseURL = (server.protocol ? (server.protocol + "://") : protocol) + server.hostPort + server.prefix;
    additionalDeferreds.push($.get(baseURL)
      .then(_.partial(getGroups, baseURL, server), function(data, textStatus, jqXHR) {
        if (server.required !== false) {
          API_DISCOVERY_ERRORS.push({
            data: data,
            textStatus: textStatus,
            xhr: jqXHR
          });
        }
      }));
  });

  // Will be called on success or failure
  var discoveryFinished = function() {
    window.OPENSHIFT_CONFIG.api.k8s.resources = api.k8s;
    window.OPENSHIFT_CONFIG.api.openshift.resources = api.openshift;
    window.OPENSHIFT_CONFIG.apis.groups = apis;
    if (API_DISCOVERY_ERRORS.length) {
      window.OPENSHIFT_CONFIG.apis.API_DISCOVERY_ERRORS = API_DISCOVERY_ERRORS;
    }
    next();
  };
  var allDeferreds = [
    k8sDeferred,
    osDeferred,
    apisDeferred
  ];
  allDeferreds = allDeferreds.concat(additionalDeferreds);
  $.when.apply(this, allDeferreds).always(discoveryFinished);
});

