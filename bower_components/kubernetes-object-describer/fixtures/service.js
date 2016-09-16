window.EXAMPLE_SERVICE = {
  "kind": "Service",
  "apiVersion": "v1",
  "metadata": {
    "name": "database",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/services/database",
    "uid": "4ed21ab1-d3e7-11e4-92f6-54ee75107c12",
    "resourceVersion": "102",
    "creationTimestamp": "2015-03-26T18:38:34Z",
    "labels": {
      "template": "my-template"
    }
  },
  "spec": {
    "ports": [
      {
        "name": "",
        "protocol": "TCP",
        "port": 5434,
        "targetPort": 3306
      },
      {
        "name": "two",
        "protocol": "TCP",
        "port": 5435,
        "targetPort": 3307
      },
      {
        "name": "three",
        "protocol": "UDP",
        "port": 5436,
        "targetPort": 3308
      }
    ],
    "selector": {
      "name": "database"
    },
    "type": "ClusterIP",
    "clusterIP": "172.30.17.6",
    "sessionAffinity": "ClientIP"
  },
  "status": {}
};

window.EXAMPLE_HEADLESS_SERVICE = {
  "kind": "Service",
  "apiVersion": "v1",
  "metadata": {
    "name": "headless",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/services/headless",
    "uid": "16e6dee1-e922-11e4-894c-0296ae7c2489",
    "resourceVersion": "102",
    "creationTimestamp": "2015-04-22T19:02:15Z",
    "labels": {
      "template": "my-template"
    }
  },
  "spec": {
    "ports": [],
    "selector": {
      "name": "headless"
    },
    "type": "ClusterIP",
    "clusterIP": "None",
    "sessionAffinity": "None"
  },
  "status": {}
};

window.EXAMPLE_NODE_PORT_SERVICE = {
  "kind": "Service",
  "apiVersion": "v1",
  "metadata": {
    "name": "node-port",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/services/node-port",
    "uid": "4ed21ab1-d3e7-11e4-92f6-54ee75107c99",
    "resourceVersion": "104",
    "creationTimestamp": "2015-03-26T18:38:34Z",
    "labels": {
      "template": "my-template"
    }
  },
  "spec": {
    "ports": [
      {
        "name": "",
        "protocol": "TCP",
        "nodePort": 30060,
        "port": 5434,
        "targetPort": 3306
      },
      {
        "name": "two",
        "protocol": "TCP",
        "nodePort": 30061,
        "port": 5435,
        "targetPort": 3307
      }
    ],
    "selector": {
      "name": "node-port"
    },
    "type": "NodePort",
    "clusterIP": "172.30.17.6",
    "sessionAffinity": "None"
  },
  "status": {}
};

window.EXAMPLE_LOAD_BALANCED_SERVICE = {
  "kind": "Service",
  "apiVersion": "v1",
  "metadata": {
    "name": "load-balanced",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/services/load-balanced",
    "uid": "4ed21ab1-d3e7-11e4-92f6-54ee75107c56",
    "resourceVersion": "104",
    "creationTimestamp": "2015-03-26T18:38:34Z",
    "labels": {
      "template": "my-template"
    }
  },
  "spec": {
    "ports": [
      {
        "name": "",
        "protocol": "TCP",
        "nodePort": 30060,
        "port": 5434,
        "targetPort": 3306
      },
      {
        "name": "two",
        "protocol": "TCP",
        "nodePort": 30061,
        "port": 5435,
        "targetPort": 3307
      }
    ],
    "selector": {
      "name": "load-balanced"
    },
    "type": "LoadBalancer",
    "clusterIP": "172.30.17.6",
    "sessionAffinity": "None",
    "type": "LoadBalancer"
  },
  "status": {
    "loadBalancer": {
      "ingress": [
        {
          "ip": "146.148.47.155"
        },
        {
          "ip": "146.148.47.156"
        }
      ]
    }
  }
};
