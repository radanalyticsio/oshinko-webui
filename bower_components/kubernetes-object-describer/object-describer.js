'use strict';

try { angular.module("kubernetesUI") } catch(e) { angular.module("kubernetesUI", []) }

angular.module('kubernetesUI')
.factory('KubernetesObjectDescriber', [function() {
  function KubernetesObjectDescriber() {
    this.kinds = {
      "Pod" : {
        templateUrl: "views/pod.html"
      },
      "Service" : {
        templateUrl: "views/service.html"
      },
      "ReplicationController" : {
        templateUrl: "views/replication-controller.html"
      }  
    };
  }

  KubernetesObjectDescriber.prototype.registerKind = function(kind, templateUrl, overwrite) {
    if (this.kinds[kind] && !overwrite) {
      throw "KubernetesObjectDescriber.registerKind :: kind " + kind + " is already registered."
    }
    if (!templateUrl) {
      throw "KubernetesObjectDescriber.registerKind :: templateUrl is required."
    }
    this.kinds[kind] = {
      templateUrl: templateUrl
    };
  };

  KubernetesObjectDescriber.prototype.templateUrlForKind = function(kind) {
    if (kind && this.kinds[kind]) {
      return this.kinds[kind].templateUrl;
    }
    return 'views/default-describer.html';
  };

  return new KubernetesObjectDescriber();
}])
.directive("kubernetesObjectDescriber", [
    "KubernetesObjectDescriber",
    "$templateCache",
    "$compile",
    function(KubernetesObjectDescriber, $templateCache, $compile) {
  return {
    restrict: 'E',
    scope: {
      resource: '=',
      kind: '@',
      moreDetailsLink: '@'
    },
    link: function(scope, element, attrs) {
      var compileTemplate = function() {
        // TODO test this for any potential XSS vulnerabilities
        var templateUrl = KubernetesObjectDescriber.templateUrlForKind(scope.kind);
        element.html($templateCache.get(templateUrl));
        $compile(element.contents())(scope);
      };

      // Initial template compilation based on the current kind
      compileTemplate();

      // Any time the kind changes, find the new template and compile it
      scope.$watch('kind', function(newValue, oldValue) {
        if (newValue != oldValue) {
          compileTemplate();
        }
      });
    }
  }
}])
.directive("kubernetesObjectDescribeLabels", function() {
  return {
    restrict: 'E',
    scope: {
      resource: '='
    },
    templateUrl: 'views/labels.html'
  }
})
.directive("kubernetesObjectDescribeAnnotations", function() {
  return {
    restrict: 'E',
    scope: {
      resource: '='
    },
    templateUrl: 'views/annotations.html'
  }
})
.directive("kubernetesObjectDescribeMetadata", function() {
  return {
    restrict: 'E',
    scope: {
      resource: '='
    },
    templateUrl: 'views/metadata.html'
  }
})
.directive("kubernetesObjectDescribeHeader", function() {
  return {
    restrict: 'E',
    scope: {
      resource: '=',
      kind: '='
    },
    templateUrl: 'views/header.html'
  }
})
.directive("kubernetesObjectDescribeFooter", function() {
  return {
    restrict: 'E',
    scope: {
      resource: '='
    },
    templateUrl: 'views/footer.html'
  }
})
.directive("kubernetesObjectDescribePodTemplate", function() {
  return {
    restrict: 'E',
    scope: {
      template: '='
    },
    templateUrl: 'views/pod-template.html'
  }
})
.directive("kubernetesObjectDescribeVolumes", function() {
  return {
    restrict: 'E',
    scope: {
      volumes: '='
    },
    templateUrl: 'views/volumes.html'
  }
})
.directive("kubernetesObjectDescribeContainers", function() {
  return {
    restrict: 'E',
    scope: {
      containers: '='
    },
    templateUrl: 'views/containers.html'
  }
})
.directive("kubernetesObjectDescribeContainerStatuses", function() {
  return {
    restrict: 'E',
    scope: {
      containerStatuses: '='
    },
    templateUrl: 'views/container-statuses.html'
  };
})
.directive("kubernetesObjectDescribeContainerState", function() {
  return {
    restrict: 'E',
    scope: {
      containerState: '='
    },
    templateUrl: 'views/container-state.html'
  };
})
.directive("collapseLongText", function() {
  return {
    restrict: 'A',
    scope: {
      value: '@',
      enableCollapse: '=?' // not intended to be passed in, it will be set depending on jquery availability
    },
    controller: ["$scope", function($scope) {
      // If jquery is available
      $scope.enableCollapse = !!window.$;
    }],
    link: function($scope, element, attrs) {
      if ($scope.enableCollapse) {
        $('.reveal-contents-link', element).click(function (evt) {
          $(this).hide();
          $('.reveal-contents', element).show();
        });  
      }
    },    
    templateUrl: 'views/_collapse-long-text.html'
  }
})
.filter("isEmptyObj", function() {
  return function(obj) {
    return angular.equals({}, obj);
  };
});
