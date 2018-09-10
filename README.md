[![Build status](https://travis-ci.org/radanalyticsio/oshinko-webui.svg?branch=master)](https://travis-ci.org/radanalyticsio/oshinko-webui)
[![Docker build](https://img.shields.io/docker/automated/radanalyticsio/oshinko-webui.svg)](https://hub.docker.com/r/radanalyticsio/oshinko-webui)
[![Known Vulnerabilities](https://snyk.io/test/github/radanalyticsio/oshinko-webui/badge.svg)](https://snyk.io/test/github/radanalyticsio/oshinko-webui)

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

**Step 1. Create the service account and template**

For oshinko-webui to interact with OpenShift and control the Spark resources
you will create, it needs a service account in your project. The service account
is created with edit permissions along with the oshinko-webui template by issuing
the following command:

    oc create -f https://radanalytics.io/resources.yaml

**Step 2. Run oshinko-webui**

    oc new-app --template=oshinko-webui

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

As a convenience, the *test-e2e* and *test-e2e-secure* make
targets can be used to run the test. These targets will
first create a new OpenShift project with prefix *webui-*,
 build a local image and then run the test with defaults.
For example:

```sh
$ make test-e2e
...
$
$ make test-e2e-secure
...
```

The environment variables below can be set for the call
to make, for example:

```sh
$ WEBUI_START_XVFB=false make test-e2e
```

#### Environment variables for test configuration

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

#### Dependencies for end to end tests

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
