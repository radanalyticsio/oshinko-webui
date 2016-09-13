window.EXAMPLE_DEP_CONFIG = {
  "metadata": {
    "name": "database",
    "namespace": "project1",
    "selfLink": "/oapi/v1/namespaces/project1/deploymentconfigs/database",
    "uid": "01e61193-0620-11e5-82b1-0aa865aec90d",
    "resourceVersion": "263",
    "creationTimestamp": "2015-05-29T16:30:24Z",
    "labels": {
      "template": "application-template-stibuild"
    }
  },
  "spec": {
    "strategy": {
      "type": "Recreate",
      "recreateParams": {
        "pre": {
          "failurePolicy": "Abort",
          "execNewPod": {
            "command": [
              "/bin/true"
            ],
            "env": [
              {
                "name": "CUSTOM_VAR1",
                "value": "custom_value1"
              }
            ],
            "containerName": "ruby-helloworld-database"
          }
        },
        "post": {
          "failurePolicy": "Ignore",
          "execNewPod": {
            "command": [
              "/bin/false"
            ],
            "env": [
              {
                "name": "CUSTOM_VAR2",
                "value": "custom_value2"
              }
            ],
            "containerName": "ruby-helloworld-database"
          }
        }
      },
      "resources": {}
    },
    "triggers": [
      {
        "type": "ConfigChange"
      }
    ],
    "replicas": 1,
    "selector": {
      "name": "database"
    },
    "template": {
      "metadata": {
        "creationTimestamp": null,
        "labels": {
          "name": "database"
        }
      },
      "spec": {
        "containers": [
          {
            "name": "ruby-helloworld-database",
            "image": "openshift/mysql-55-centos7:latest",
            "ports": [
              {
                "containerPort": 3306,
                "protocol": "TCP"
              }
            ],
            "env": [
              {
                "name": "MYSQL_USER",
                "value": "userG4X"
              },
              {
                "name": "MYSQL_PASSWORD",
                "value": "20ipMAqW"
              },
              {
                "name": "MYSQL_DATABASE",
                "value": "root"
              }
            ],
            "resources": {},
            "terminationMessagePath": "/dev/termination-log",
            "imagePullPolicy": "Always",
            "capabilities": {},
            "securityContext": {
              "capabilities": {},
              "privileged": false
            }
          }
        ],
        "restartPolicy": "Always",
        "dnsPolicy": "ClusterFirst",
        "serviceAccount": ""
      }
    }
  },
  "status": {
    "latestVersion": 1,
    "details": {
      "causes": [
        {
          "type": "ConfigChange"
        }
      ]
    }
  }
};
