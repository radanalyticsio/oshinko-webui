'use strict';
angular.module('Oshinko')
  .factory('clusterData', [
    '$http',
    '$q',
    "ProjectsService",
    "DataService",
    "DeploymentsService",
    "$routeParams",
    function ($http, $q, ProjectsService, DataService, DeploymentsService, $routeParams) {
      var project = $routeParams.project;
      var myContext = null;
      ProjectsService
        .get(project)
        .then(_.spread(function (project, context) {
          myContext = context;
        }));

      // Start delete-related functions
      function deleteObject(name, resourceType) {
        return DataService.delete(resourceType, name, myContext, null);
      }

      function scaleDeleteReplication(clusterName, deploymentName) {
        var deferred = $q.defer();
        var mostRecentRC = null;
        // we need to determine the most recent replication controller in the event that
        // changes have been made to the deployment, we can not assume clustername-w-1
        DataService.list('replicationcontrollers', myContext, function (result) {
          var rcs = result.by("metadata.name");
          angular.forEach(rcs, function (rc) {
            if (rc.metadata.labels["oshinko-cluster"] === clusterName && rc.metadata.name.startsWith(deploymentName)) {
              if (!mostRecentRC || new Date(rc.metadata.creationTimestamp) > new Date(mostRecentRC.metadata.creationTimestamp)) {
                // if we have a mostRecentRC, it's about to be replaced, so we
                // can delete it as it's most definitely not the most recent one
                if (mostRecentRC) {
                  DataService.delete('replicationcontrollers', mostRecentRC.metadata.name, myContext, null).then(angular.noop);
                }
                mostRecentRC = rc;
              }
            }
          });
          mostRecentRC.spec.replicas = 0;
          DataService.update('replicationcontrollers', mostRecentRC.metadata.name, mostRecentRC, myContext).then(function () {
            DataService.delete('replicationcontrollers', mostRecentRC.metadata.name, myContext, null).then(function (result) {
              deferred.resolve(result);
            }).catch(function (err) {
              deferred.reject(err);
            });
          }).catch(function (err) {
            deferred.reject(err);
          });
        });
        return deferred.promise;
      }

      function scaleReplication(clusterName, deploymentName, count) {
        var deferred = $q.defer();
        DataService.get('deploymentconfigs', deploymentName, myContext, null).then(function (dc) {
          DeploymentsService.scale(dc, count).then(function (result) {
            deferred.resolve(result);
          });
        });
        return deferred.promise;
      }

      function sendDeleteCluster(clusterName) {
        var masterDeploymentName = clusterName + "-m";
        var workerDeploymentName = clusterName + "-w";
        var deferred = $q.defer();

        $q.all([
          scaleDeleteReplication(clusterName, masterDeploymentName),
          scaleDeleteReplication(clusterName, workerDeploymentName),
          deleteObject(masterDeploymentName, 'deploymentconfigs'),
          deleteObject(workerDeploymentName, 'deploymentconfigs'),
          deleteObject(clusterName, 'services'),
          deleteObject(clusterName + "-ui", 'services'),
        ]).then(function (values) {
          var err = false;
          angular.forEach(values, function (value) {
            if(value.code !== 200) {
              err = true;
            }
          });
          if (err) {
            deferred.reject(values);
          } else {
            deferred.resolve(values);
          }
        });
        return deferred.promise;
      }

      // Start create-related functions
      function makeDeploymentConfig(input, imageSpec, ports) {
        var env = [];
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
        if (input.deploymentConfig.deployOnConfigChange) {
          deploymentConfig.spec.triggers.push({type: "ConfigChange"});
        }
        return deploymentConfig;
      }

      function sparkDC(image, clusterName, sparkType, workerCount, ports) {
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
            "oshinko-type": sparkType
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
        input.scaling.replicas = workerCount ? workerCount : 1;
        var dc = makeDeploymentConfig(input, image, ports);
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

      function createDeploymentConfig(dcObject) {
        return DataService.create("deploymentconfigs", null, dcObject, myContext, null);
      }

      function createService(srvObject) {
        return DataService.create("services", null, srvObject, myContext, null);
      }

      function sendCreateCluster(clusterName, workerCount) {
        var sparkImage = "docker.io/radanalyticsio/openshift-spark:latest";
        var workerPorts = [
          {
            "name": "spark-webui",
            "containerPort": 8081,
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
        var sm = sparkDC(sparkImage, clusterName, "master", null, masterPorts);
        var sw = sparkDC(sparkImage, clusterName, "worker", workerCount, workerPorts);
        var smService = sparkService(clusterName, clusterName, "master", masterServicePort);
        var suiService = sparkService(clusterName + "-ui", clusterName, "webui", uiServicePort);

        var deferred = $q.defer();

        $q.all([
          createDeploymentConfig(sm),
          createDeploymentConfig(sw),
          createService(smService),
          createService(suiService)
        ]).then(function (values) {
          deferred.resolve(values);
        }).catch(function (err) {
          deferred.reject(err);
        });
        return deferred.promise;
      }

      // Start scale-related functions
      function sendScaleCluster(clusterName, workerCount) {
        var workerDeploymentName = clusterName + "-w";
        var deferred = $q.defer();

        $q.all([
          scaleReplication(clusterName, workerDeploymentName, workerCount)
        ]).then(function (value) {
          deferred.resolve(value);
        }).catch(function (err) {
          deferred.reject(err);
        });
        return deferred.promise;
      }

      return {
        sendDeleteCluster: sendDeleteCluster,
        sendCreateCluster: sendCreateCluster,
        sendScaleCluster: sendScaleCluster,
      };
    }
  ])
    .controller('NavCtrl', function($rootScope, $scope, $location) {
      $scope.isActive = function(route) {
        return $location.path() === route;
      };
    })
  .controller('OshinkoClustersCtrl',
    function ($scope, $interval, $location, $route,
              DataService, ProjectsService, $routeParams,
              $rootScope, $filter, AlertMessageService, $uibModal) {
      var watches = [];
      var services, pods;
      $scope.projectName = $routeParams.project;
      $scope.serviceName = $routeParams.service;
      $scope.projects = {};
      $scope.oshinkoClusters = {};
      $scope.oshinkoClusterNames = [];
      $scope.alerts = $scope.alerts || {};
      var label = $filter('label');
      $scope.cluster_id = $route.current.params.Id || '';
      $scope.breadcrumbs = [
        {
          title: $scope.projectName,
          link: "project/" + $scope.projectName
        },
        {
          title: "Spark Clusters"
        }
      ];

      AlertMessageService.getAlerts().forEach(function (alert) {
        $scope.alerts[alert.name] = alert.data;
      });
      AlertMessageService.clearAlerts();

      function oshinkoCluster(resource) {
        if (label(resource, "oshinko-cluster")) {
          return true;
        }
        return false;
      }

      function groupByClusters(pods, services) {
        var clusters = {};
        var clusterName;
        var type;
        var podName;
        var svcName;
        var svc;
        _.each(pods, function (pod) {
          if (!oshinkoCluster(pod)) {
            return;
          }
          clusterName = label(pod, "oshinko-cluster");
          podName = _.get(pod, 'metadata.name', '');
          type = label(pod, "oshinko-type");
          //find matching services
          svc = _.find(services, function (service) {
            var svcSelector = new LabelSelector(service.spec.selector);
            return svcSelector.matches(pod);
          });

          if (svc) {
            svcName = _.get(svc, 'metadata.name', '');
            _.set(clusters, [clusterName, type, 'svc', svcName], svc);
          }
          _.set(clusters, [clusterName, type, 'pod', podName], pod);
        });
        //find webui services
        _.each(services, function (service) {
          type = label(service, "oshinko-type");
          if (type === "webui") {
            clusterName = label(service, "oshinko-cluster");
            svcName = _.get(service, 'metadata.name', '');
            _.set(clusters, [clusterName, type, 'svc', svcName], service);
          }
        });

        return clusters;
      }

      var groupClusters = function () {
        if (!pods || !services) {
          return;
        }
        $scope.oshinkoClusters = groupByClusters(pods, services);
        $scope.oshinkoClusterNames = Object.keys($scope.oshinkoClusters);
      };
      $scope.countWorkers = function (cluster) {
        if (!cluster || !cluster.worker || !cluster.worker.pod) {
          return 0;
        }
        var pods = cluster.worker.pod;
        var length = Object.keys(pods).length;
        return length;
      };
      $scope.getClusterName = function (cluster) {
        var name = Object.keys(cluster);
        return name[0];
      };
      $scope.getClusterStatus = function (cluster) {
        var status = "Starting...";
        var podStatus;
        var isPod = false;
        if (!cluster || !cluster.worker || !cluster.worker.pod || !cluster.master || !cluster.master.pod) {
          return "Error";
        }
        //TODO look at more states
        _.each(cluster.worker.pod, function (worker) {
          isPod = true;
          if (worker.status.phase !== "Running") {
            podStatus = worker.status.phase;
            return;
          }
        });

        _.each(cluster.master.pod, function (master) {
          isPod = true;
          if (master.status.phase !== "Running") {
            podStatus = master.status.phase;
            return;
          }
        });
        //return pod status
        if (isPod && podStatus) {
          return podStatus;
        }
        else if (isPod) {
          return "Running";
        }
        //return starting...
        return status;
      };
      $scope.getSparkMasterUrl = function (cluster) {
        if (!cluster || !cluster.master || !cluster.master.svc) {
          return "";
        }
        var masterSvc = Object.keys(cluster.master.svc);
        if (masterSvc.length === 0) {
          return "";
        }
        var svcName = masterSvc[0];
        var port = cluster.master.svc[svcName].spec.ports[0].port;
        return "spark://" + svcName + ":" + port;
      };
      $scope.getCluster = function () {
        if (!$scope.oshinkoClusters || !$scope.cluster) {
          return;
        }

        var cluster = $scope.oshinkoClusters[$scope.cluster];
        return cluster;
      };

      var project = $routeParams.project;
      ProjectsService
        .get(project)
        .then(_.spread(function (project, context) {
          $scope.project = project;
          $scope.projectContext = context;
          watches.push(DataService.watch("pods", context, function (podsData) {
            $scope.pods = pods = podsData.by("metadata.name");
            groupClusters();
          }));

          watches.push(DataService.watch("services", context, function (serviceData) {
            $scope.services = services = serviceData.by("metadata.name");
            groupClusters();
          }));

          $scope.$on('$destroy', function () {
            DataService.unwatchAll(watches);
          });

        }));

      $scope.$on('$destroy', function () {
        DataService.unwatchAll(watches);
      });

      // Start cluster operations
      $scope.deleteCluster = function deleteCluster(clusterName) {
        var modalInstance = $uibModal.open({
          animation: true,
          controller: 'OshinkoClusterDeleteCtrl',
          templateUrl: 'views/oshinko/' + 'delete-cluster.html',
          resolve: {
            dialogData: function () {
              return {clusterName: clusterName};
            }
          }
        });

        modalInstance.result.then(function () {
          var alertName = clusterName + "-delete";
          $scope.alerts[alertName] = {
            type: "success",
            message: clusterName + " has been marked for deletion"
          };
        }).catch(function (reason) {
          if (reason !== "cancel") {
            var alertName = clusterName + "-delete";
            $scope.alerts[alertName] = {
              type: "error",
              message: clusterName + " has been marked for deletion, but there were errors"
            };
          }
        });
      };

      $scope.newCluster = function newCluster() {
        var modalInstance = $uibModal.open({
          animation: true,
          controller: 'OshinkoClusterNewCtrl',
          templateUrl: 'views/oshinko/' + 'new-cluster.html',
          resolve: {
            dialogData: function () {
              return {};
            }
          }
        });

        modalInstance.result.then(function (response) {
          var clusterName = response[0].metadata.labels["oshinko-cluster"];
          var alertName = clusterName + "-create";
          $scope.alerts[alertName] = {
            type: "success",
            message: clusterName + " has been created"
          };
        }).catch(function (reason) {
          if (reason !== "cancel") {
            var alertName = "error-create";
            $scope.alerts[alertName] = {
              type: "error",
              message: "Cluster create failed"
            };
          }
        });
      };

      $scope.scaleCluster = function scaleCluster(clusterName, workerCount) {
        var modalInstance = $uibModal.open({
          animation: true,
          controller: 'OshinkoClusterDeleteCtrl',
          templateUrl: 'views/oshinko/' + 'scale-cluster.html',
          resolve: {
            dialogData: function () {
              return {
                clusterName: clusterName,
                workerCount: workerCount
              };
            }
          }
        });

        modalInstance.result.then(function (response) {
          var numWorkers = response[0].spec.replicas;
          var alertName = clusterName + "-scale";
          var workers = numWorkers > 1 ? "workers" : "worker";
          $scope.alerts[alertName] = {
            type: "success",
            message: clusterName + " has been scaled to " + numWorkers + " " + workers
          };
        }).catch(function (reason) {
          if (reason !== "cancel") {
            var alertName = "error-scale";
            $scope.alerts[alertName] = {
              type: "error",
              message: "Cluster scale failed"
            };
          }
        });
      };
      // end cluster operations
    }
  )
  .controller('OshinkoClusterDeleteCtrl', [
    '$q',
    '$scope',
    "clusterData",
    "$uibModalInstance",
    "dialogData",
    function ($q, $scope, clusterData, $uibModalInstance, dialogData) {

      $scope.clusterName = dialogData.clusterName || "";
      $scope.workerCount = dialogData.workerCount || 1;

      $scope.deleteCluster = function deleteCluster() {
        var defer = $q.defer();
        clusterData.sendDeleteCluster($scope.clusterName)
          .then(function (response) {
            $uibModalInstance.close(response);
          }, function (error) {
            $uibModalInstance.dismiss(error);
          });
        return defer.promise;
      };

      $scope.cancelfn = function () {
        $uibModalInstance.dismiss('cancel');
      };

      var NUMBER_RE = /^[0-9]*$/;

      function validate(workers) {
        $scope.formError = "";
        var defer = $q.defer();
        var ex;
        if (!workers) {
          ex = new Error("The number of workers cannot be empty or less than 1.");
        }
        else if (!NUMBER_RE.test(workers)) {
          ex = new Error("Please give a valid number of workers.");
        }
        else if (workers <= 0) {
          ex = new Error("Please give a value greater than 0.");
        }
        if (ex) {
          ex.target = "#numworkers";
          defer.reject(ex);
        }
        if (!ex) {
          defer.resolve();
        }
        return defer.promise;
      }


      $scope.scaleCluster = function scaleCluster(count) {
        var defer = $q.defer();

        validate(count)
          .then(function () {
            clusterData.sendScaleCluster($scope.clusterName, count).then(function (response) {
              $uibModalInstance.close(response);
            }, function (error) {
              $uibModalInstance.close(error);
            });
          }, function (error) {
            $scope.formError = error.message;
            defer.reject(error);
          });
        return defer.promise;
      };
    }
  ])
  .controller('OshinkoClusterNewCtrl', [
    '$q',
    '$scope',
    "dialogData",
    "clusterData",
    "$uibModalInstance",
    function ($q, $scope, dialogData, clusterData, $uibModalInstance) {
      var NAME_RE = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;
      var NUMBER_RE = /^[0-9]*$/;
      var fields = {
        name: "",
        workers: 1,
      };
      $scope.fields = fields;

      function validate(name, workers) {
        $scope.formError = "";
        var defer = $q.defer();
        var ex;
        if (name !== undefined) {
          if (!name) {
            ex = new Error("The cluster name cannot be empty.");
          }
          else if (!NAME_RE.test(name)) {
            ex = new Error("The cluster name contains invalid characters.");
          }
          if (ex) {
            ex.target = "#cluster-new-name";
            defer.reject(ex);
          }
        }
        if (workers !== undefined) {
          if (!workers) {
            ex = new Error("The number of workers count cannot be empty.");
          }
          else if (!NUMBER_RE.test(workers)) {
            ex = new Error("Please give a valid number of workers.");
          }
          else if (workers <= 0) {
            ex = new Error("Please give a value greater than 0.");
          }
          if (ex) {
            ex.target = "#cluster-new-workers";
            defer.reject(ex);
          }
        }
        if (!ex) {
          defer.resolve();
        }
        return defer.promise;
      }

      $scope.cancelfn = function () {
        $uibModalInstance.dismiss('cancel');
      };

      $scope.newCluster = function newCluster() {
        var defer = $q.defer();
        var name = $scope.fields.name.trim();
        var workersInt = $scope.fields.workers;

        validate(name, workersInt)
          .then(function () {
            clusterData.sendCreateCluster(name, workersInt).then(function (response) {
              $uibModalInstance.close(response);
            }, function (error) {
              $uibModalInstance.dismiss(error);
            });
          }, function (error) {
            $scope.formError = error.message;
            defer.reject(error);
          });
        return defer.promise;
      };
    }
  ]);
