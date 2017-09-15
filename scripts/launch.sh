#!/bin/bash
export OSHINKO_SA_TOKEN=`cat /var/run/secrets/kubernetes.io/serviceaccount/token`
export OSHINKO_PROXY_LOCATION=`/usr/src/app/oc get routes $WEB_ROUTE_NAME --template={{.spec.host}}`
echo "The oshinko proxy location is $OSHINKO_PROXY_LOCATION"
sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" /usr/src/app/app/config.local.js
/usr/src/app/oc expose service oc-proxy-service --path=/proxy --hostname=$OSHINKO_PROXY_LOCATION -l app=oshinko-proxy
npm start
