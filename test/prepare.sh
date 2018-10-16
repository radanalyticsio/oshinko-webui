#!/bin/bash

function prepare() {
  ip addr show eth0
  export HOST_IP_ADDRESS="$(ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1)"
  echo "Host IP is $HOST_IP_ADDRESS"
  IMAGEFOROC="quay.io/openshift/origin-cli:$OPENSHIFT_VERSION"
  if [ "$OPENSHIFT_VERSION" == "v3.10" ]; then
      IMAGEFOROC="docker.io/openshift/origin:$OPENSHIFT_VERSION"
  fi
  sudo docker cp $(docker create $IMAGEFOROC):/bin/oc /usr/local/bin/oc
  oc cluster up --public-hostname=$HOST_IP_ADDRESS
  oc login -u system:admin
  export REGISTRY_URL=$(oc get svc -n default docker-registry -o jsonpath='{.spec.clusterIP}:{.spec.ports[0].port}')
  oc login -u developer -p developer
  docker pull radanalyticsio/openshift-spark:2.3-latest
}

prepare
