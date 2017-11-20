[![Build status](https://travis-ci.org/radanalyticsio/oshinko-webui.svg?branch=master)](https://travis-ci.org/radanalyticsio/oshinko-webui)
[![Docker build](https://img.shields.io/docker/automated/radanalyticsio/oshinko-webui.svg)](https://hub.docker.com/r/radanalyticsio/oshinko-webui)

# oshinko-webui

This project provides a solution for deploying and managing Apache Spark
clusters in an OpenShift environment. The oshinko-webui is deployed into a
project within OpenShift, and then can create, update, and destroy Apache
Spark clusters in that project. Once installed, it consists of a Node.JS
application that is contained within a Pod and provides a web browser based
user interface for controlling the lifecycle of Spark clusters.

## Installation

In general, there are two main audiences for a discussion of installing the
oshinko-webui: users and developers. If you are interested in running as a
user, or to test drive the application, please see the
[Step-by-step quickstart](https://github.com/radanalyticsio/oshinko-webui#step-by-step-quickstart)
instructions. If you would like to get started hacking on oshinko-webui please
see the
[Developer instructions](https://github.com/radanalyticsio/oshinko-webui#running-the-app-during-development)
section.

### Step-by-step quickstart

These instructions assume that you have access to an OpenShift cluster and
the `oc` command line tool. Although these instructions will help you to
install the oshinko-webui into your OpenShift project, it is possible in
some circumstances that you will not have enough privileges to run the
installation. In the event that you are unable to create the necessary
components to install the application, please consult with your OpenShift
administrator.

Before performing the following instructions, you must be logged in to
your account and project using the `oc` tool.

**Step 1. Create a service account**

For oshinko-webui to interact with OpenShift and control the Spark resources
you will create, it needs a service account in your project. To create this
account, run the following command:

    $ oc create sa oshinko

**Step 2. Add edit privileges to service account**

That service account will need to have edit privilages in your project. This
command will allow the service account to make the necessary requests to
OpenShift:

    $ oc policy add-role-to-user edit -z oshinko

**Step 3. Install oshinko-webui**

With the service account properly configured, you can now install and run
the oshinko-webui application from within a pod in your project. The
`oc new-app` command is used to deploy the application from a template which
defines the necessary OpenShift objects.

There is one choice to make when deploying oshinko-webui, and it will define
how you access the browser interface. Please choose ONE of the following
options:

**Option 1. Expose a route**

This option will expose a named route through the OpenShift edge router to
allow for domain name association with a Kubernetes service. Please keep in
mind that you should only do this for routes that you can limit access to as
this will create a public route to your oshinko-webui. If you want to run the
app with an exposed route, run the following:

    $ oc new-app -f https://raw.githubusercontent.com/radanalyticsio/oshinko-webui/master/tools/ui-template.yaml

To confirm that oshinko-webui is being deployed into your project, you can
check the OpenShift status to inspect the state of the pod. To check
the status run `oc status` and inspect the output, it should appear similar
to the following:

    $ oc status
    In project oshinko on server https://10.0.1.109:8443

    http://oshinko-web-oshinko.10.0.1.109.xip.io (svc/oshinko-web)
      dc/oshinko deploys docker.io/radanalyticsio/oshinko-webui:latest
          deployment #1 deployed 16 seconds ago - 1 pod


The default route is:  `http://oshinko-web-<projectname>.<hostIp>.xip.io` and
that is where you will be able to access the oshinko-webui browser interface.

**Option 2. Use a custom port-forward**

Or, if you'd prefer to not expose a route, you can run the app and then set
up a port-forward to allow you to access the app. To install oshinko-webui
without an exposed route, run the following:

    $ oc new-app -f https://raw.githubusercontent.com/radanalyticsio/oshinko-webui/master/tools/ui-template-no-route.yaml

To create the port-forward, you will need to know the name of the pod where
oshinko-webui is running, this line will give you the pod name:

    $ oc get pods -o jsonpath --selector='name=oshinko-web' --no-headers  --template='{.items[*].metadata.name}'

Use the output from the above line as the pod name in the following line.
The listen port can be any open port on your machine. 8080 is the port
where oshinko-webui is listening in the pod.

    $ oc port-forward <pod name> <listen port>:8080

You can then access the oshinko-webui browser interface at
http://localhost:<listen port>

## Developer instructions

If you are interested in developing the code for oshinko-webui or hacking on
its internals, the following instructions will help you to deploy, run, and
test the code.

Before getting started you will need to have access to an OpenShift cluster,
the `oc` command line application, and the
[oshinko-cli](https://github.com/radanalyticsio/oshinko-cli) command line
application.

### Running the app during development

You'll need to have a node environment installed (developed using NodeJS v6.3.1).
You might prefer to use nvm (https://github.com/creationix/nvm)
to manage your node environment.
Once that is set up, you can run the following:

    $ npm install
    $ npm install -g bower
    $ bower install

Now you're ready to run the oshinko-webui server.

Note, a working local "oc" binary is expected.
To run locally, you'll need a proxy to the api server running.
The following will run a basic proxy, see oc proxy --help if you require
something more specific.

    $ oc proxy --disable-filter=true --api-prefix=/proxy &

Edit the exports in scripts/launch-local.sh to match your environment.

Change to the scripts directory and run

    $ ./launch-local.sh
     

You can pick one of these options:

* install node.js and run `node server.js`

Then navigate your browser to `http://localhost:<port>` to see the app running in
your browser.


### Running unit tests
To run the unit tests:

    $ npm install -g karma-cli
    $ karma start test/karma.conf.js


### End to end testing

The end to end tests can be run using the `test/e2e.sh` script.
This script assumes a current login to an OpenShift instance
and it runs the test in the current project (it's recommended
to create a fresh project for the test run). It also assumes
that the local oshinko-webui repository has been setup (ie all
the dependencies have been installed and the webui components
have been installed with `npm` and `bower` as noted above).

The `test/e2e.sh` script will create a serviceaccount,
templates, a configmap, etc in the current project as part
of the test.

```sh
$ oc new-project mywebuitest
$ test/e2e.sh
```

There are several enviroment variables that you can set
to configure the tests:

``WEBUI_START_XVFB`` (default is true)

  This causes the test to start an Xvfb server running
  for display 99 if it's not already running (required).

``WEBUI_TEST_IMAGE`` (default is oshinko-webui:latest if WEBUI_TEST_LOCAL_IMAGE is true or docker.io/radanalyticsio/oshinko-webui otherwise)

  The image to use for testing. The defaults are set up to
  reference an image from the local docker host (ie, one that has just been
  built) but this setting can be used to reference an image from an arbitrary
  docker registry.

``WEBUI_TEST_LOCAL_IMAGE`` (default is true)

  This indicates that the s2i images to be tested are local, that is they
  are available from the local docker daemon but not in an external registry
  like docker hub.

  If this is set to "false", the test image is assumed to be in an external
  registy. **WEBUI_TEST_INTEGRATED_REGISTRY** and **WEBUI_TEST_EXTERNAL_REGISTRY**
  will be ignored because there will be no need to push local images to
  a registry.

``WEBUI_TEST_INTEGRATED_REGISTRY``

  This is the IP address of the integrated registry. Use this setting when:
  * running the test using local images
  * running the test on a host where the integrated registry is reachable (like the OpenShift master)
  * using an OpenShift instance that was not created with `oc cluster up`

```sh
$ WEBUI_TEST_INTEGRATED_REGISTRY=172.123.456.89:5000 test/e2e.sh
```

``WEBUI_TEST_EXTERNAL_REGISTRY``

  This is the IP address of a docker registry. If this is set then
  **WEBUI_TEST_EXTERNAL_USER** and **WEBUI_TEST_EXTERNAL_PASSWORD** must also
  be set so that the tests can log in to the registry.
  Use this setting when:
  * running the test using local images
  * running the test from a host where the integrated registry is not reachable
  * using an OpenShift instance that was not created with `oc cluster up`

``WEBUI_TEST_SECURE`` (default is false)

  Use the template for a secure webui. If this is set to true
  and the OpenShift instance was not created with `oc cluster up`,
  then **WEBUI_TEST_SECURE_USER** and **WEBUI_TEST_SECURE_PASSWORD**
  should be used to set login credentials for the webui.

``WEBUI_TEST_SECURE_USER`` (default is "developer")

  Username to use for a secure webui test

``WEBUI_TEST_SECURE_PASSWORD`` (default is "deverloperpass")

  Password to use for a secure webui test

``WEBUI_TEST_RESOURCES`` (default is local tools/resources.yaml)

  The resources.yaml file used to set up test resources. The value
  may be a file path, or it may be a url such as
  https://radanalytics.io/resources.yaml.

### Dependencies for end to end tests

The end to end tests require a number of dependencies.
The `test/e2e-setup.sh` script has been provided to install
the dependencies and setup an oshinko-webui repository
for testing. This is especially helpful when setting up
a clean machine.

Note, `test/e2e-setup.sh` assumes passwordless sudo.

You can look through the script and see what it installs
and make sure those things are installed yourself or you
can do this:

```bash
$ test/e2e-setup.sh  # from the oshinko-webui main directory
```

The script should be idempotent.
