'use strict';

(function() {
  // This is the template configuration for the webui
  // A generated version of this config is created at run-time when running
  // from the oshinko-webui template.  To run locally, you should edit
  // this file replacing all <VALUES> with an appropriate value.
  var proxyHost = <PROXY>;
  window.OPENSHIFT_CONFIG = {
    apis: {
      hostPort: proxyHost,
      prefix: "/proxy/apis"
    },
    api: {
      openshift: {
        hostPort: proxyHost,
        prefix: "/proxy/oapi"
      },
      k8s: {
        hostPort: proxyHost,
        prefix: "/proxy/api"
      }
    }
  };

  window.__env = {};
  window.__env.oc_proxy_location = proxyHost;
  window.__env.namespace = <NAMESPACE>;
  window.__env.refresh_interval = <REFRESH_INTERVAL>;
  window.__env.spark_image = <SPARK_IMAGE>;

})();
