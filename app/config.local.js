'use strict';

(function() {
  // This is the default configuration for the dev mode of the web console.
  // A generated version of this config is created at run-time when running
  // the web console from the openshift binary.
  //
  // To change configuration for local development, copy this file to
  // assets/app/config.local.js and edit the copy.
  var masterPublicHostname = <PROXY>;
  window.OPENSHIFT_CONFIG = {
    apis: {
      hostPort: masterPublicHostname,
      prefix: "/proxy/apis"
    },
    api: {
      openshift: {
        hostPort: masterPublicHostname,
        prefix: "/proxy/oapi"
      },
      k8s: {
        hostPort: masterPublicHostname,
        prefix: "/proxy/api"
      }
    },
    loggingURL: "",
    metricsURL: ""
  };

  window.OPENSHIFT_VERSION = {
    openshift: "dev-mode",
    kubernetes: "dev-mode"
  };

})();
