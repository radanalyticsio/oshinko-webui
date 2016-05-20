'use strict';


var app = angular.module('Oshinko', [
    'ngCookies',
    'ngRoute',
    'Oshinko.filters',
    'Oshinko.services',
    'Oshinko.directives',
    'Oshinko.controllers',
    'Oshinko.factories'
]);

app.run(['$rootScope', '$http', function ($rootScope, $http) {
    $http.get('/oshinko-rest-location').success(function(response) {
        $rootScope.oshinko_rest_location = response;
    });
}]);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/clusters/:Id',
        {
            templateUrl: 'partials/cluster-detail.html',
            controller: 'ClusterDetailCtrl',
            activetab: 'clusters'
        });
    $routeProvider.when('/clusters',
        {
            templateUrl: 'partials/clusters.html',
            controller: 'ClusterCtrl',
            activetab: 'clusters'
        });
    $routeProvider.when('/about',
        {
            templateUrl: 'partials/about.html',
            controller: 'AboutCtrl',
            activetab: 'about'
        });
    $routeProvider.when('/login',
        {
            templateUrl: 'login.html',
            controller: 'LoginController',
            activetab: ''
        });

    $routeProvider.otherwise({redirectTo: '/login'});

}]);

app.run(['$rootScope', '$location', '$cookieStore', '$http',
    function ($rootScope, $location, $cookieStore, $http) {
        // keep user logged in after page refresh
        $rootScope.globals = $cookieStore.get('globals') || {};
        if ($rootScope.globals.currentUser) {
            $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata; // jshint ignore:line
        }

        $rootScope.$on('$locationChangeStart', function (event, next, current) {
            // redirect to login page if not logged in
            if ($location.path() !== '/login' && !$rootScope.globals.currentUser) {
                $location.path('/login');
            }
        });
    }]);