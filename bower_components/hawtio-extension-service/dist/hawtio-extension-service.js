var HawtioExtensionService;
(function (HawtioExtensionService) {
  HawtioExtensionService.pluginName = 'hawtio-extension-service';
  HawtioExtensionService.templatePath = 'plugins/hawtio-extension-service/html';

  HawtioExtensionService._module = angular.module(HawtioExtensionService.pluginName, []);

  HawtioExtensionService._module.service('HawtioExtension',  function() {
    this._registeredExtensions = {};

    this.add = function(extensionPointName, fn) {
      if (!this._registeredExtensions[extensionPointName]) {
        this._registeredExtensions[extensionPointName] = [];
      }
      this._registeredExtensions[extensionPointName].push(fn);
    };

    this.render = function(extensionPointName, element, scope) {
      var fns = this._registeredExtensions[extensionPointName];
      if (!fns) {
        return;
      }

      for (var i = 0; i < fns.length; i++) {
        var toAppend = fns[i](scope);
        if (!toAppend) {
          return;
        }
        if (typeof toAppend == "string") {
          toAppend = document.createTextNode(toAppend);
        }
        element.append(toAppend);
      }
    }
  });

  HawtioExtensionService._module.directive('hawtioExtension', ["HawtioExtension", function(HawtioExtension) {
    return {
      restrict: 'EA',
      link: function(scope, element, attrs) {
        if (attrs.name) {
          HawtioExtension.render(attrs.name, element, scope);
        }
      }
    };
  }]);

  hawtioPluginLoader.addModule(HawtioExtensionService.pluginName);

})(HawtioExtensionService || (HawtioExtensionService = {}));
