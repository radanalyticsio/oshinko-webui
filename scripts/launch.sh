#!/bin/bash
# Parse the spark default image from the oshinko CLI version info
# For a version of oshinko-web that doesn't use the CLI, the value would just be set here
SPARK_DEFAULT=$($(dirname $0)/oshinko version | sed -rn 's/Default spark image:\s(.*)/\1/p')
if [ -z "$SPARK_DEFAULT" ]; then
    SPARK_DEFAULT=radanalyticsio/openshift-spark
fi
export SPARK_DEFAULT

# Set the text label on advanced cluster create
sed -i "s@SPARK_DEFAULT@$SPARK_DEFAULT@" app/forms/new-cluster.html

export OSHINKO_PROXY_LOCATION=`/usr/src/app/oc get routes $WEB_ROUTE_NAME --template={{.spec.host}}`
echo "The oshinko proxy location is $OSHINKO_PROXY_LOCATION"
sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" /usr/src/app/app/config.local.js
/usr/src/app/oc expose service oc-proxy-service --path=/proxy --hostname=$OSHINKO_PROXY_LOCATION

npm start