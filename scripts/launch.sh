#!/bin/bash

export OSHINKO_SA_TOKEN=`cat /var/run/secrets/kubernetes.io/serviceaccount/token`
npm start