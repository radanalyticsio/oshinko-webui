(function () {
    'use strict';

//'use strict';

/**
 * @ngdoc function
 * @name openshiftConsole.controller:LogoutController
 * @description
 * # LogoutController
 * Controller of the openshiftConsole
 */
angular.module('Oshinko')
    //angular.module('openshiftConsole')
    .controller('LogoutController', function ($scope, $log, AuthService, AUTH_CFG) {
        $log.debug("LogoutController");

        if (AuthService.isLoggedIn()) {
            $log.debug("LogoutController, logged in, initiating logout");
            $scope.logoutMessage = "Logging out...";

            AuthService.startLogout().finally(function(){
                // Make sure the logout completed
                if (AuthService.isLoggedIn()) {
                    $log.debug("LogoutController, logout failed, still logged in");
                    $scope.logoutMessage = 'You could not be logged out. Return to the <a href="./">console</a>.';
                } else {
                    if (AUTH_CFG.logout_uri) {
                        $log.debug("LogoutController, logout completed, redirecting to AUTH_CFG.logout_uri", AUTH_CFG.logout_uri);
                        window.location.href = AUTH_CFG.logout_uri;
                    } else {
                        $log.debug("LogoutController, logout completed, reloading the page");
                        window.location.reload(false);
                    }
                }
            });
        } else if (AUTH_CFG.logout_uri) {
            $log.debug("LogoutController, logout completed, redirecting to AUTH_CFG.logout_uri", AUTH_CFG.logout_uri);
            $scope.logoutMessage = "Logging out...";
            window.location.href = AUTH_CFG.logout_uri;
        } else {
            $log.debug("LogoutController, not logged in, logout complete");
            $scope.logoutMessage = 'You are logged out. Return to the <a href="./">console</a>.';
        }
    })

    .provider('DeleteTokenLogoutService', function() {

            this.$get = function($q, $injector, Logger) {
                var authLogger = Logger.get("auth");

                return {
                    logout: function(user, token) {
                        authLogger.log("DeleteTokenLogoutService.logout()", user, token);

                        // If we don't have a token, we're done
                        if (!token) {
                            authLogger.log("DeleteTokenLogoutService, no token, returning immediately");
                            return $q.when({});
                        }

                        // Lazily get the data service. Can't explicitly depend on it or we get circular dependencies.
                        var DataService = $injector.get('DataService');
                        // Use the token to delete the token
                        // Never trigger a login when deleting our token
                        var opts = {http: {auth: {token: token, triggerLogin: false}}};
                        // TODO: Change this to return a promise that "succeeds" even if the token delete fails?
                        return DataService.delete("oauthaccesstokens", token, {}, opts);
                    },
                };
            };
        });


})();
