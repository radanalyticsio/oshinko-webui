/**
 * Created by croberts on 2/2/17.
 */

'use strict';
// This file is meant to be mirrored in both oshinko web interfaces,
// oshinko-console and oshinko-webui.  The only difference is the
// following line.  Any other changes should be mirrored to the
// other repo.
angular.module('Oshinko')
  .filter('depName', function () {
    var labelMap = {
      'replicationController': ["openshift.io/deployment-config.name"]
    };
    return function (labelKey) {
      return labelMap[labelKey];
    };
  })
  .filter('clusterName', function () {
    var labelMap = {
      'route': ["oshinko-cluster"]
    };
    return function (labelKey) {
      return labelMap[labelKey];
    };
  })
  .factory('clusterData',
    function ($http, $q, DataService, DeploymentsService) {
      // Start delete-related functions
      function deleteObject(name, resourceType, context) {
        // noops below are to suppress any warnings when deleting a non-existant object
        return DataService.delete(resourceType, name, context, { errorNotification: false }).then(function() {
          angular.noop();
        }, function() {
          angular.noop();
        });
      }

      function scaleReplication(clusterName, deploymentName, count, context) {
        var deferred = $q.defer();
        DataService.get('deploymentconfigs', deploymentName, context, null).then(function (dc) {
          DeploymentsService.scale(dc, count).then(function (result) {
            deferred.resolve(result);
          });
        });
        return deferred.promise;
      }

      function sendDeleteCluster(clusterName, context) {
        var masterDeploymentName = clusterName + "-m";
        var workerDeploymentName = clusterName + "-w";

        var steps = [
          deleteObject(masterDeploymentName, 'deploymentconfigs', context),
          deleteObject(workerDeploymentName, 'deploymentconfigs', context),
          deleteObject(clusterName + "-ui-route", 'routes', context),
          deleteObject(clusterName, 'services', context),
          deleteObject(clusterName + "-ui", 'services', context),
          deleteObject(clusterName + "-metrics", 'services', context),
          deleteObject(clusterName + "-metrics", 'configmaps', context)
        ];

        return $q.all(steps);
      }

      function getMetricsConfigMap(mapName) {
        var configMap = {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: mapName
          },
          data: {
            "hawkular-openshift-agent": 'collection_interval_secs: 60\n' +
            'endpoints:\n' +
            '- type: jolokia\n' +
            '  protocol: "http"\n' +
            '  port: 7777\n' +
            '  path: /jolokia/\n' +
            '  tags:\n' +
            '    name: ${POD:name}\n' +
            '  metrics:\n' +
            '  - name: java.lang:type=Threading#ThreadCount\n' +
            '    type: counter\n' +
            '    id:   VM Thread Count\n' +
            '  - name: java.lang:type=Memory#HeapMemoryUsage#used\n' +
            '    type: gauge\n' +
            '    id:   VM Heap Memory Used'
          }
        };
        return configMap;
      }

      function createConfigMap(configMap, context) {
        return DataService.create("configmaps", null, configMap, context, null);
      }

      // Start create-related functions
      function makeDeploymentConfig(input, imageSpec, ports, specialConfig, metrics) {
        var env = [];
        var volumes = [];
        angular.forEach(input.deploymentConfig.envVars, function (value, key) {
          env.push({name: key, value: value});
        });
        var templateLabels = angular.copy(input.labels);
        templateLabels.deploymentconfig = input.name;

        var container = {
          image: imageSpec.toString(),
          name: input.name,
          ports: ports,
          env: env,
          resources: {},
          terminationMessagePath: "/dev/termination-log",
          imagePullPolicy: "IfNotPresent"
        };

        if (specialConfig) {
          volumes = [
            {
              name: specialConfig,
              configMap: {
                name: specialConfig,
                defaultMode: 420
              }
            }
          ];
          container.volumeMounts = [
            {
              name: specialConfig,
              readOnly: true,
              mountPath: "/etc/oshinko-spark-configs"
            }
          ];
        }
        if (metrics) {
          volumes.push({
            name: "hawkular-openshift-agent",
            configMap: {
              name: input.labels["oshinko-cluster"] + "-metrics"
            }
          });
        }


        if (input.labels["oshinko-type"] === "master") {
          container.livenessProbe = {
            httpGet: {
              path: "/",
              port: 8080,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
          container.readinessProbe = {
            httpGet: {
              path: "/",
              port: 8080,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
        } else {
          container.livenessProbe = {
            httpGet: {
              path: "/",
              port: 8081,
              scheme: "HTTP"
            },
            timeoutSeconds: 1,
            periodSeconds: 10,
            successThreshold: 1,
            failureThreshold: 3
          };
        }

        var replicas;
        if (input.scaling.autoscaling) {
          replicas = input.scaling.minReplicas || 1;
        } else {
          replicas = input.scaling.replicas;
        }

        var deploymentConfig = {
          apiVersion: "v1",
          kind: "DeploymentConfig",
          metadata: {
            name: input.name,
            labels: input.labels,
            annotations: input.annotations
          },
          spec: {
            replicas: replicas,
            selector: {
              "oshinko-cluster": input.labels["oshinko-cluster"]
            },
            triggers: [
              {
                type: "ConfigChange"
              }
            ],
            template: {
              metadata: {
                labels: templateLabels
              },
              spec: {
                volumes: volumes,
                containers: [container],
                restartPolicy: "Always",
                terminationGracePeriodSeconds: 30,
                dnsPolicy: "ClusterFirst",
                securityContext: {}
              }
            }
          }
        };
        if (input.deploymentConfig.deployOnNewImage) {
          deploymentConfig.spec.triggers.push(
            {
              type: "ImageChange",
              imageChangeParams: {
                automatic: true,
                containerNames: [
                  input.name
                ],
                from: {
                  kind: imageSpec.kind,
                  name: imageSpec.toString()
                }
              }
            }
          );
        }
        return deploymentConfig;
      }

      function getClusterConfigObject(clusterConfig) {
        return {
          "MasterCount": clusterConfig.masterCount,
          "WorkerCount": clusterConfig.workerCount,
          "Name": clusterConfig.configName || "",
          "SparkMasterConfig": clusterConfig.masterConfigName || "",
          "SparkWorkerConfig": clusterConfig.workerConfigName || "",
          "SparkImage": clusterConfig.sparkImage,
          "ExposeWebUI": "" + clusterConfig.exposewebui,
          "Metrics": "" + clusterConfig.metrics
        };
      }

      function sparkDC(image, clusterName, sparkType, workerCount, ports, sparkConfig, clusterConfig) {
        var suffix = sparkType === "master" ? "-m" : "-w";
        var input = {
          deploymentConfig: {
            envVars: {
              OSHINKO_SPARK_CLUSTER: clusterName
            }
          },
          name: clusterName + suffix,
          labels: {
            "oshinko-cluster": clusterName,
            "oshinko-type": sparkType,
            "oshinko-metrics-enabled": clusterConfig.metrics ? "true" : "false"
          },
          annotations: {
            "created-by": "oshinko-webui",
            "oshinko-config": JSON.stringify(getClusterConfigObject(clusterConfig))
          },
          scaling: {
            autoscaling: false,
            minReplicas: 1
          }
        };
        if (sparkType === "worker") {
          input.deploymentConfig.envVars.SPARK_MASTER_ADDRESS = "spark://" + clusterName + ":" + 7077;
          input.deploymentConfig.envVars.SPARK_MASTER_UI_ADDRESS = "http://" + clusterName + "-ui:" + 8080;
        }
        if (sparkConfig) {
          input.deploymentConfig.envVars.SPARK_CONF_DIR = "/etc/oshinko-spark-configs";
        }
        if (clusterConfig.metrics) {
          input.deploymentConfig.envVars.SPARK_METRICS_ON = "true";
        }
        input.scaling.replicas = workerCount ? workerCount : 1;
        var dc = makeDeploymentConfig(input, image, ports, sparkConfig, clusterConfig.metrics);
        return dc;
      }

      function makeService(input, serviceName, ports) {
        if (!ports || !ports.length) {
          return null;
        }

        var service = {
          kind: "Service",
          apiVersion: "v1",
          metadata: {
            name: serviceName,
            labels: input.labels,
            annotations: input.annotations
          },
          spec: {
            selector: input.selectors,
            ports: ports
          }
        };

        return service;
      }

      function sparkService(serviceName, clusterName, serviceType, ports) {
        var input = {
          labels: {
            "oshinko-cluster": clusterName,
            "oshinko-type": serviceType
          },
          annotations: {},
          name: serviceName + "-" + serviceType,
          selectors: {
            "oshinko-cluster": clusterName,
            "oshinko-type": "master"
          }
        };
        return makeService(input, serviceName, ports);
      }

      function metricsService(clusterName, ports) {
        var serviceName = clusterName + "-metrics";
        var input = {
          labels: {
            "oshinko-cluster": clusterName,
            "oshinko-type": "oshinko-metrics"
          },
          annotations: {},
          name: serviceName,
          selectors: {
            "oshinko-cluster": clusterName,
            "oshinko-type": "master"
          }
        };
        return makeService(input, serviceName, ports);
      }

      function createDeploymentConfig(dcObject, context) {
        return DataService.create("deploymentconfigs", null, dcObject, context, null);
      }

      function createService(srvObject, context) {
        return DataService.create("services", null, srvObject, context, null);
      }

      function createRoute(srvObject, context) {
        var serviceName = srvObject.metadata.name;
        var labels = srvObject.metadata.labels;
        var route = {
          "apiVersion": "v1",
          "kind": "Route",
          "metadata": {
            "labels": labels,
            "name": serviceName + "-route"
          },
          "spec": {
            "to": {
              "kind": "Service",
              "name": serviceName
            },
            "wildcardPolicy": "None"
          }
        };
        return DataService.create('routes', null, route, context);
      }

      function getFinalConfigs(origConfig, context) {
        var deferred = $q.defer();
        var finalConfig = {};
        finalConfig["clusterName"] = origConfig.clusterName;
        if (origConfig.configName) {
          DataService.get('configmaps', origConfig.configName, context, null).then(function (cm) {
            if (cm.data["workercount"]) {
              finalConfig["workerCount"] = parseInt(cm.data["workercount"]);
            }
            if (cm.data["mastercount"]) {
              finalConfig["masterCount"] = parseInt(cm.data["mastercount"]);
            }
            if (cm.data["sparkmasterconfig"]) {
              finalConfig["masterConfigName"] = cm.data["sparkmasterconfig"];
            }
            if (cm.data["sparkworkerconfig"]) {
              finalConfig["workerConfigName"] = cm.data["sparkworkerconfig"];
            }
            if (cm.data["sparkimage"]) {
              if (origConfig.sparkImage  && !origConfig.sparkDefaultUsed) {
                finalConfig["sparkImage"] = origConfig.sparkImage;
              } else {
                finalConfig["sparkImage"] = cm.data["sparkimage"];
              }
            } else {
              finalConfig["sparkImage"] = origConfig.sparkImage;
            }
            if (cm.data["exposeui"]) {
              finalConfig["exposewebui"] = cm.data["exposeui"];
            }
            if (cm.data["metrics"]) {
              finalConfig["metrics"] = cm.data["metrics"];
            }
            if (origConfig.workerCount && origConfig.workerCount >= 0) {
              finalConfig["workerCount"] = origConfig.workerCount;
            }
            if (origConfig.workerConfigName) {
              finalConfig["workerConfigName"] = origConfig.workerConfigName;
            }
            if (origConfig.masterConfigName) {
              finalConfig["masterConfigName"] = origConfig.masterConfigName;
            }
            deferred.resolve(finalConfig);
          }).catch(function () {
            if (origConfig.workerConfigName) {
              finalConfig["workerConfigName"] = origConfig.workerConfigName;
            }
            if (origConfig.masterConfigName) {
              finalConfig["masterConfigName"] = origConfig.masterConfigName;
            }
            if (origConfig.sparkImage) {
              finalConfig["sparkImage"] = origConfig.sparkImage;
            }
            finalConfig["exposewebui"] = origConfig.exposewebui;
            finalConfig["metrics"] = origConfig.metrics;
            finalConfig["workerCount"] = origConfig.workerCount;
            finalConfig["masterCount"] = origConfig.masterCount;
            deferred.resolve(finalConfig);
          });
        } else {
          if (origConfig.workerConfigName) {
            finalConfig["workerConfigName"] = origConfig.workerConfigName;
          }
          if (origConfig.masterConfigName) {
            finalConfig["masterConfigName"] = origConfig.masterConfigName;
          }
          if (origConfig.sparkImage) {
            finalConfig["sparkImage"] = origConfig.sparkImage;
          }
          finalConfig["exposewebui"] = origConfig.exposewebui;
          finalConfig["metrics"] = origConfig.metrics;
          finalConfig["workerCount"] = origConfig.workerCount;
          finalConfig["masterCount"] = origConfig.masterCount;
          deferred.resolve(finalConfig);
        }
        if (finalConfig["workerCount"] < 0) {
          // default to a workerCount of 1
          // can happen if we expected a configmap to contain a count, but it did not
          finalConfig["workerCount"] = 1;
        }
        return deferred.promise;
      }

      function sendCreateCluster(clusterConfigs, context) {
        var workerPorts = [
          {
            "name": "spark-webui",
            "containerPort": 8081,
            "protocol": "TCP"
          },
          {
            "name": "spark-metrics",
            "containerPort": 7777,
            "protocol": "TCP"
          }
        ];
        var masterPorts = [
          {
            "name": "spark-webui",
            "containerPort": 8080,
            "protocol": "TCP"
          },
          {
            "name": "spark-master",
            "containerPort": 7077,
            "protocol": "TCP"
          },
          {
            "name": "spark-metrics",
            "containerPort": 7777,
            "protocol": "TCP"
          }
        ];
        var masterServicePort = [
          {
            protocol: "TCP",
            port: 7077,
            targetPort: 7077
          }
        ];
        var uiServicePort = [
          {
            protocol: "TCP",
            port: 8080,
            targetPort: 8080
          }
        ];
        var jolokiaServicePort = [
          {
            protocol: "TCP",
            port: 7777,
            targetPort: 7777
          }
        ];

        var sm = null;
        var sw = null;
        var smService = null;
        var suiService = null;
        var jolokiaService = null;
        var clusterMetricsConfig = null;
        var deferred = $q.defer();
        getFinalConfigs(clusterConfigs, context).then(function (finalConfigs) {
          sm = sparkDC(finalConfigs.sparkImage, clusterConfigs.clusterName, "master", null, masterPorts, finalConfigs["masterConfigName"], finalConfigs);
          sw = sparkDC(finalConfigs.sparkImage, clusterConfigs.clusterName, "worker", finalConfigs["workerCount"], workerPorts, finalConfigs["workerConfigName"], finalConfigs);
          smService = sparkService(clusterConfigs.clusterName, clusterConfigs.clusterName, "master", masterServicePort);
          suiService = sparkService(clusterConfigs.clusterName + "-ui", clusterConfigs.clusterName, "webui", uiServicePort);

          var steps = [
            createDeploymentConfig(sm, context),
            createDeploymentConfig(sw, context),
            createService(smService, context),
            createService(suiService, context)
          ];

          // Only create the metrics service if we're going to be using it
          if (finalConfigs.metrics) {
            jolokiaService = metricsService(clusterConfigs.clusterName, jolokiaServicePort);
            steps.push(createService(jolokiaService, context));

            clusterMetricsConfig = getMetricsConfigMap(clusterConfigs.clusterName + "-metrics", context);
            steps.push(createConfigMap(clusterMetricsConfig, context));
          }

          // if expose webui was checked, we expose the apache spark webui via a route
          if (clusterConfigs.exposewebui) {
            steps.push(createRoute(suiService, context));
          }

          $q.all(steps).then(function (values) {
            deferred.resolve(values);
          }).catch(function (err) {
            deferred.reject(err);
          });
        });
        return deferred.promise;
      }

      // Start scale-related functions
      function sendScaleCluster(clusterName, workerCount, masterCount, context) {
        var workerDeploymentName = clusterName + "-w";
        var masterDeploymentName = clusterName + "-m";
        var steps = [
          scaleReplication(clusterName, workerDeploymentName, workerCount, context),
          scaleReplication(clusterName, masterDeploymentName, masterCount, context)
        ];

        return $q.all(steps);
      }

      return {
        sendDeleteCluster: sendDeleteCluster,
        sendCreateCluster: sendCreateCluster,
        sendScaleCluster: sendScaleCluster
      };
    }
  );