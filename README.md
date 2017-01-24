[![Build status](https://travis-ci.org/radanalyticsio/oshinko-webui.svg?branch=master)](https://travis-ci.org/radanalyticsio/oshinko-webui)
[![Docker build](https://img.shields.io/docker/automated/radanalyticsio/oshinko-webui.svg)](https://hub.docker.com/r/radanalyticsio/oshinko-webui)

### Running the app during development

You'll need to have a node environment installed (developed using NodeJS v6.3.1).
You might prefer to use nvm (https://github.com/creationix/nvm)
to manage your node environment.
Once that is set up, you can run the following:

    npm install
    npm install -g bower
    bower install

Now you're ready to run the oshinko-webui server.

Set the following environment variables:

    OPENSHIFT_NODEJS_PORT=<port for the webui server to listen on, default is 8080>    
    OSHINKO_WEB_DEBUG=<true to get extra log entries, false by default> 
    OSHINKO_CLI_LOCATION=<path to oshinko-cli, default is /usr/src/app/oshinko-cli>
    OSHINKO_SA_TOKEN=<token for oshinko serviceaccount, enpty by default>
    KUBERNETES_CERT=<path to ca.crt file, /var/run/secrets/kubernetes.io/serviceaccount/ca.crt by default>
    KUBERNETES_SERVICE_HOST=<hostname of kubernetes service, default is kubernetes.default>
    KUBERNETES_SERVICE_PORT=<port where the kubernetes service is listening, default is 443>
    USE_INSECURE_CLI=<true if you don't want to use tls validation and don't require ca.crt, false by default>
    OSHINKO_SPARK_IMAGE=<location of spark image that you want to use for your clusters, defaults to CLI default>
    
You can pick one of these options:

* install node.js and run `node server.js`

Then navigate your browser to `http://localhost:<port>` to see the app running in
your browser.


### Deploying the app
In order to use oshinko-webui, you will need a serviceaccount created in your project.

    oc create sa oshinko

That service account will need to have edit privilages in your project.

    oc policy add-role-to-user edit -z oshinko

Choose ONE of the following options:

If you want to run the app with an exposed route, run the following.
Please keep in mind that you should only do this for routes that you can limit access to.

    oc new-app -f tools/ui-template.yaml

The default route is:  http://oshinko-web-<projectname>.<hostIp>.xip.io and that is where
you will be able to access the oshinko-webui app.

Or, if you'd prefer to not expose a route, you can run the app and then set up a port-forward
to allow you to access the app.

This line will give you the name of the pod where oshinko-webui is running

    oc get pods -o jsonpath --selector='name=oshinko-web' --no-headers  --template='{.items[*].metadata.name}'

Use the output from the above line as the pod name in the following line.
The listen port can be any open port on your machine.  8080 is the port
where oshinko-webui is listening in the pod.

    oc port-forward <pod name> <listen port>:8080

You can then access oshinko-webui at http://localhost:<listen port>


### Running unit tests
To run the unit tests:

    npm install -g karma-cli
    karma start test/karma.conf.js


### End to end testing
You'll need protractor installed:

    npm install -g protractor

<optional> Then run:

    webdriver-manager update

You may need to update `test/conf.js` to point to your correct `baseUrl` [default is `http://localhost:8080`] Or, you can pass `--baseUrl=<your baseUrl>` on the protractor command line

    webdriver-manager start

From another terminal window, you can run:

    protractor test/conf.js

### Continuous Integration
