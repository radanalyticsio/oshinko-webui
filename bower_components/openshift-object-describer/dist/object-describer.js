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

angular.module('kubernetesUI').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/build.html',
    "<div>\n" +
    "  <kubernetes-object-describe-header resource=\"resource\" kind=\"kind\"></kubernetes-object-describe-header>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt>Name</dt>\n" +
    "    <dd>{{resource.metadata.name}}</dd>\n" +
    "    <dt>Namespace</dt>\n" +
    "    <dd>{{resource.metadata.namespace}}</dd>\n" +
    "    <dt>Created</dt>\n" +
    "    <dd>{{resource.metadata.creationTimestamp | date:'medium'}}</dd>\n" +
    "  </dl>\n" +
    "  <h3>Build Configuration</h3>\n" +
    "  <dl class=\"dl-horizontal\" style=\"margin-bottom: 0;\">\n" +
    "    <dt>Strategy</dt>\n" +
    "    <dd>{{resource.spec.strategy.type}}</dd>\n" +
    "  </dl>\n" +
    "  <div ng-switch=\"resource.spec.strategy.type\">\n" +
    "    <div ng-switch-when=\"Source\">\n" +
    "      <div ng-if=\"resource.spec.strategy.sourceStrategy.from\">\n" +
    "        <dl class=\"dl-horizontal\" style=\"margin-bottom: 0;\">\n" +
    "          <dt>Kind</dt>\n" +
    "          <dd>{{resource.spec.strategy.sourceStrategy.from.kind}}</dd>\n" +
    "          <dt>Builder image</dt>\n" +
    "          <dd>{{resource.spec.strategy.sourceStrategy.from | imageObjectRef : resource.metadata.namespace}}</dd>\n" +
    "        </dl>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <div ng-switch-when=\"Docker\">\n" +
    "      <div ng-if=\"resource.spec.strategy.dockerStrategy.from\">\n" +
    "        <dl class=\"dl-horizontal\" style=\"margin-bottom: 0;\">\n" +
    "          <dt>Kind</dt>\n" +
    "          <dd>{{resource.spec.strategy.dockerStrategy.from.kind}}</dd>\n" +
    "          <dt>Builder image</dt>\n" +
    "          <dd>{{resource.spec.strategy.dockerStrategy.from | imageObjectRef : resource.metadata.namespace}}</dd>\n" +
    "        </dl>\n" +
    "      </div>\n" +
    "    </div>\n" +
    "    <div ng-switch-when=\"Custom\">\n" +
    "      <dl class=\"dl-horizontal\" style=\"margin-bottom: 0;\">\n" +
    "        <dt>Kind</dt>\n" +
    "        <dd>{{resource.spec.strategy.customStrategy.from.kind}}</dd>\n" +
    "        <dt>Builder image</dt>\n" +
    "        <dd>{{resource.spec.strategy.customStrategy.from | imageObjectRef : resource.metadata.namespace}}</dd>\n" +
    "      </dl>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div ng-if=\"resource.spec.source\">\n" +
    "    <div ng-if=\"resource.spec.source.type == 'Git'\">\n" +
    "      <dl class=\"dl-horizontal\" style=\"margin-bottom: 0;\">\n" +
    "        <dt>Source repo</dt>\n" +
    "        <dd>{{resource.spec.source.git.uri}}</dd>\n" +
    "        <dt>Source branch/tag/ref</dt>\n" +
    "        <dd>{{resource.spec.source.git.ref || 'master'}}</dd>\n" +
    "      </dl>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <h3>Status</h3>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt>Phase</dt>\n" +
    "    <dd>{{resource.status.phase}}</dd>\n" +
    "    <dt>Started</dt>\n" +
    "    <dd>\n" +
    "      <span ng-if=\"resource.status.startTimestamp\">{{resource.status.startTimestamp | date:'medium'}}</span>\n" +
    "      <span ng-if=\"!resource.status.startTimestamp\"><em>not started</em></span>\n" +
    "    </dd>\n" +
    "    <dt>Completed</dt>\n" +
    "    <dd>\n" +
    "      <span ng-if=\"resource.status.completionTimestamp\">{{resource.status.completionTimestamp | date:'medium'}}</span>\n" +
    "      <span ng-if=\"!resource.status.completionTimestamp\"><em>not complete</em></span>\n" +
    "    </dd>\n" +
    "  </dl>\n" +
    "  <kubernetes-object-describe-labels resource=\"resource\"></kubernetes-object-describe-labels>\n" +
    "  <kubernetes-object-describe-annotations resource=\"resource\"></kubernetes-object-describe-annotations>\n" +
    "  <kubernetes-object-describe-footer resource=\"resource\"></kubernetes-object-describe-footer>\n" +
    "</div>\n"
  );


  $templateCache.put('views/deployment-config.html',
    "<div>\n" +
    "  <kubernetes-object-describe-header resource=\"resource\" kind=\"kind\"></kubernetes-object-describe-header>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt>Name</dt>\n" +
    "    <dd>{{resource.metadata.name}}</dd>\n" +
    "    <dt>Namespace</dt>\n" +
    "    <dd>{{resource.metadata.namespace}}</dd>\n" +
    "    <dt>Created</dt>\n" +
    "    <dd>{{resource.metadata.creationTimestamp | date:'medium'}}</dd>\n" +
    "  </dl>\n" +
    "  <h3>Triggers</h3>\n" +
    "  <dl class=\"dl-horizontal\" ng-repeat=\"trigger in resource.spec.triggers\">\n" +
    "    <dt>Type</dt>\n" +
    "    <dd>{{trigger.type}}</dd>\n" +
    "    <dt ng-if-start=\"trigger.type == 'ImageChange' && trigger.imageChangeParams.from\">Image</dt>\n" +
    "    <dd ng-if-end>{{trigger.imageChangeParams.from | imageObjectRef : resource.metadata.namespace}}</dd>\n" +
    "  </dl>\n" +
    "  <h3>Replication Settings</h3>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt>Replicas</dt>\n" +
    "    <dd>{{resource.spec.replicas}}</dd>\n" +
    "  </dl>\n" +
    "  <h4>Selector</h4>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt ng-repeat-start=\"(selectorKey, selectorValue) in resource.spec.selector\">{{selectorKey}}</dt>\n" +
    "    <dd ng-repeat-end>{{selectorValue}}</dd>\n" +
    "  </dl>\n" +
    "  <kubernetes-object-describe-pod-template template=\"resource.spec.template.spec\"></kubernetes-object-describe-pod-template>\n" +
    "  <kubernetes-object-describe-labels resource=\"resource\"></kubernetes-object-describe-labels>\n" +
    "  <kubernetes-object-describe-annotations resource=\"resource\"></kubernetes-object-describe-annotations>\n" +
    "  <kubernetes-object-describe-footer resource=\"resource\"></kubernetes-object-describe-footer>\n" +
    "</div>\n"
  );


  $templateCache.put('views/route.html',
    "<div>\n" +
    "  <kubernetes-object-describe-header resource=\"resource\" kind=\"kind\"></kubernetes-object-describe-header>\n" +
    "  <dl class=\"dl-horizontal\">\n" +
    "    <dt>Name</dt>\n" +
    "    <dd>{{resource.metadata.name}}</dd>\n" +
    "    <dt>Namespace</dt>\n" +
    "    <dd>{{resource.metadata.namespace}}</dd>\n" +
    "    <dt>Created</dt>\n" +
    "    <dd>{{resource.metadata.creationTimestamp | date:'medium'}}</dd>\n" +
    "    <dt>Host</dt>\n" +
    "    <dd>{{resource.spec.host}}</dd>\n" +
    "    <dt>Path</dt>\n" +
    "    <dd>{{resource.spec.path || 'None'}}</dd>\n" +
    "    <dt>To</dt>\n" +
    "    <dd>{{resource.spec.to.kind}} {{resource.spec.to.name}}</dd>\n" +
    "  </dl>\n" +
    "  <div ng-if=\"resource.spec.tls.termination\">\n" +
    "    <dl class=\"dl-horizontal\">\n" +
    "      <dt>TLS Termination</dt>\n" +
    "      <dd>{{resource.spec.tls.termination}}</dd>\n" +
    "      <dt>Certificate</dt>\n" +
    "      <dd>{{(resource.spec.tls.certificate) ? '*****' : 'None'}}</dd>\n" +
    "      <dt>Key</dt>\n" +
    "      <dd>{{(resource.spec.tls.key) ? '*****' : 'None'}}</dd>\n" +
    "      <dt>CA Certificate</dt>\n" +
    "      <dd>{{(resource.spec.tls.caCertificate) ? '*****' : 'None'}}</dd>\n" +
    "      <dt>Destination CA Cert</dt>\n" +
    "      <dd>{{(resource.spec.tls.destinationCACertificate) ? '*****' : 'None'}}</dd>\n" +
    "    </dl>\n" +
    "  </div>\n" +
    "  <kubernetes-object-describe-labels resource=\"resource\"></kubernetes-object-describe-labels>\n" +
    "  <kubernetes-object-describe-annotations resource=\"resource\"></kubernetes-object-describe-annotations>\n" +
    "  <kubernetes-object-describe-footer resource=\"resource\"></kubernetes-object-describe-footer>\n" +
    "</div>\n"
  );

}]);
