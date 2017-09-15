/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 */

'use strict';

var express = require("express");
var app = express();

var oshinko_proxy_location = process.env.OSHINKO_PROXY_LOCATION || "";
var oshinko_current_namespace = process.env.CURRENT_NAMESPACE || "";
var oshinko_sa_token = process.env.OSHINKO_SA_TOKEN || '';

var spark_image = process.env.OSHINKO_SPARK_IMAGE || "radanalyticsio/openshift-spark";
var refresh_interval = process.env.OSHINKO_REFRESH_INTERVAL || 5;

app.configure(function () {
  app.use(express.logger());
  app.set('views', __dirname + '/app');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/app'));
  app.use('/bower_components', express.static(__dirname + '/app/bower_components'));
  app.use(app.router);
  app.engine('html', require('ejs').renderFile);
});

app.get('/', function (request, response) {
  response.render('index.html');
});

app.get('/config/all', function (request, response) {
  var config = {
    refresh_interval: refresh_interval,
    spark_image: spark_image,
    oshinko_proxy_location: oshinko_proxy_location,
    oshinko_current_namespace: oshinko_current_namespace

  };
  response.send(200, config);
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(port, function () {
  console.log("Listening on " + port);
  console.log("Proxy location: " + oshinko_proxy_location);
  console.log("Oshinko sa token is: " + oshinko_sa_token);
  console.log("Current namespace is: " + oshinko_current_namespace);
});
