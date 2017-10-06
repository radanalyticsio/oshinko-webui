#!/bin/bash


export CURRENT_NAMESPACE=`oc project -q`
export OSHINKO_REFRESH_INTERVAL=5
export OSHINKO_SPARK_IMAGE='radanalyticsio/openshift-spark:latest'
export OSHINKO_PROXY_LOCATION='127.0.0.1:8001'  #location of oc proxy running

cp ../app/config.template ../app/config.local.js

sed -i "s#<NAMESPACE>#'$CURRENT_NAMESPACE'#" ../app/config.local.js
sed -i "s#<REFRESH_INTERVAL>#'$OSHINKO_REFRESH_INTERVAL'#" ../app/config.local.js
sed -i "s#<SPARK_IMAGE>#'$OSHINKO_SPARK_IMAGE'#" ../app/config.local.js
sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" ../app/config.local.js
npm start