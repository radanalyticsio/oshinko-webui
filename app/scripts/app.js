/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */

'use strict';


angular.module('Oshinko', [
        'ipCookie',
        'ngRoute',
        // 'Oshinko.controllers',
        // 'Oshinko.factories',
        'ngAnimate',
        'ngCookies',
        'ngResource',
        'ngRoute',
        'ngSanitize',
        'ngTouch',
        'kubernetesUI',
        'openshiftUI',
        'ui.bootstrap',
        'patternfly.notification',
        'ipCookie',
        'ui.cockpit',
        'ui.listing',
    ])
    .constant("API_CFG", _.get(window.OPENSHIFT_CONFIG, "api", {}))
    .constant("APIS_CFG", _.get(window.OPENSHIFT_CONFIG, "apis", {}))
    .constant("AUTH_CFG", _.get(window.OPENSHIFT_CONFIG, "auth", {}))
    .config(['$locationProvider', function($locationProvider) {

        $locationProvider.html5Mode(true);

    }])
/*    .config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/clusters/:Id?',
            {
                templateUrl: function(params) {
                    if(!params['Id'])
                        return 'partials/clusters.html';
                    else
                        return 'partials/cluster-detail.html';
                },
                controller: 'ClusterCtrl',
                activetab: 'clusters'
            });
        $routeProvider.when('/login',
            {
                templateUrl: 'partials/bkp_login.html',
                controller: 'LoginController',
                activetab: ''
            });
        $routeProvider.otherwise({redirectTo: '/clusters'});
    }])*/
    .config(['$routeProvider', '$locationProvider',function ($routeProvider, $locationProvider) {
        $locationProvider.html5Mode({
            enabled: true,
        });
        $routeProvider
            .when('/clusters/:Id?',
            {
                templateUrl: function(params) {
                    if(!params['Id'])
                        return 'views/clusters.html';
                    else
                        return 'views/cluster-detail.html';
                },
                controller: 'ClusterCtrl',
                activetab: 'clusters'
            })
            // .when('/login',
            // {
            //     templateUrl: 'partials/bkp_login.html',
            //     controller: 'LoginController',
            //     activetab: ''
            // })
            // .when('/', {
            //     templateUrl: function(params) {
            //         return 'views/main.html';
            //     },
            //     controller: 'MainCtrl'
            // })
            // .when('/about', {
            //   templateUrl: 'views/about.html',
            //   controller: 'AboutCtrl'
            // })
            // .when('/login', {
            //   controller: 'LoginController',
            //   templateUrl: function(params) {
            //     return 'views/login.view.html';
            //   },
            //   controllerAs: 'vm'
            // })
            .when('/logout', {
                templateUrl: function(params) {
                    return 'views/logout.html';
                },
                controller: 'LogoutController'
            })
            .when('/oauth', {
                templateUrl: function(params) {
                    return 'views/oauth.html';
                },
                controller: 'OAuthController'
            })
            .otherwise({
                redirectTo: '/clusters'
            });

    }])
    // .provider("EnvConfig", function() {
    //     var envConfig = {};
    //
    //     this.loadConfig = function($http) {
    //         return $http.get('/Users/subin/development/origin/subin/config.json')
    //             .success(function (data) {
    //                 angular.extend(envConfig, data);
    //             })
    //             .error(function (data, status, header, config) {
    //                 angular.extend(envConfig, data);
    //             });
    //         // var q = jQuery.ajax({
    //         //     type: 'GET', url: '/Users/subin/development/origin/subin/config.json', cache: false, async: false,
    //         //     contentType: 'application/json', dataType: 'json'
    //         // });
    //         // if (q.status === 200) {
    //         //     angular.extend(envConfig, angular.fromJson(q.responseText));
    //         // }
    //         // return envConfig;
    //     };
    //     this.$get = [ this.loadConfig ];
    // })
    .config(function($httpProvider, AuthServiceProvider, RedirectLoginServiceProvider, AUTH_CFG, API_CFG) {
        $httpProvider.interceptors.push('AuthInterceptor');

        AuthServiceProvider.LoginService('RedirectLoginService');
        AuthServiceProvider.LogoutService('DeleteTokenLogoutService');
        // TODO: fall back to cookie store when localStorage is unavailable (see known issues at http://caniuse.com/#feat=namevalue-storage)
        AuthServiceProvider.UserStore('LocalStorageUserStore');
        //console.log(EnvConfigProvider.loadConfig());
        RedirectLoginServiceProvider.OAuthClientID(AUTH_CFG.oauth_client_id);
        RedirectLoginServiceProvider.OAuthAuthorizeURI(AUTH_CFG.oauth_authorize_uri);
        console.log(AUTH_CFG.oauth_redirect_base);
        RedirectLoginServiceProvider.OAuthRedirectURI(URI(AUTH_CFG.oauth_redirect_base).segment("oauth").toString());


        // Configure the container terminal
        //kubernetesContainerSocketProvider.WebSocketFactory = "ContainerWebSocket";
    })
    .config(function($compileProvider){
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|git):/i);
    })
    // .run(function run($rootScope, $location, $cookieStore, $http) {
    //   // keep user logged in after page refresh
    //   $rootScope.globals = $cookieStore.get('globals') || {};
    //   if ($rootScope.globals.currentUser) {
    //     $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata; // jshint ignore:line
    //   }
    //
    //   $rootScope.$on('$locationChangeStart', function (event, next, current) {
    //     // redirect to login page if not logged in and trying to access a restricted page
    //     var restrictedPage = $.inArray($location.path(), ['/login', '/register']) === -1;
    //     var loggedIn = $rootScope.globals.currentUser;
    //     if (restrictedPage && !loggedIn) {
    //       $location.path('/login');
    //     }
    //   });
    // });
    .run(function($rootScope, LabelFilter){
        $rootScope.$on('$locationChangeSuccess', function(event) {
            LabelFilter.setLabelSelector(new LabelSelector({}, true), true);
        });
    })
    .run(function(dateRelativeFilter, durationFilter, timeOnlyDurationFromTimestampsFilter) {
        // Use setInterval instead of $interval because we're directly manipulating the DOM and don't want scope.$apply overhead
        setInterval(function() {
            // Set by relative-timestamp directive.
            $('.timestamp[data-timestamp]').text(function(i, existing) {
                return dateRelativeFilter($(this).attr("data-timestamp"), $(this).attr("data-drop-suffix")) || existing;
            });
        }, 30 * 1000);
        setInterval(function() {
            // Set by duration-until-now directive.
            $('.duration[data-timestamp]').text(function(i, existing) {
                var timestamp = $(this).data("timestamp");
                var omitSingle = $(this).data("omit-single");
                var precision = $(this).data("precision");
                var timeOnly  = $(this).data("time-only");
                if (timeOnly) {
                    return timeOnlyDurationFromTimestampsFilter(timestamp, null) || existing;
                }
                else {
                    return durationFilter(timestamp, null, omitSingle, precision) || existing;
                }
            });
        }, 1000);
    })
    .run(['$rootScope', '$http', function ($rootScope, $http) {
        // $http.get('/oshinko-rest-location').success(function(response) {
        //     $rootScope.oshinko_rest_location = response;
        // });
    }]);
    //.run(['$rootScope', '$location', 'ipCookie', '$http',
        // function ($rootScope, $location, ipCookie, $http) {
        //     //$rootScope.globals = $cookies.getObject('oshinkookie') || {};
        //     $rootScope.globals = ipCookie('oshinkookie') || {};
        //     if ($rootScope.globals.currentUser) {
        //         $http.defaults.headers.common['Authorization'] = 'Basic ' + $rootScope.globals.currentUser.authdata;
        //     }
        //
        //     $rootScope.$on('$locationChangeStart', function (event, next, current) {
        //         // // redirect to login page if not logged in
        //         // // if ($location.path() !== '/login' && !$cookies.getObject('oshinkookie')) {
        //         if ($location.path() !== '/login' && !ipCookie('oshinkookie')) {
        //             $location.path('/login');
        //         }
        //     });
    //    }]);


hawtioPluginLoader.addModule('Oshinko');

// API Discovery, this runs before the angular app is bootstrapped
// TODO we want this to be possible with a single request against the API instead of being dependent on the numbers of groups and versions
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
            api.k8s.v1 = _.indexBy(data.resources, 'name');
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
            api.openshift.v1 = _.indexBy(data.resources, 'name');
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
    var apisDeferred = $.get(apisBaseURL)
        .then(function(data) {
            var apisDeferredVersions = [];
            _.each(data.groups, function(apiGroup) {
                var group = {
                    name: apiGroup.name,
                    preferredVersion: apiGroup.preferredVersion.version,
                    versions: {}
                };
                apis[group.name] = group;
                _.each(apiGroup.versions, function(apiVersion) {
                    var versionStr = apiVersion.version;
                    group.versions[versionStr] = {
                        version: versionStr,
                        groupVersion: apiVersion.groupVersion
                    };
                    apisDeferredVersions.push($.get(apisBaseURL + "/" + apiVersion.groupVersion)
                        .done(function(data) {
                            group.versions[versionStr].resources = _.indexBy(data.resources, 'name');
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
        }, function(data, textStatus, jqXHR) {
            API_DISCOVERY_ERRORS.push({
                data: data,
                textStatus: textStatus,
                xhr: jqXHR
            });
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
    $.when(k8sDeferred,osDeferred,apisDeferred).always(discoveryFinished);
});

