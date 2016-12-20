#!/bin/bash

export SA_TOKEN=`cat /var/run/secrets/kubernetes.io/serviceaccount/token`
npm start