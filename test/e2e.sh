#!/bin/bash

TOP_DIR=$(readlink -f `dirname "${BASH_SOURCE[0]}"` | grep -o '.*/oshinko-webui')
PROJECT=$(oc project -q)

WEBUI_START_XVFB=${WEBUI_START_XVFB:-true}
WEBUI_TEST_IMAGE=${WEBUI_TEST_IMAGE:-}
WEBUI_TEST_SECURE=${WEBUI_TEST_SECURE:-false}
WEBUI_TEST_LOCAL_IMAGE=${WEBUI_TEST_LOCAL_IMAGE:-true}

# If you're doing a test of the secure webui, default user/pass is "developer/developerpass"
# If you need to change it you can set these
WEBUI_TEST_SECURE_USER=${WEBUI_TEST_SECURE_USER:-}
WEBUI_TEST_SECURE_PASSWORD=${WEBUI_TEST_SECURE_PASSWORD:-}

# This is all for dealing with registries. External registry requires creds other than the current login
WEBUI_TEST_INTEGRATED_REGISTRY=${WEBUI_TEST_INTEGRATED_REGISTRY:-}
WEBUI_TEST_EXTERNAL_REGISTRY=${WEBUI_TEST_EXTERNAL_REGISTRY:-}
WEBUI_TEST_EXTERNAL_USER=${WEBUI_TEST_EXTERNAL_USER:-}
WEBUI_TEST_EXTERNAL_PASSWORD=${WEBUI_TEST_EXTERNAL_PASSWORD:-}

WEBUI_TEST_RESOURCES=${WEBUI_TEST_RESOURCES:-$TOP_DIR/tools/resources.yaml}
if [ -z "$WEBUI_TEST_IMAGE" ]; then
    if [ "$WEBUI_TEST_LOCAL_IMAGE" == true ]; then
        WEBUI_TEST_IMAGE=oshinko-webui:latest
    else
        WEBUI_TEST_IMAGE=docker.io/radanalyticsio/oshinko-webui
    fi
fi

function print_test_env {
    echo Using image $WEBUI_TEST_IMAGE
    echo Using resources.yaml from $WEBUI_TEST_RESOURCES

    if [ "$WEBUI_TEST_LOCAL_IMAGE" != true ]; then
	echo WEBUI_TEST_LOCAL_IMAGE = $WEBUI_TEST_LOCAL_IMAGE, webui image is external, ignoring registry env vars
    elif [ -n "$WEBUI_TEST_EXTERNAL_REGISTRY" ]; then
        echo Using external registry $WEBUI_TEST_EXTERNAL_REGISTRY
        if [ -z "$WEBUI_TEST_EXTERNAL_USER" ]; then
            echo "Error: WEBUI_TEST_EXTERNAL_USER not set!"
	    exit 1
        else
	    echo Using external registry user $WEBUI_TEST_EXTERNAL_USER
        fi
        if [ -z "$WEBUI_TEST_EXTERNAL_PASSWORD" ]; then
            echo "WEBUI_TEST_EXTERNAL_PASSWORD not set, assuming current docker login"
        else
            echo External registry password set
        fi
    elif [ -n "$WEBUI_TEST_INTEGRATED_REGISTRY" ]; then
        echo Using integrated registry $WEBUI_TEST_INTEGRATED_REGISTRY
    else
        echo Not using external or integrated registry
    fi
    echo Start xvfb = $WEBUI_START_XVFB
    echo Using secure oshinko webui $WEBUI_TEST_SECURE
    if [ "$WEBUI_TEST_SECURE" == true ]; then
        if [ -n "$WEBUI_TEST_SECURE_USER" ]; then
            echo Using oshinko webui secure user $WEBUI_TEST_SECURE_USER
        else
            echo Using default oshinko webui secure user set in conf.js
        fi
        if [ -n "$WEBUI_TEST_SECURE_PASSWORD" ]; then
            echo Oshinko webui secure password has been set
        else
            echo Using default oshinko webui secure password set in conf.js
        fi
    fi
}

function push_image {
    # The ip address of an internal/external registry may be set to support running against
    # an openshift that is not "oc cluster up" when using images that have been built locally.
    # In the case of "oc cluster up", the docker on the host is available from openshift so
    # no special pushes of images have to be done.
    # In the case of a "normal" openshift cluster, a local image we'll use for build has to be
    # available from the designated registry.
    # If we're using an image already in an external registry, openshift can pull it from
    # there and we don't have to do anything.
    local user=
    local password=
    local pushproj=
    local pushimage=
    local registry=
    if [ "$WEBUI_TEST_LOCAL_IMAGE" == true ]; then
	if [ -n  "$WEBUI_TEST_EXTERNAL_REGISTRY" ]; then
	    user=$WEBUI_TEST_EXTERNAL_USER
	    password=$WEBUI_TEST_EXTERNAL_PASSWORD
	    pushproj=$user
	    pushimage=scratch-oshinko-webui
	    registry=$WEBUI_TEST_EXTERNAL_REGISTRY
	elif [ -n "$WEBUI_TEST_INTEGRATED_REGISTRY" ]; then
	    user=$(oc whoami)
	    password=$(oc whoami -t)
	    pushproj=$PROJECT
	    pushimage=oshinko-webui
	    registry=$WEBUI_TEST_INTEGRATED_REGISTRY
	fi
    fi
    if [ -n "$registry" ]; then
	set +e
	docker login --help | grep email &> /dev/null
	res=$?
	set -e
	if [ -n "$password" ] && [ -n "$user" ]; then
	    if [ "$res" -eq 0 ]; then
		docker login -u ${user} -e jack@jack.com -p ${password} ${registry}
	    else
		docker login -u ${user} -p ${password} ${registry}
	    fi
	fi
	docker tag ${WEBUI_TEST_IMAGE} ${registry}/${pushproj}/${pushimage}
	docker push ${registry}/${pushproj}/${pushimage}
	OSHINKO_WEB_IMAGE=${registry}/${pushproj}/${pushimage}
    else
	OSHINKO_WEB_IMAGE=$WEBUI_TEST_IMAGE
    fi
}

function tweak_template {
    if [ "$WEBUI_TEST_LOCAL_IMAGE" == true ] && [ -z "$WEBUI_TEST_INTEGRATED_REGISTRY" ] && [ -z "$WEBUI_TEST_EXTERNAL_REGISTRY" ]; then
	echo Updating $WEBUI_TEST_RESOURCES to pull local webui image
	mkdir -p `pwd`/test/scratch/
        if [ -f "$WEBUI_TEST_RESOURCES" ]; then
            cp "$WEBUI_TEST_RESOURCES" `pwd`/test/scratch/resources_mod.yaml
        else
            wget "$WEBUI_TEST_RESOURCES" -O `pwd`/test/scratch/resources_mod.yaml
        fi
        # This sed command finds the line with image: ${OSHINKO_WEB_IMAGE}
        # The next line sets the pull policy in the standard template (this should be maintained)
        # !b;n;s throws away the current processing, reads the next line, and starts a new substitution
        # Ultimately, this sets the pull policy for the web image to IfNotPresent so that an 'oc cluster up'
        # case can just reference the image from the host
        sed -i -r '/image.*OSHINKO_WEB_IMAGE/!b;n;s/(.*imagePullPolicy: *)Always/\1IfNotPresent/' `pwd`/test/scratch/resources_mod.yaml
        WEBUI_TEST_RESOURCES=`pwd`/test/scratch/resources_mod.yaml
    fi
}

function try_until_success {
    # This is a really simple case that just tests for success.
    # If more complicated waits are needed, we can use the oc commandline testsuite
    echo $1
    while true; do
        set +e
        eval $1
        res=$?
        set -e
        if [ "$res" = 0 ]; then
            break
        fi
        sleep 20s
    done
}

function create_resources {
    set +e
    oc create -f $WEBUI_TEST_RESOURCES
    if [ "$WEBUI_TEST_SECURE" == true ]; then
        oc new-app --template=oshinko-webui-secure -p OSHINKO_WEB_IMAGE=$OSHINKO_WEB_IMAGE
    else
        oc new-app --template=oshinko-webui -p OSHINKO_WEB_IMAGE=$OSHINKO_WEB_IMAGE
    fi
    oc create configmap storedconfig --from-literal=mastercount=1 --from-literal=workercount=4
    set -e
}

function wait_for_webui {
    local command=

    try_until_success "oc get pods -l app=oshinko-webui"
    IMAGETESTED=$(oc get pods -l app=oshinko-webui --template="{{range .items}}{{range .spec.containers}}{{.image}}{{end}}{{end}}")
    echo "Testing image $IMAGETESTED"

    if [ "$WEBUI_TEST_SECURE" == true ]; then
        TESTROUTE=$(oc get route oshinko-web-oaproxy --template='{{.spec.host}}')
        command="wget --no-check-certificate https://$TESTROUTE/proxy/api"
    else
        TESTROUTE=$(oc get route oshinko-web --template='{{.spec.host}}')
        command="wget http://$TESTROUTE/proxy/api"
    fi
    echo "Waiting for proxy to come up"
    try_until_success "$command"
    cat api && rm api

    echo "Make sure that webui is up"
    if [ "$WEBUI_TEST_SECURE" == true ]; then
        command="curl --insecure https://$TESTROUTE/webui"
    else
        command="curl http://$TESTROUTE/webui"
    fi
    try_until_success "$command"
}

function dump_env {
    echo "Other environment details"
    echo "ENVIRONMENT IS:"
    env
    echo "ROUTES"
    oc get routes
    echo "SERVICES"
    oc get services
}

function check_for_xvfb {
    if [ "$WEBUI_START_XVFB" == true ]; then
        if ! [ -f /tmp/.X99-lock ]; then
            echo Starting xvfb
            Xvfb -ac :99 -screen 0 1280x1024x16  &
        else
            echo xvfb is already running
        fi
        export DISPLAY=:99
    fi
}

orig_project=$(oc project -q)

# Create the project here
proj_name_prefix="webui"
set +e # For some reason the result here from head is not 0 even though we get the desired result
namespace=${proj_name_prefix}-$(date -Ins | md5sum | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)
set -e
oc new-project $namespace &> /dev/null
echo Using project $namespace


# Modify the template if we're using a local image with no registry, i.e. we're in an oc cluster up case
# In this case we don't need a push at all, but we need to have a pullpolicy of IfNotPresent
print_test_env
check_for_xvfb
tweak_template
push_image
create_resources
wait_for_webui
dump_env

echo "Running integration tests via protracor"
echo "Protractor version is:"
protractor --version
if [ "$WEBUI_TEST_SECURE" == true ]; then
    user=""
    password=""
    if [ -n "$WEBUI_TEST_SECURE_USER" ]; then
        name="--params.securelogin.name=$WEBUI_TEST_SECURE_USER "
    fi
    if [ -n "$WEBUI_TEST_SECURE_PASSWORD" ]; then
        passw="--params.securelogin.password=$WEBUI_TEST_SECURE_PASSWORD "
    fi
    protractor test/conf.js $name$passw --baseUrl="https://$TESTROUTE/webui" --specs=test/spec/all-functionality.js
else
    protractor test/conf.js --baseUrl="http://$TESTROUTE/webui" --specs=test/spec/all-functionality-insecure.js
fi

# Cleanup
oc project $orig_project
oc delete project $namespace