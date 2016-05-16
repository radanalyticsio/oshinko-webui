'use strict';

var module = angular.module('Oshinko.factories', ['ui.bootstrap', 'patternfly.notification']);

module.factory('clusterDataFactory', function ($http, sendNotifications) {
    var urlBase = 'http://10.16.40.63/';
    var dataFactory = {};

    dataFactory.getClusters = function () {
        return $http.get(urlBase + "?" + Date.now());
    };

    dataFactory.getCluster = function (id) {
        return $http.get(urlBase + 'details.html?cluster_id=' + id);
    };

    dataFactory.deleteCluster = function (id) {
        var result = $http({
            method: "DELETE",
            url: urlBase + id,
            data: '',
            headers: {
                'Content-Type': 'application/json',
                'allow-access-control-origin': "*"
            }
        });
        sendNotifications.notify("Success", "Cluster " + id + " deleted");
        return result;
    };

    dataFactory.createCluster = function (json_data) {
        var result = $http.post(urlBase, json_data);
        sendNotifications.notify("Success", "New cluster started");
        return result;
    };

    dataFactory.updateCluster = function (id, json_data) {
        var result = $http.put(urlBase + '/' + id, json_data);
        sendNotifications.notify("Success", "Cluster updated");
        return result;
    };
    return dataFactory;
});

module.factory('sendNotifications', function (Notifications) {
    var notificationFactory = {};
    var typeMap = {
        'Info': Notifications.info,
        'Success': Notifications.success,
        'Warning': Notifications.warn,
        'Danger': Notifications.error
    };

    notificationFactory.notify = function (type, message) {
        typeMap[type](message);
    };
    return notificationFactory;
});