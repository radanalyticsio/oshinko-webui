'use strict';

try { angular.module("openshiftUI") } catch(e) { angular.module("openshiftUI", []) }

angular.module("openshiftUI").requires.push("kubernetesUI");

angular.module('openshiftUI')
.filter('imageObjectRef', function(){
  return function(objectRef, /* optional */ nsIfUnspecified){
    var ns = objectRef.namespace || nsIfUnspecified;
    if (ns && objectRef.kind !== "DockerImage") {
      return ns + '/' + objectRef.name;
    }

    return objectRef.name;
  };
})
.run(function(KubernetesObjectDescriber) {
  KubernetesObjectDescriber.registerKind("Build", "views/build.html")
  KubernetesObjectDescriber.registerKind("DeploymentConfig", "views/deployment-config.html")
  KubernetesObjectDescriber.registerKind("Route", "views/route.html")
});
