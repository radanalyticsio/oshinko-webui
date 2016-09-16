Kubernetes Object Describer
===========================

Provides an extendable describer for kubernetes resources. Includes an angular directive for rendering an instance of a describer.

#### Disclaimer
This is an early implementation and is subject to change. 

Getting Started
---------------

The kubernetes describer is provided in the kubernetes-object-describer bower package. 

To use the kubernetes-object-describer bower component in another project, run:

```
bower install kubernetes-object-describer --save
```

To use the describer service and directive include the `dist/object-describer.js`. Make sure your angular app / module includes `kubernetesUI` as a module dependency.

```
angular.module('exampleApp', ['kubernetesUI'])
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
<!-- Default generic describer -->
<kubernetes-object-describer resource="k8s-API-JSON-Object" more-details-link="optional/path/to/more/details.html"></kubernetes-object-describer>

<!-- Pod describer -->
<kubernetes-object-describer resource="k8s-API-JSON-Object" more-details-link="optional/path/to/more/details.html" kind="Pod"></kubernetes-object-describer>

<!-- Service describer -->
<kubernetes-object-describer resource="k8s-API-JSON-Object" more-details-link="optional/path/to/more/details.html" kind="Service"></kubernetes-object-describer>

<!-- ReplicationController describer -->
<kubernetes-object-describer resource="k8s-API-JSON-Object" more-details-link="optional/path/to/more/details.html" kind="ReplicationController"></kubernetes-object-describer>
```

Registering additional describers:

```
// Use the KubernetesObjectDescriber service to register additional kinds or custom templates for existing kinds
// kind - the kind of API object, ex: 'Pod'.  You can specify custom kind names here like "MyCustomPod".
// templateURLForKind - URL for the template to use when this Kind is passed to the <kubernetes-object-describer> directive
// overwrite - by default registerKind will not let you re-register an already registered kind, to overwrite the existing
//      template for a kind, pass overwrite=true
KubernetesObjectDescriber.registerKind(kind, templateURLForKind, overwrite)
```
#### Additional Directives

A number of smaller directives have been made available to help with writing custom templates.

* kubernetes-object-describe-header - renders a simple header, currently just renders the Kind according to the resource object
* kubernetes-object-describe-footer - renders a simple footer, currently renders the optional more-details-link
* kubernetes-object-describe-labels - renders any labels found on the resource
* kubernetes-object-describe-annotations - renders any annotations found on the resource
* kubernetes-object-describe-metadata - renders basic metadata (name, namespace, creationTimestamp) as well as labels and annotations
* kubernetes-object-describe-containers - renders details about the array of containers passed to it
* kubernetes-object-describe-volumes - renders details about the array of volumes passed to it

Theme
-----

The example theme used in `index.html` is based on bootstrap, however bootstrap is not required as a bower dependency and you can change the theme however you want.

Optional Features
-----------------

jQuery is not required as a dependency, but when it is available additional features will be turned on:

* collapsing long annotation values - when annotations have very long values they will be truncated and then can be clicked to expand

Future enhancements
-------------------

There are several enhancements being considered for future implementation.

* verbosity modes - terse/normal/verbose modes intended to work on different levels of screen real estate. Normal might fit into a right sidebar, whereas verbose would be a full page of detail.
* more describers - there are plenty of kubernetes Kinds that we don't have describers for yet
* sample theme improvements

Contributing
------------

Git clone this repo and run `grunt serve`. While the server is running, any time changes are made to the JS or HTML files the build will run automatically.  Before committing any changes run the `grunt build` task to make sure dist/object-describer.js has been updated and include the updated file in your commit.