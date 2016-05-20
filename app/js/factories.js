'use strict';

var module = angular.module('Oshinko.factories', ['ui.bootstrap', 'patternfly.notification']);

module.factory('clusterDataFactory', function ($rootScope, $http, sendNotifications) {
    var urlBase = $rootScope.oshinko_rest_location;
    var dataFactory = {};

    dataFactory.getClusters = function () {
        return $http.get(urlBase + "?" + Date.now());
    };

    dataFactory.getCluster = function (id) {
        return $http.get(urlBase + 'details.html?cluster_id=' + id + "&" + Date.now());
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
        'Error': Notifications.error
    };

    notificationFactory.notify = function (type, message) {
        typeMap[type](message);
    };
    return notificationFactory;
});

module.factory('OshinkoAuthService',
    ['$http', '$cookieStore', '$rootScope', '$timeout',
        function ($http, $cookieStore, $rootScope, $timeout) {
            var service = {};

            service.Login = function (username, password, callback) {

                $timeout(function () {
                    var response = {success: username != '' && password != ''};
                    if (!response.success) {
                        response.message = 'Username or password is incorrect';
                    }
                    callback(response);
                }, 1000);


                //$http.post('/actualauth endpoint', { login data })
                //    .success(function (response) {
                //        callback(response);
                //    });

            };

            service.SetCredentials = function (username, password) {
                var authdata = btoa(username + ':' + password);

                $rootScope.globals = {
                    currentUser: {
                        username: username,
                        authdata: authdata
                    }
                };

                $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
                $cookieStore.put('globals', $rootScope.globals);
            };

            service.ClearCredentials = function () {
                $rootScope.globals = {};
                $cookieStore.remove('globals');
                $http.defaults.headers.common.Authorization = 'Basic ';
            };

            return service;
        }]);

