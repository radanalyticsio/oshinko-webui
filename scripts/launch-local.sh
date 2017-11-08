#!/bin/bash


export CURRENT_NAMESPACE=`oc project -q`
export OSHINKO_REFRESH_INTERVAL=5
export SPARK_DEFAULT='radanalyticsio/openshift-spark'
export OSHINKO_PROXY_LOCATION='127.0.0.1:8001'  #location of oc proxy running

export BASEDIR=`git rev-parse --show-toplevel`
cp $BASEDIR/app/config.template $BASEDIR/app/config.local.js

sed -i "s#SPARK_DEFAULT#$SPARK_DEFAULT#" $BASEDIR/app/forms/new-cluster.html
sed -i "s#<NAMESPACE>#'$CURRENT_NAMESPACE'#" $BASEDIR/app/config.local.js
sed -i "s#<REFRESH_INTERVAL>#'$OSHINKO_REFRESH_INTERVAL'#" $BASEDIR/app/config.local.js
sed -i "s#SPARK_DEFAULT#$SPARK_DEFAULT#" $BASEDIR/app/config.local.js
sed -i "s#SPARK_DEFAULT#$SPARK_DEFAULT#" $BASEDIR/app/js/controllers.js
sed -i "s/<PROXY>/'$OSHINKO_PROXY_LOCATION'/" $BASEDIR/app/config.local.js
npm start