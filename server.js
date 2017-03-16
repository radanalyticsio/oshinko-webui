<!--
/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 */
-->
var express = require("express");
var http = require("http");
var app = express();

var oshinko_web_debug = process.env.OSHINKO_WEB_DEBUG || false;
var oshinko_cli_location = process.env.OSHINKO_CLI_LOCATION || "/usr/src/app/oshinko-cli";
var oshinko_sa_token = process.env.OSHINKO_SA_TOKEN || '';
var oshinko_cert = process.env.KUBERNETES_CERT || "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";
var kubernetes_host = process.env.KUBERNETES_SERVICE_HOST || "kubernetes.default";
var kubernetes_port = process.env.KUBERNETES_SERVICE_PORT || "443";
var use_insecure_cli = process.env.USE_INSECURE_CLI || false;
var spark_image = process.env.OSHINKO_SPARK_IMAGE || null;
var refresh_interval = process.env.OSHINKO_REFRESH_INTERVAL || 5;
var server_token_cert = " --server=https://" + kubernetes_host + ":" + kubernetes_port + " --token=" + oshinko_sa_token + " --certificate-authority=" + oshinko_cert;
if (use_insecure_cli) {
  server_token_cert = " --server=https://" + kubernetes_host + ":" + kubernetes_port + " --token=" + oshinko_sa_token + " --insecure-skip-tls-verify=true";
}
var output_format = " -o json";
var use_spark_image = "";
if (spark_image) {
  use_spark_image = " --image " + spark_image;
}

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
  response.render('index.html')
});

app.get('/api/clusters', function (request, response) {
  var output = "";
  var response_text = "";
  var child_process = require('child_process');
  var command = oshinko_cli_location + " get" + server_token_cert + output_format;
  oshinko_web_debug && console.log("List command is: " + command);
  try {
    output = child_process.execSync(command);
    response_text = formatGetResponse(output);
    response_text = JSON.stringify(response_text);
    response.setHeader('Content-Type', 'application/json');
  } catch (err) {
    var error = formatErrResponse(err.message);
    response.statusCode = error.statusCode;
    response_text = error.message;
  }
  response.send(response_text);
});

app.get('/api/clusters/:id', function (request, response) {
  var child_process = require('child_process');
  var command = oshinko_cli_location + " get " + request.params.id + server_token_cert + output_format;
  oshinko_web_debug && console.log("Get command is: " + command);
  var output = child_process.execSync(command);
  var response_text = formatGetResponse(output);
  response.setHeader('Content-Type', 'application/json');
  response.send(JSON.stringify(response_text));
});

app.post('/api/clusters', function (request, response) {
  var output = "";
  var masterCount = request.body.config.masterCount;
  var workerCount = request.body.config.workerCount;
  var clusterName = request.body.name;
  var clusterConfig = request.body.config.clusterconfig;
  var workerConfig = request.body.config.workerconfig;
  var masterConfig = request.body.config.masterconfig;

  var cConfigCommand = clusterConfig ? " --storedconfig=" + clusterConfig : "";
  var wConfigCommand = workerConfig ? " --workerconfig=" + workerConfig : "";
  var mConfigCommand = masterConfig ? " --masterconfig=" + masterConfig : "";
  var wcCommand = workerCount > -1 ? " --workers=" + workerCount : "";
  var mcCommand = " --masters=" + masterCount;
  var createCommand = " create " + clusterName;

  var child_process = require('child_process');
  var command = oshinko_cli_location + createCommand + use_spark_image +
    wcCommand + mcCommand + cConfigCommand + wConfigCommand + mConfigCommand +
    server_token_cert ;
  oshinko_web_debug && console.log("Create command is: " + command);
  try {
    output = child_process.execSync(command);
    output = String.fromCharCode.apply(null, output);
    response.statusCode = 201;
  } catch (err) {
    var error = formatErrResponse(err.message);
    response.statusCode = error.statusCode;
    output = error.message;
  }
  response.send(output);
});

app.put('/api/clusters/:id', function (request, response) {
  var output = "";
  var masterCount = request.body.config.masterCount;
  var workerCount = request.body.config.workerCount;
  var clusterName = request.body.name;
  var child_process = require('child_process');
  var command = oshinko_cli_location + " scale " + clusterName +
    " --workers=" + workerCount + " --masters=" +
    masterCount + server_token_cert;
  oshinko_web_debug && console.log("Scale command is: " + command);
  try {
    output = child_process.execSync(command);
    output = String.fromCharCode.apply(null, output);
  } catch (err) {
    var error = formatErrResponse(err.message);
    response.statusCode = error.statusCode;
    output = error.message;
  }
  response.send(output);
});

app.delete('/api/clusters/:id', function (request, response) {
  var output = "";
  var child_process = require('child_process');
  var command = oshinko_cli_location + " delete " +
    request.params.id + server_token_cert;
  oshinko_web_debug && console.log("Delete command is: " + command);
  try {
    output = child_process.execSync(command);
    output = String.fromCharCode.apply(null, output);
  } catch (err) {
    var error = formatErrResponse(err.message);
    response.statusCode = error.statusCode;
    output = error.message;
  }
  response.send(output);
});

// Utility functions
var formatGetResponse = function (resultText) {
  var jsonText = String.fromCharCode.apply(null, resultText);
  var response = {clusters: jsonText};
  oshinko_web_debug && console.log("Response is: " + JSON.stringify(response));
  return response;
};

var formatErrResponse = function (resultText) {
  var err = {
    message: resultText,
    statusCode: 500
  };

  if(resultText.indexOf("already exists") > -1) {
    err.message = "A cluster with that name already exists.";
    err.statusCode = 409;
  }
  return err;
}

app.get('/config/refresh', function (request, response) {
  response.send(200, refresh_interval);
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(port, function () {
  console.log("Listening on " + port);
  console.log("Kubernetes server is: " + kubernetes_host + ":" + kubernetes_port);
  console.log("CLI executable location is: " + oshinko_cli_location);
  console.log("Oshinko sa token is: " + oshinko_sa_token);
  console.log("Cert location is: " + oshinko_cert);
  console.log("Insecure mode is: " + use_insecure_cli);
});