window.EXAMPLE_RC = {
  "kind": "ReplicationController",
  "apiVersion": "v1",
  "metadata": {
    "name": "database-1",
    "namespace": "test",
    "selfLink": "/api/v1/namespaces/test/replicationcontrollers/database-1",
    "uid": "4ee3fd17-d3e7-11e4-92f6-54ee75107c12",
    "resourceVersion": "22681",
    "creationTimestamp": "2015-03-26T18:38:34Z",
    "labels": {
      "template": "my-template"
    },
    "annotations": {
      "deploymentConfig": "database",
      "deploymentStatus": "Complete",
      "deploymentVersion": "1",
      "encodedDeploymentConfig": "{\"kind\":\"DeploymentConfig\",\"apiVersion\":\"v1beta1\",\"metadata\":{\"name\":\"database\",\"namespace\":\"test\",\"selfLink\":\"/osapi/v1beta1/deploymentConfigs/database?namespace=test\",\"uid\":\"362d0590-e208-11e4-bdc4-54ee75107c12\",\"resourceVersion\":\"99\",\"creationTimestamp\":\"2015-04-13T18:09:22Z\",\"labels\":{\"template\":\"application-template-stibuild\"}},\"triggers\":[{\"type\":\"ConfigChange\"}],\"template\":{\"strategy\":{\"type\":\"Recreate\"},\"controllerTemplate\":{\"replicas\":1,\"replicaSelector\":{\"name\":\"database\"},\"podTemplate\":{\"desiredState\":{\"manifest\":{\"version\":\"v1beta2\",\"id\":\"\",\"volumes\":null,\"containers\":[{\"name\":\"ruby-helloworld-database\",\"image\":\"openshift/mysql-55-centos7\",\"ports\":[{\"containerPort\":3306,\"protocol\":\"TCP\"}],\"env\":[{\"name\":\"MYSQL_USER\",\"key\":\"MYSQL_USER\",\"value\":\"userTJW\"},{\"name\":\"MYSQL_PASSWORD\",\"key\":\"MYSQL_PASSWORD\",\"value\":\"HOtpCU67\"},{\"name\":\"MYSQL_DATABASE\",\"key\":\"MYSQL_DATABASE\",\"value\":\"root\"}],\"resources\":{},\"terminationMessagePath\":\"/dev/termination-log\",\"imagePullPolicy\":\"PullIfNotPresent\",\"capabilities\":{}}],\"restartPolicy\":{\"always\":{}},\"dnsPolicy\":\"ClusterFirst\"}},\"labels\":{\"name\":\"database\",\"template\":\"application-template-stibuild\"}}}},\"latestVersion\":1,\"details\":{\"causes\":[{\"type\":\"ConfigChange\"}]}}"
    }
  },
  "spec": {
    "replicas": 1,
    "selector": {
      "deployment": "database-1",
      "deploymentconfig": "database",
      "name": "database"
    },
    "template": {
      "metadata": {
        "creationTimestamp": null,
        "labels": {
          "deployment": "database-1",
          "deploymentconfig": "database",
          "name": "database",
          "template": "my-template"
        },
        "annotations": {
          "deployment": "database-1",
          "deploymentConfig": "database",
          "deploymentVersion": "1"
        }
      },
      "spec": {
        "volumes": null,
        "containers": [
          {
            "name": "helloworld-database",
            "image": "mysql",
            "ports": [
              {
                "containerPort": 3306,
                "protocol": "TCP"
              }
            ],
            "env": [
              {
                "name": "MYSQL_USER",
                "value": "userC06"
              },
              {
                "name": "MYSQL_PASSWORD",
                "value": "JuYjxiAt"
              },
              {
                "name": "MYSQL_DATABASE",
                "value": "root"
              },
              {
                "name": "CA_DATA",
                "value": "-----BEGIN CERTIFICATE----- MIIC5jCCAdCgAwIBAgIBATALBgkqhkiG9w0BAQswJjEkMCIGA1UEAwwbb3BlbnNo aWZ0LXNpZ25lckAxNDMyMTI5NDc4MB4XDTE1MDUyMDEzNDQzOFoXDTE2MDUxOTEz NDQzOVowJjEkMCIGA1UEAwwbb3BlbnNoaWZ0LXNpZ25lckAxNDMyMTI5NDc4MIIB IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxBidgLz/rUJZtHtBsw1uj5qQ IUxRPA5d0SNp5gF39GCcLUATCrmt6ZdquQpSA1siPzYApk9ODzR4y5V9Uuz7Vh5N XQqgSisO9Id5/hNBc3RywQTlTXBYfVvoaAYWWBBymG3YS7ZZCS596ipctCBbM7vI Q82MHKqmect6yOKLqoBzZkbxqXxwC2wu7pLBQ2fKuHuMU1eN8R4fPXggLuwx6tmn DnnfGvGf+r5v1kjhcJrEppqIm3BEk8df/czzLZouBgDNDp7IuvRgekKCiMl6YlbA C3ayy5AiULUPOebhsKMgWpyCAI+FWXQz23rE/4AByJxluMkYK1hi494gCohvxQID AQABoyMwITAOBgNVHQ8BAf8EBAMCAKQwDwYDVR0TAQH/BAUwAwEB/zALBgkqhkiG 9w0BAQsDggEBADSzmTnG15aTn/9OoWQHXmo1qGR/ItVkluOIK3t/J47gHXoqj3Ki Io/KLxOFJrwBMX2FYJT62/QXaKLbSMryP41uyunhNHvr0I/Vk0ypR9X6JSAFg4FY +Z2UCR2j5Bwq0QeNZE3rdGxCP+EwLcdPlqcWPSDtAs3QcKEMQdXJdyHXbr3oocd0 DpUj3ZvImRvzjECic7kBZwsa+KpnbqhuFXO//s0978ts6vWzUKn2rEvnZUcfrzdG ERpgM1G56yVE2Q1RErcb8PBg/3TGMDDqG23J+8cWaq0LwfpR4xEGZUTVJhe4eBVf WCllMNj7WZ0a6hoByFNNhPOFXgrrgPTvY9M= -----END CERTIFICATE-----"
              }
            ],
            "resources": {},
            "terminationMessagePath": "/dev/termination-log",
            "imagePullPolicy": "IfNotPresent"
          }
        ],
        "restartPolicy": "Always",
        "dnsPolicy": "ClusterFirst",
        "serviceAccountName": "default"
      }
    }
  },
  "status": {
    "replicas": 1
  }
};
