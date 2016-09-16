OpenShift Object Describer
===========================

Provides extensions to the [kubernetes-object-describer](https://github.com/kubernetes-ui/object-describer) for OpenShift's resources.

#### Disclaimer
This is an early implementation and is subject to change. 

Getting Started
---------------

The OpenShift describers are provided in the openshift-object-describer bower package. To install run

```
bower install openshift-object-describer --save
```

To use the extensions include the `dist/object-describer.js`. Make sure your angular app / module includes `openshiftUI` as a module dependency.

```
angular.module('exampleApp', ['openshiftUI'])
```

To see a simple running example git clone this repo and run

```
npm install
bower install
grunt serve
```

This will install any required dependencies and then make the `index.html` example available on [http://localhost:9000](http://localhost:9000)

Usage
-----

Using the existing describers:

```
<!-- Build describer -->
<kubernetes-object-describer resource="k8s-API-JSON-Object" more-details-link="optional/path/to/more/details.html" kind="Build"></kubernetes-object-describer>
```

Theme
-----

The example theme used in `index.html` is based on bootstrap, however bootstrap is not required as a bower dependency and you can change the theme however you want.