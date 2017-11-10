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
var spark_default = process.env.SPARK_DEFAULT || "";

app.configure(function () {
  app.use(express.logger());
  app.set('views', __dirname + '/app');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/app'));
  app.use('/webui/bower_components', express.static(__dirname + '/app/bower_components'));
  app.use('/webui/css', express.static(__dirname + '/app/css'));
  app.use('/webui/js', express.static(__dirname + '/app/js'));
  app.use('/webui/partials', express.static(__dirname + '/app/partials'));
  app.use('/webui/forms', express.static(__dirname + '/app/forms'));
  app.use('/webui', express.static(__dirname + '/app'));
  app.use(app.router);
  app.engine('html', require('ejs').renderFile);
});

app.get('*', function (request, response) {
  response.render('index.html');
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(port, function () {
  console.log("Listening on " + port);
  console.log("Proxy location: " + oshinko_proxy_location + "/proxy");
  console.log("Current namespace is: " + oshinko_current_namespace);
  console.log("Spark default image if not overridden is " + spark_default);
});
