#!/bin/bash

TOP_DIR=$(readlink -f `dirname "${BASH_SOURCE[0]}"` | grep -o '.*/oshinko-webui')
PROJECT=$(oc project -q)

WEBUI_TEST_SECURE=${WEBUI_TEST_SECURE:-false}
WEBUI_TEST_LOCAL_IMAGE=${WEBUI_TEST_LOCAL_IMAGE:-true}
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
}

function push_image {
    # The ip address of an internal/external registry may be set to support running against
    # an openshift that is not "oc cluster up" when using images that have been built locally.
    # In the case of "oc cluster up", the docker on the host is available from openshift so
    # no special pushes of images have to be done.
    # In the case of a "normal" openshift cluster, a local image we'll use for build has to be
    # available from the designated registry.
    # If we're using a pyspark image already in an external registry, openshift can pull it from
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
	if [ -n "$password" ]; then
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
        if [ -f "$WEBUI_TEST_RESOURCES" ]; then
            cp "$WEBUI_TEST_RESOURCES" `pwd`/resources_mod.yaml
        else
            wget "$WEBUI_TEST_RESOURCES" -O `pwd`/resources_mod.yaml	     
        fi
        # This sed command finds the line with image: ${OSHINKO_WEB_IMAGE}
        # The next line sets the pull policy in the standard template (this should be maintained)
        # !b;n;s throws away the current processing, reads the next line, and starts a new substitution
        # Ultimately, this sets the pull policy for the web image to IfNotPresent so that an 'oc cluster up'
        # case can just reference the image from the host
        sed -i -r '/image.*OSHINKO_WEB_IMAGE/!b;n;s/(.*imagePullPolicy: *)Always/\1IfNotPresent/' resources_mod.yaml
        WEBUI_TEST_RESOURCES=`pwd`/resources_mod.yaml
    fi
}

# Modify the template if we're using a local image with no registry, i.e. we're in an oc cluster up case
# In this case we don't need a push at all, but we to have a pullpolicy of IfNotPresent
tweak_template
print_test_env
# Push the image if required
push_image

set +e
oc create -f $WEBUI_TEST_RESOURCES
oc policy add-role-to-user admin system:serviceaccount:$PROJECT:oshinko
if [ "$WEBUI_TEST_SECURE" == true ]; then
    oc new-app --template=oshinko-webui-secure -p OSHINKO_WEB_IMAGE=$OSHINKO_WEB_IMAGE
else
    oc new-app --template=oshinko-webui -p OSHINKO_WEB_IMAGE=$OSHINKO_WEB_IMAGE
fi
oc create configmap storedconfig --from-literal=mastercount=1 --from-literal=workercount=4
set -e
