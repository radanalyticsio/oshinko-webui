// This is the default configuration for the dev mode of the web console.
// A generated version of this config is created at run-time when running
// the web console from the openshift binary.
//
// To change configuration for local development, copy this file to
// assets/app/config.local.js and edit the copy.
window.OPENSHIFT_CONFIG = {
    apis: {
        hostPort: "192.168.0.100:8443",
        prefix: "/apis"
    },
    api: {
        openshift: {
            hostPort: "192.168.0.100:8443",
            prefix: "/oapi"
        },
        k8s: {
            hostPort: "192.168.0.100:8443",
            prefix: "/api"
        }
    },
    auth: {
        oauth_authorize_uri: "https://192.168.0.100:8443/oauth/authorize",
        oauth_redirect_base: "https://192.168.0.100:9000",
        oauth_client_id: "oshinko-oauth-client",
        logout_uri: ""
    },
    loggingURL: "",
    metricsURL: ""
};
window.OSHINKO_CONFIG = {
    oshinko: {
        restPort: "192.168.0.100"
    }
};
window.OPENSHIFT_VERSION = {
    openshift: "dev-mode",
    kubernetes: "dev-mode"
};