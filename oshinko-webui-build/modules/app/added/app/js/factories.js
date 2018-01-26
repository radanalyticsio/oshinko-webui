/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
'use strict';

var module = angular.module('Oshinko.factories', ['ui.bootstrap', 'patternfly.notification']);

module.factory('clusterActions', [
  '$uibModal',
  function($uibModal) {
    function deleteCluster(clusterName) {
      return $uibModal.open({
        animation: true,
        controller: 'ClusterDeleteCtrl',
        templateUrl: '/webui/forms/' + 'delete-cluster.html',
        resolve: {
          dialogData: function() {
            return { clusterName: clusterName };
          }
        }
      }).result;
    }
    function newCluster() {
      return $uibModal.open({
        animation: true,
        controller: 'ClusterNewCtrl',
        templateUrl: '/webui/forms/' + 'new-cluster.html',
        resolve: {
          dialogData: function() {
            return { };
          }
        }
      }).result;
    }
    function scaleCluster(clusterName, workerCount, masterCount) {
      return $uibModal.open({
        animation: true,
        controller: 'ClusterDeleteCtrl',
        templateUrl: '/webui/forms/' + 'scale-cluster.html',
        resolve: {
          dialogData: function() {
            return { clusterName: clusterName,
              workerCount: workerCount,
              masterCount: masterCount
            };
          }
        }
      }).result;
    }
    return {
      deleteCluster: deleteCluster,
      newCluster: newCluster,
      scaleCluster: scaleCluster
    };
  }
]);

module.factory('sendNotifications', function(Notifications) {
  var notificationFactory = {};
  var typeMap = {
    'Info': Notifications.info,
    'Success': Notifications.success,
    'Warning': Notifications.warn,
    'Error': Notifications.error
  };

  notificationFactory.notify = function(type, message) {
    typeMap[type](message);
  };
  return notificationFactory;
});

/* Error handling factory.  Since our server will return
 * a successful status code, even on things where an operation
 * was not successful, we need to take a closer look at
 * the response itself to determine if we should report an
 * error to the user.  This factory is mean to be the one stop shop
 * for error handling and can be extended to handle all sorts
 * of things.
 */
module.factory('errorHandling', function(sendNotifications) {
  var errorHandlingFactory= {};

  errorHandlingFactory.handle = function(response, error, defer, successMsg) {
    if (response && response.data && response.data.errors) {
      response.data.errors.forEach(function (singleError) {
        console.error(singleError['title'] + "\nStatus Code: " + singleError.status + "\n" + singleError.details);
      });
      if (defer) {
        defer.reject(response.data.errors[0].details);
      }
    } else if (error) {
      console.error("Problem communicating with server.  Error code:  " + error.status);
      if (defer) {
        defer.reject(error.data);
      }
    } else {
      sendNotifications.notify("Success", successMsg);
      if(defer) {
        defer.resolve(successMsg);
      }
    }
  };
  return errorHandlingFactory;
});
