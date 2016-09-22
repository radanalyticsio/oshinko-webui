Kubernetes Label Selector
========================

Provides a LabelSelector JavaScript object that understand kubernetes labels and label selector syntax, and works directly with JSON API objects from kubernetes.  Includes an AngularJS based label filtering widget.

Getting Started
---------------

LabelSelector and LabelFilter are provided in the kubernetes-label-selector bower package. To install run

```
bower install kubernetes-label-selector --save
```

If you only want to use the LabelSelector include the `labelSelector.js` file and the global will be available to you.

To use the LabelFilter service include the `labelFilter.js`, and optionally include the `labelFilter.css`. Make sure your angular app / module includes `kubernetesUI` as a module dependency.

```
angular.module('exampleApp', ['kubernetesUI'])
```

To see a simple running example git clone this repo and run `grunt serve`
This will make the `index.html` example available on [http://localhost:9000](http://localhost:9000)

LabelSelector
-------------

The LabelSelector global lets you match kubernetes label selectors to sets of resources.

```
// Create a new label selector
// 
// selector (optional) - the JSON format of a label selector as returned by k8s API
//      Example would be the label selector returned on a replication controller
// emptySelectsAll (optional) - whether a label selector with no conjuncts
//      selects objects.  Typical behavior is false.  Example of an
//      exceptional case is when filtering by labels, no label selectors
//      means no filters.
// returns - a new LabelSelector object
LabelSelector(selector, emptySelectsAll)

// Select from a set of k8s resources
//
// resources - the set of k8s API JSON resources to select from
// returns - a map of resource id to JSON object containing all resources that were selected
//       by the label selector
selects(resources)

// Check if a resource is selected by the label selector
//
// resource - the k8s API JSON resource to check
// returns - boolean, true if the label selector selected the resource
matches(resource)

// Check if this label selector covers another label selector.
//
// selector - the other label selector
// returns - boolean, true if everything selector selects would be selected by this
covers(selector)

// To modify what the LabelSelector will select see addConjunct, removeConjunct, and clearConjuncts
```

LabelFilter
-----------

The LabelFilter angular service keeps track of a single list of active label filters.  A widget can be rendered which allows the user to modify that list of filters.

### API

```
// Creates the filtering widget input inside of filterInputElement
// Creates the filtering widget active filters boxes inside of activeFiltersElement
// filterInputElement and activeFiltersElement should be empty HTML nodes
LabelFilter.setupFilterWidget(filterInputElement, activeFiltersElement)

// Shows/hides the filter widget
// show - if true the filter input and active filters elements will be shown, otherwise they will be hidden
LabelFilter.toggleFilterWidget(show)

// Takes a set of kubernetes API JSON resources and extracts the labels as label filter suggestions into the given map
// items - can be any of: a single kubernetes resource JSON, an array of resources, or a map of any values to resources
// map - a javascript object to be filled with any labels extracted from the items, allows for additive suggestion generation
LabelFilter.addLabelSuggestionsFromResources(items, map)

// Set the label filter's suggestions
// suggestions - a map of suggestions to add
LabelFilter.setLabelSuggestions(suggestions)
// It is recommended to use addLabelSuggestions to generate the suggestions map.  The alternative is to use the below format
// to create your own:
    LabelFilter.setLabelSuggestions({
        label_1: [
            {value: "value_1_1"},
            {value: "value_1_2"}
        ],
        label_2: [
            {value: "value_2_1"},
            {value: "value_2_2"}
        ]                    
    });

// Get the LabelSelector object that represents the active filters
// returns - labelSelector object with emptySelectsAll set to true
LabelFilter.getLabelSelector()

// Registers a callback to be fired any time the active filters change
// callbacks should accept a single parameter which is the current LabelSelector object
// that represents the active filters.
LabelFilter.onActiveFiltersChanged(function(labelSelector){})
```

### Theme


The example theme used in `index.html` is based on bootstrap, however bootstrap is not required as a bower dependency and you can change the theme however you want.

All icons are from [FontAwesome](http://fortawesome.github.io/Font-Awesome/icons/) which is included as a bower dependency.

### End user usage / screenshots

Example usage is from [OpenShift Origin](http://www.openshift.org/)

User first selects a label key.

![Selecting a label key](screenshots/labelFilterKey.png?raw=true)

Then chooses from the "in", "not in", and "exists" operators.

![Selecting a label selector operator](screenshots/labelFilterOperator.png?raw=true)

If they chose either "in" or "not in" then they select a set of values.

![Selecting label values(s)](screenshots/labelFilterValues.png?raw=true)

All active filters are visible.  They can all be cleared with one button, or individually cleared.

![Shows active filters](screenshots/labelFilterActiveFilters.png?raw=true)

Typeahead is supported for the key, operator, and value inputs. Users can add their own options if they do not see the suggestion they want.

![Typeahead to narrow user choices](screenshots/labelFilterTypeahead.png?raw=true)
