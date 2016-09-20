// selector (optional) - the JSON format as returned by k8s API, will also
//      handle {key: null} as the key exists operator (not currently returned
//      by API)
// emptySelectsAll (optional) - whether a label selector with no conjuncts
//      selects objects.  Typical behavior is false.  Example of an
//      exceptional case is when filtering by labels, no label selectors
//      means no filters.
function LabelSelector(selector, emptySelectsAll) {
  this._conjuncts = {};
  this._emptySelectsAll = !!emptySelectsAll;
  // expects the JSON format as returned by k8s API
  // TODO - currently k8s only returns key: value
  // which represents 'key in (value)'
  // for now also handle key: null as key exists
  if (selector) {
    angular.forEach(selector, function(details, key) {
      if (details || details === "") {
        this.addConjunct(key, "in", [details]);
      }
      else {
       this.addConjunct(key, "exists", []); 
      }
    }, this);
  }
}

LabelSelector.prototype.addConjunct = function(key, operator, values) {
  var conjunct = {
    key: key,
    operator: operator,
    values: values
  };
  var id = this._getIdForConjunct(conjunct);
  this._conjuncts[id] = conjunct;
  conjunct.id = id;
  conjunct.string = this._getStringForConjunct(conjunct);
  return conjunct;
};

// Can accept either the id of the conjunct to remove, or the conjunct
// object that was returned from a call to addConjunct
LabelSelector.prototype.removeConjunct = function(conjunct) {
  if (conjunct.id) {
    delete this._conjuncts[conjunct.id];  
  }
  else {
    delete this._conjuncts[conjunct];
  }
};

LabelSelector.prototype.clearConjuncts = function() {
  this._conjuncts = {};
};

LabelSelector.prototype.isEmpty = function() {
  return $.isEmptyObject(this._conjuncts);
};

LabelSelector.prototype.each = function(fn) {
  angular.forEach(this._conjuncts, fn);
};

LabelSelector.prototype.select = function(resources) {
  var selectedResources = {};
  var self = this;
  angular.forEach(resources, function(resource, resId) {
    if (self.matches(resource)) {
      selectedResources[resId] = resource;
    }
  });
  return selectedResources;
};

LabelSelector.prototype.matches = function(resource) {
  if (!resource) {
    return false;
  }
  if (this.isEmpty()) {
    return this._emptySelectsAll;
  }
  var labels = resource.labels || {};
  if (resource.metadata) {
    labels = resource.metadata.labels || {};
  }
  for (var id in this._conjuncts) {
    var conjunct = this._conjuncts[id];
    switch(conjunct.operator) {
      case "exists":
        if (!labels[conjunct.key] && labels[conjunct.key] !== "") {
          return false;
        }
        break;
      case "in":
        var found = false;
        if (labels[conjunct.key] || labels[conjunct.key] === "") {
          for (var i = 0; !found && i < conjunct.values.length; i++) {
            if (labels[conjunct.key] == conjunct.values[i]) {
              found = true;
            }
          }
        }
        if (!found) {
          return false;
        }
        break;
      case "not in":
        var keep = true;
        if (labels[conjunct.key]) {
          for (var i = 0; keep && i < conjunct.values.length; i++) {
            keep = labels[conjunct.key] != conjunct.values[i];
          }
        }
        if (!keep) {
          return false;
        }
    }
  }
  return true;
};  

LabelSelector.prototype.hasConjunct = function(conjunct) {
  return this._conjuncts[this._getIdForConjunct(conjunct)] ? true : false;
};

// Test whether this label selector covers the given selector
LabelSelector.prototype.covers = function(selector) {
  if (this.isEmpty()) {
    // TODO don't think we ever want to consider an empty
    // label selector as covering any other label selector
    return false;
  }

  // TODO - currently k8s only returns key: value
  // which represents 'key in (value)'  So we only handle
  // the IN operator with single values for now
  for (var id in this._conjuncts) {
    if (!selector.hasConjunct(this._conjuncts[id])) {
      return false;
    }
  }
  return true;
};

// We assume label values have no whitespace, commas, parens, etc. based
// on k8s def for label values
LabelSelector.prototype._getStringForConjunct = function(conjunct) {
  var conjunctString = conjunct.key;
  if (conjunct.operator != "exists") {
    if (conjunct.operator == "not in") {
      conjunctString += " not";
    }
    conjunctString += " in (";
    for (var i = 0; i < conjunct.values.length; i++) {
      if (conjunct.values[i] === '') {
        conjunctString += "\"\"";
      }
      else {
        conjunctString += conjunct.values[i];
      }
      if (i != conjunct.values.length - 1) {
        conjunctString += ", ";
      }
    }
    conjunctString += ")";
  }
  return conjunctString;
};

LabelSelector.prototype._getIdForConjunct = function(conjunct) {
  return conjunct.key + "-" + conjunct.operator + "-" + conjunct.values.join(",");
}; 