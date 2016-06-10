'use strict';

var module = angular.module('Oshinko.factories', ['ui.bootstrap', 'patternfly.notification']);

module.factory('clusterDataFactory', function($rootScope, $http, sendNotifications) {
    var urlBase = 'api';
    var dataFactory = {};

    dataFactory.getClusters = function() {
        return $http.get(urlBase + "/clusters");
    };

    dataFactory.getCluster = function(id) {
        return $http.get(urlBase + '/clusters/' + id);
    };

    dataFactory.deleteCluster = function(id) {
        var result = $http({
            method: "DELETE",
            url: urlBase + '/clusters/' + id,
            data: '',
            headers: {
                'Content-Type': 'application/json',
                'allow-access-control-origin': "*"
            }
        });
        return result;
    };

    dataFactory.createCluster = function(name, workerCount) {
        var jsonData = {
            "masterCount": 1,
            "workerCount": workerCount,
            "name": name
        }
        return $http.post(urlBase + "/clusters", jsonData);
    };

    dataFactory.updateCluster = function(id, name, workerCount) {
        var jsonData = {
            "masterCount": 1,
            "workerCount": workerCount,
            "name": name
        }
        var result = $http.put(urlBase + '/clusters/' + id, jsonData);
        return result;
    };
    return dataFactory;
});

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

module.factory('OshinkoAuthService', ['$http', '$cookies', '$rootScope', '$timeout',
    function($http, $cookies, $rootScope, $timeout) {
        var service = {};

        service.Login = function(username, password, callback) {

            $timeout(function() {
                var response = {
                    success: username != '' && password != ''
                };
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

        service.SetCredentials = function(username, password) {
            var authdata = btoa(username + ':' + password);

            $rootScope.globals = {
                currentUser: {
                    username: username,
                    authdata: authdata
                }
            };

            var now = new Date();
            var expireDate = new Date(now.setDate(now.getDate() + 1));
            // var expireDate = new Date(now.setTime(now.getTime() + (30 * 1000))); //expire cookie in 30 sec
            $http.defaults.headers.common['Authorization'] = 'Basic ' + authdata;
            $cookies.putObject('daikoncookie', $rootScope.globals, {
                'expires': expireDate
            });
        };

        service.ClearCredentials = function() {
            $rootScope.globals = {};
            $cookies.remove('daikoncookie');
            $http.defaults.headers.common.Authorization = 'Basic ';
        };

        return service;
    }
]);
