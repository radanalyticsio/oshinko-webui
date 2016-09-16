window.EXAMPLE_POD = {
  "kind": "Pod",
  "apiVersion": "v1",
  "metadata": {
    "name": "example-pod",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/pods/example-pod",
    "uid": "6aefeebf-d7d2-11e4-a675-54ee75107c12",
    "resourceVersion": "20060",
    "creationTimestamp": "2015-03-31T18:19:06Z",
    "labels": {
      "name": "example-pod"
    }
  },
  "spec": {
    "volumes": [
      {
        "name": "docker-socket",
        "hostPath": {
          "path": "/var/run/docker.sock"
        },
        "emptyDir": null,
        "gcePersistentDisk": null,
        "gitRepo": null,
        "secret": null,
        "nfs": null
      }
    ],
    "containers": [
      {
        "name": "container-1",
        "image": "openshift/hello-openshift",
        "ports": [
          {
            "containerPort": 8080,
            "protocol": "TCP"
          }
        ],
        "resources": {},
        "terminationMessagePath": "/dev/termination-log",
        "imagePullPolicy": "IfNotPresent"
      },
      {
        "name": "container-2",
        "image": "openshift/hello-openshift",
        "ports": [
          {
            "containerPort": 8080,
            "protocol": "TCP"
          }
        ],
        "resources": {},
        "terminationMessagePath": "/dev/termination-log",
        "imagePullPolicy": "IfNotPresent"
      },
      {
        "name": "container-3",
        "image": "openshift/hello-openshift",
        "ports": [
          {
            "containerPort": 8080,
            "protocol": "TCP"
          }
        ],
        "resources": {},
        "terminationMessagePath": "/dev/termination-log",
        "imagePullPolicy": "IfNotPresent"
      }
    ],
    "restartPolicy": "Always",
    "dnsPolicy": "ClusterFirst",
    "nodeName": "example.node.com",
    "serviceAccountName": "default"
  },
  "status": {
    "phase": "Running",
    "Condition": [
      {
        "type": "Ready",
        "status": "Full"
      }
    ],
    "hostIP": "127.0.0.1",
    "podIP": "1.2.3.4",
    "containerStatuses": [
      {
        "name": "container-1",
        "state": {
          "running": {
            "startedAt": "2015-05-11T20:16:19Z"
          }
        },
        "lastState": {},
        "ready": true,
        "restartCount": 0,
        "image": "openshift/mysql-55-centos7",
        "imageID": "docker://655aba0e23e560c958653ec30ba614a40c1a4d5a4bdb112e9ab04d94a5ba478e",
        "containerID": "docker://c2c01bd1598fd314ca78fe804af0242999c6146dd198e9f32e8066592c958a3f"
      },
      {
        "name": "container-2",
        "state": {
          "waiting": {
            "reason": "For reasons"
          }
        },
        "lastState": {},
        "ready": true,
        "restartCount": 0,
        "image": "openshift/mysql-55-centos7",
        "imageID": "docker://655aba0e23e560c958653ec30ba614a40c1a4d5a4bdb112e9ab04d94a5ba478e",
        "containerID": "docker://c2c01bd1598fd314ca78fe804af0242999c6146dd198e9f32e8066592c958a3f"
      },
      {
        "name": "container-3",
        "state": {
          "terminated": {
            "finishedAt": "2015-05-11T20:32:19Z",
            "exitCode": 1,
            "reason": "An error occurred"
          }
        },
        "lastState": {
          "running": {
            "startedAt": "2015-05-11T18:17:13Z"
          }
        },
        "ready": true,
        "restartCount": 0,
        "image": "openshift/mysql-55-centos7",
        "imageID": "docker://655aba0e23e560c958653ec30ba614a40c1a4d5a4bdb112e9ab04d94a5ba478e",
        "containerID": "docker://c2c01bd1598fd314ca78fe804af0242999c6146dd198e9f32e8066592c958a3f"
      }
    ]
  }
};
