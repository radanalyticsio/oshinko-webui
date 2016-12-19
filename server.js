<!--
/*
 * This file is part of Oshinko.
 *
 * Copyright (C) 2016 Red Hat, Inc.
 *
 */
-->
var express = require("express");
var http = require("http");
var app = express();

var oshinko_web_debug = process.env.OPENSHIFT_OSHINKO_WEB_DEBUG || false;
var oshinko_sa_token = process.env.SA_TOKEN || '';
var oshinko_cert = process.env.KUBERNETES_CERT || "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt";
var kubernetes_host = process.env.KUBERNETES_SERVICE_HOST || "kubernetes.default";
var kubernetes_port = process.env.KUBERNETES_SERVICE_PORT || "443";
var use_insecure_cli = process.env.USE_INSECURE_CLI || false;
var server_token_cert = " --server=https://" + kubernetes_host + ":" + kubernetes_port + " --token=" + oshinko_sa_token + " --certificate-authority=" + oshinko_cert;
if (use_insecure_cli) {
  server_token_cert = " --server=https://" + kubernetes_host + ":" + kubernetes_port + " --token=" + oshinko_sa_token + " --insecure-skip-tls-verify=true";
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

var formatGetResponse = function (resultText) {
  var response = {clusters: []};
  var lines = resultText.toString().split("\n");
  for (i=0; i < lines.length; i++) {
    if (lines[i].indexOf("\t") >= 0) {
      var cluster_properties = lines[i].split("\t");
      response.clusters.push({
        name: cluster_properties[0],
        masterUrl: cluster_properties[2],
        masterWebUrl: cluster_properties[3],
        workerCount: cluster_properties[1],
        status: "Running"
      });
    }
  }
  return response;
};

app.get('/api/clusters', function (request, response) {
  var child_process = require('child_process');
  var command = "/usr/src/app/oshinko-cli get" + server_token_cert;
  oshinko_web_debug && console.log("List command is: " + command);
  var output = child_process.execSync(command);
  var response_text = formatGetResponse(output);
  response.send(response_text);
});

app.get('/api/clusters/:id', function (request, response) {
  var child_process = require('child_process');
  var command = "/usr/src/app/oshinko-cli get " + request.param.id + server_token_cert;
  oshinko_web_debug && console.log("Get command is: " + command);
  var output = child_process.execSync(command);
  var response_text = formatGetResponse(output);
  response.send(response_text);
});

app.post('/api/clusters', function (request, response) {
  var masterCount = request.body.config.masterCount;
  var workerCount = request.body.config.workerCount;
  var clusterName = request.body.name;
  var child_process = require('child_process');
  var command = "/usr/src/app/oshinko-cli create " + clusterName + " --workers=" + workerCount + " --masters=" + masterCount + server_token_cert;
  oshinko_web_debug && console.log("Create command is: " + command);
  var output = child_process.execSync(command);
  response.send(output);
});

app.put('/api/clusters/:id', function (request, response) {
  var masterCount = request.body.config.masterCount;
  var workerCount = request.body.config.workerCount;
  var clusterName = request.body.name;
  var child_process = require('child_process');
  var command = "/usr/src/app/oshinko-cli scale " + clusterName + " --workers=" + workerCount + " --masters=" + masterCount + server_token_cert;
  oshinko_web_debug && console.log("Scale command is: " + command);
  var output = child_process.execSync(command);
  response.send(output);
});

app.delete('/api/clusters/:id', function (request, response) {
  var child_process = require('child_process');
  var command = "/usr/src/app/oshinko-cli delete " + request.params.id + server_token_cert;
  oshinko_web_debug && console.log("Delete command is: " + command);
  var output = child_process.execSync(command);
  response.send(output);
});

var port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
app.listen(port, function () {
  console.log("Listening on " + port);
  console.log("Kubernetes server is: " + kubernetes_host + ":" + kubernetes_port);
  console.log("Oshinko sa token is: " + oshinko_sa_token);
  console.log("Cert location is: " + oshinko_cert);
  console.log("Insecure mode is: " + use_insecure_cli);
});
