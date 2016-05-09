'use strict';

var module = angular.module('Oshinko.factories', ['ui.bootstrap']);

module.factory('clusterDataFactory', ['$http', function($http) {
        var urlBase = 'http://10.16.40.63/';
        var dataFactory = {};

        dataFactory.getClusters = function () {
            return $http.get(urlBase + "?" + Date.now());
        };

        dataFactory.getCluster = function (id) {
            return $http.get(urlBase + 'details.html?cluster_id=' + id);
        };

        dataFactory.updateCluster = function (id, json_data) {
            return $http.put(urlBase + '/' + id, json_data);
        };
        return dataFactory;
    }]);