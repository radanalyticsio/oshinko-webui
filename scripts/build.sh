#!/bin/bash

mkdir -p ./go/src/github.com/radanalyticsio
cd go/src/github.com/radanalyticsio
git clone https://github.com/radanalyticsio/oshinko-cli
cd oshinko-cli
make build
