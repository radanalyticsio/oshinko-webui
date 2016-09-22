## hawtio-extension-service

A plugin that provides an extension registration service and rendering directive.  Extension points are named locations in a UI that other plugins can register callbacks which will add to the DOM.

### Basic usage
#### Install the bower package
`bower install --save hawtio-extension-service`

#### Register an extension point callback
In your hawtio plugin you can register an extension point callback like:

```
  var module = angular.module("MyAwesomePlugin", []);

  module.config(['HawtioExtension', function(HawtioExtension) {
    // Register an extension point callback that returns a string.
    // When a string is returned it will NOT be converted to HTML
    // but will be added as a text node.
    HawtioExtension.add("someExtensionPoint", function(scope){
      return "Some important text!";
    });

    // Register an extension point callback that returns a DOM element
    // When a DOM element is returned it will be appended to the containing
    // <div> of the extension point
    HawtioExtension.add("someExtensionPoint", function(scope){
      var div = document.createElement("div");
      div.className = "awesome";
      div.appendChild(document.createTextNode("I can add stuff!"));

      return div;
    });

    // Register an extension point callback that returns null.
    // Use this if you do not need to append something directly to the extension
    // point but want to make sure some javascript is run when that extension point
    // is rendered.
    HawtioExtension.add("someExtensionPoint", function(scope){
      // some javascript here that does whatever you want
      return null;
    });    
  }]);

  hawtioPluginLoader.addModule("MyAwesomePlugin");
```

It is important to note that currently callbacks are rendered in the order they were registered.  In the future we may extend the registration API to include a priority.


#### Render an extension point
Any plugin can choose to render all the registered callbacks for an extension point.

##### Using the directive in an angular template (recommended)
```
<div>
  <h1>Some HTML template for my module</h1>
  <hawtio-extension name="someExtensionPoint"></hawtio-extension>
</div>
```

##### Using the render API
Using the directive method above is recommended in most cases, but does pass down whatever
the current scope is into the callbacks so that they have the same data available to them.
If you want to restrict the data passed down to the callbacks then you can call the service's
render API directly.
```
// Where element is the DOM node that the results of all the callbacks
// will be appended to, and scope is whatever data you want to make available
// to the callbacks.
HawtioExtension.render(extensionPointName, element, scope);
```