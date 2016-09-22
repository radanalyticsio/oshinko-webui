window.EXAMPLE_BUILD = {
  "metadata": {
    "name": "ruby-sample-build-1",
    "namespace": "project1",
    "selfLink": "/oapi/v1/namespaces/project1/builds/ruby-sample-build-1",
    "uid": "02ba97be-0620-11e5-82b1-0aa865aec90d",
    "resourceVersion": "369",
    "creationTimestamp": "2015-05-29T16:30:25Z",
    "labels": {
      "buildconfig": "ruby-sample-build",
      "name": "ruby-sample-build",
      "template": "application-template-stibuild"
    }
  },
  "spec": {
    "source": {
      "type": "Git",
      "git": {
        "uri": "git://github.com/openshift/ruby-hello-world.git"
      }
    },
    "strategy": {
      "type": "Source",
      "sourceStrategy": {
        "from": {
          "kind": "DockerImage",
          "name": "openshift/ruby-20-centos7:latest"
        },
        "incremental": true
      }
    },
    "output": {
      "to": {
        "kind": "ImageStreamTag",
        "name": "origin-ruby-sample:latest"
      }
    },
    "resources": {}
  },
  "status": {
    "phase": "Complete",
    "startTimestamp": "2015-05-29T16:30:27Z",
    "completionTimestamp": "2015-05-29T16:31:46Z",
    "duration": 79000000000,
    "config": {
      "kind": "BuildConfig",
      "namespace": "project1",
      "name": "ruby-sample-build"
    }
  }
};
