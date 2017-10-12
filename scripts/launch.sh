#!/bin/bash

if [ -z "$SPARK_DEFAULT" ]; then
    SPARK_DEFAULT=radanalyticsio/openshift-spark
fi
export SPARK_DEFAULT

# Set the text label on advanced cluster create
sed -i "s@SPARK_DEFAULT@$SPARK_DEFAULT@" app/forms/new-cluster.html
sed -i "s@SPARK_DEFAULT@$SPARK_DEFAULT@" app/js/controllers.js

export OSHINKO_PROXY_LOCATION=`/usr/src/app/oc get routes $WEB_ROUTE_NAME --template={{.spec.host}}`
echo "The oshinko proxy location is $OSHINKO_PROXY_LOCATION"
sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" /usr/src/app/app/config.local.js
/usr/src/app/oc expose service $WEB_ROUTE_NAME-proxy --path=/proxy --hostname=$OSHINKO_PROXY_LOCATION

npm start
