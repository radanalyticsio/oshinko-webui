#!/bin/bash

source /usr/src/app/sparkimage.sh
if [ -z "$SPARK_DEFAULT" ]; then
    SPARK_DEFAULT=$SPARK_IMAGE
fi
export SPARK_DEFAULT

cp /usr/src/app/app/config.template /usr/src/app/app/config.local.js

# Set the text label on advanced cluster create
sed -i "s@SPARK_DEFAULT@$SPARK_DEFAULT@" app/forms/new-cluster.html
sed -i "s@SPARK_DEFAULT@$SPARK_DEFAULT@" app/js/controllers.js
sed -i "s#<NAMESPACE>#'$CURRENT_NAMESPACE'#" /usr/src/app/app/config.local.js
sed -i "s#<REFRESH_INTERVAL>#'$OSHINKO_REFRESH_INTERVAL'#" /usr/src/app/app/config.local.js
sed -i "s#SPARK_DEFAULT#$SPARK_DEFAULT#" /usr/src/app/app/config.local.js
if [ $INSECURE_WEBUI = "true" ]; then
  export OSHINKO_PROXY_LOCATION=`/usr/src/app/oc get routes $WEB_ROUTE_NAME --template={{.spec.host}}`
  echo "The oshinko proxy location is $OSHINKO_PROXY_LOCATION"
  sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" /usr/src/app/app/config.local.js
  /usr/src/app/oc expose service $WEB_ROUTE_NAME-proxy --path=/proxy --hostname=$OSHINKO_PROXY_LOCATION
else
  export OSHINKO_PROXY_LOCATION=`/usr/src/app/oc get routes $WEB_ROUTE_NAME-oaproxy --template={{.spec.host}}`
  echo "The oshinko proxy location is $OSHINKO_PROXY_LOCATION"
  sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" /usr/src/app/app/config.local.js
  /usr/src/app/oc create route edge oc-proxy-route --service=$WEB_ROUTE_NAME-ocproxy --path=/proxy --insecure-policy=Allow --hostname=$OSHINKO_PROXY_LOCATION
fi

npm start
