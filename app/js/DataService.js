'use strict';
/**
 * @name  openshiftCommonServices
 *
 * @description
 *   Base module for openshiftCommonServices.
 */

// ResourceGroupVersion represents a fully qualified resource
function ResourceGroupVersion(resource, group, version) {
  this.resource = resource;
  this.group    = group;
  this.version  = version;
  return this;
}
// toString() includes the group and version information if present
ResourceGroupVersion.prototype.toString = function() {
  var s = this.resource;
  if (this.group)   { s += "/" + this.group;   }
  if (this.version) { s += "/" + this.version; }
  return s;
};
// primaryResource() returns the resource with any subresources removed
ResourceGroupVersion.prototype.primaryResource = function() {
  if (!this.resource) { return ""; }
  var i = this.resource.indexOf('/');
  if (i === -1) { return this.resource; }
  return this.resource.substring(0,i);
};
// subresources() returns a (possibly empty) list of subresource segments
ResourceGroupVersion.prototype.subresources = function() {
  var segments = (this.resource || '').split("/");
  segments.shift();
  return segments;
};
// equals() returns true if the given resource, group, and version match.
// If omitted, group and version are not compared.
ResourceGroupVersion.prototype.equals = function(resource, group, version) {
  if (this.resource !== resource) { return false; }
  if (arguments.length === 1)     { return true;  }
  if (this.group !== group)       { return false; }
  if (arguments.length === 2)     { return true;  }
  if (this.version !== version)   { return false; }
  return true;
};


angular.module('Oshinko')
  .factory('DataService', ["$cacheFactory", "$http", "$ws", "$rootScope", "$q", "Logger", "$timeout", "base64", "base64util", "APIService", function($cacheFactory, $http, $ws, $rootScope, $q, Logger, $timeout, base64, base64util, APIService) {

    function Data(array) {
      this._data = {};
      this._objectsByAttribute(array, "metadata.name", this._data);
    }

    Data.prototype.by = function(attr) {
      // TODO store already generated indices
      if (attr === "metadata.name") {
        return this._data;
      }
      var map = {};
      for (var key in this._data) {
        _objectByAttribute(this._data[key], attr, map, null);
      }
      return map;

    };

    Data.prototype.update = function(object, action) {
      _objectByAttribute(object, "metadata.name", this._data, action);
    };


    // actions is whether the object was (ADDED|DELETED|MODIFIED).  ADDED is assumed if actions is not
    // passed.  If objects is a hash then actions must be a hash with the same keys.  If objects is an array
    // then actions must be an array of the same order and length.
    Data.prototype._objectsByAttribute = function(objects, attr, map, actions) {
      angular.forEach(objects, function(obj, key) {
        _objectByAttribute(obj, attr, map, actions ? actions[key] : null);
      });
    };

    // Handles attr with dot notation
    // TODO write lots of tests for this helper
    // Note: this lives outside the Data prototype for now so it can be used by the helper in DataService as well
    function _objectByAttribute(obj, attr, map, action) {
      var subAttrs = attr.split(".");
      var attrValue = obj;
      for (var i = 0; i < subAttrs.length; i++) {
        attrValue = attrValue[subAttrs[i]];
        if (attrValue === undefined) {
          return;
        }
      }

      if ($.isArray(attrValue)) {
        // TODO implement this when we actually need it
      }
      else if ($.isPlainObject(attrValue)) {
        for (var key in attrValue) {
          var val = attrValue[key];
          if (!map[key]) {
            map[key] = {};
          }
          if (action === "DELETED") {
            delete map[key][val];
          }
          else {
            map[key][val] = obj;
          }
        }
      }
      else {
        if (action === "DELETED") {
          delete map[attrValue];
        }
        else {
          map[attrValue] = obj;
        }
      }
    }

    // If several connection errors happen close together, display them as one
    // notification. This prevents us spamming the user with many failed requests
    // at once.
    var queuedErrors = [];
    var addQueuedNotifications = _.debounce(function() {
      if (!queuedErrors.length) {
        return;
      }

      // Show all queued messages together. If the details is extremely long, it
      // will be truncated with a see more link.
      var notification = {
        type: 'error',
        message: 'An error occurred connecting to the server.',
        details: queuedErrors.join('\n'),
        links: [{
          label: 'Refresh',
          onClick: function() {
            window.location.reload();
          }
        }]
      };

      // Use `$rootScope.$emit` instead of NotificationsService directly
      // so that DataService doesn't add a dependency on `openshiftCommonUI`
      $rootScope.$emit('NotificationsService.addNotification', notification);

      // Clear the queue.
      queuedErrors = [];
    }, 300, { maxWait: 1000 });

    var showRequestError = function(message, status) {
      if (status) {
        message += " (status " + status + ")";
      }
      // Queue the message and call debounced `addQueuedNotifications`.
      queuedErrors.push(message);
      addQueuedNotifications();
    };

    function DataService() {
      this._listDeferredMap = {};
      this._watchCallbacksMap = {};
      this._watchObjectCallbacksMap = {};
      this._watchOperationMap = {};
      this._listOperationMap = {};
      this._resourceVersionMap = {};
      this._dataCache = $cacheFactory('dataCache', {
        // 25 is a reasonable number to keep at least one or two projects worth of data in cache
        number: 25
      });
      this._immutableDataCache = $cacheFactory('immutableDataCache', {
        // 50 is a reasonable number for the immutable resources that are stored per resource instead of grouped by type
        number: 50
      });
      this._watchOptionsMap = {};
      this._watchWebsocketsMap = {};
      this._watchPollTimeoutsMap = {};
      this._websocketEventsMap = {};

      var self = this;
      $rootScope.$on( "$routeChangeStart", function(event, next, current) {
        self._websocketEventsMap = {};
      });
    }

// resource:  API resource (e.g. "pods")
// context:   API context (e.g. {project: "..."})
// callback:  (optional) function to be called with the list of the requested resource and context,
//            parameters passed to the callback:
//            Data:   a Data object containing the (context-qualified) results
//                    which includes a helper method for returning a map indexed
//                    by attribute (e.g. data.by('metadata.name'))
// opts:      http - options to pass to the inner $http call
//
// returns a promise
    DataService.prototype.list = function(resource, context, callback, opts) {
      resource = APIService.toResourceGroupVersion(resource);
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
      var deferred = this._listDeferred(key);
      if (callback) {
        deferred.promise.then(callback);
      }

      if (this._isCached(key)) {
        // A watch operation is running, and we've already received the
        // initial set of data for this resource
        deferred.resolve(this._data(key));
      }
      else if (this._listInFlight(key)) {
        // no-op, our callback will get called when listOperation completes
      }
      else {
        this._startListOp(resource, context, opts);
      }
      return deferred.promise;
    };

// resource:  API resource (e.g. "pods")
// name:      API name, the unique name for the object
// context:   API context (e.g. {project: "..."})
// opts:
//   http - options to pass to the inner $http call
//   gracePeriodSeconds - duration in seconds to wait before deleting the resource
// Returns a promise resolved with response data or rejected with {data:..., status:..., headers:..., config:...} when the delete call completes.
    DataService.prototype.delete = function(resource, name, context, opts) {
      resource = APIService.toResourceGroupVersion(resource);
      opts = opts || {};
      var deferred = $q.defer();
      var self = this;
      var data, headers = {};
      var data = {
        kind: "DeleteOptions",
        apiVersion: "v1"
      };
      if (_.has(opts, 'propagationPolicy')) {
        // Use a has check so that explicitly setting propagationPolicy to null passes through and doesn't fallback to default behavior
        data.propagationPolicy = opts.propagationPolicy;
      }
      else {
        // Default to "Foreground" (cascading) if no propagationPolicy was given.
        data.propagationPolicy = 'Foreground';
      }
      var headers = {
        'Content-Type': 'application/json'
      };
      // Differentiate between 0 and undefined
      if (_.has(opts, 'gracePeriodSeconds')) {
        data.gracePeriodSeconds = opts.gracePeriodSeconds;
      }
      this._getNamespace(resource, context, opts).then(function(ns){
        $http(angular.extend({
          method: 'DELETE',
          auth: {},
          data: data,
          headers: headers,
          url: self._urlForResource(resource, name, context, false, ns)
        }, opts.http || {}))
          .success(function(data, status, headerFunc, config, statusText) {
            deferred.resolve(data);
          })
          .error(function(data, status, headers, config) {
            deferred.reject({
              data: data,
              status: status,
              headers: headers,
              config: config
            });
          });
      });
      return deferred.promise;
    };


// resource:  API resource (e.g. "pods")
// name:      API name, the unique name for the object
// object:    API object data(eg. { kind: "Build", parameters: { ... } } )
// context:   API context (e.g. {project: "..."})
// opts:      http - options to pass to the inner $http call
// Returns a promise resolved with response data or rejected with {data:..., status:..., headers:..., config:...} when the delete call completes.
    DataService.prototype.update = function(resource, name, object, context, opts) {
      resource = APIService.deriveTargetResource(resource, object);
      opts = opts || {};
      var deferred = $q.defer();
      var self = this;
      this._getNamespace(resource, context, opts).then(function(ns){
        $http(angular.extend({
          method: 'PUT',
          auth: {},
          data: object,
          url: self._urlForResource(resource, name, context, false, ns)
        }, opts.http || {}))
          .success(function(data, status, headerFunc, config, statusText) {
            deferred.resolve(data);
          })
          .error(function(data, status, headers, config) {
            deferred.reject({
              data: data,
              status: status,
              headers: headers,
              config: config
            });
          });
      });
      return deferred.promise;
    };

// TODO: Enable PATCH when it's added to CORS Access-Control-Allow-Methods

// resource:  API resource group version object (e.g. { group: "", resource: "pods", version: "v1" }).
//            Must be the full resource group version because it can't be derived from the patch object.
// name:      API name, the unique name for the object
// object:    API object data(eg. { kind: "Build", parameters: { ... } } )
// context:   API context (e.g. {project: "..."})
// opts:      http - options to pass to the inner $http call
// Returns a promise resolved with response data or rejected with {data:..., status:..., headers:..., config:...} when the delete call completes.
// DataService.prototype.patch = function(resourceGroupVersion, name, object, context, opts) {
//   opts = opts || {};
//   var deferred = $q.defer();
//   var self = this;
//   this._getNamespace(resourceGroupVersion, context, opts).then(function(ns){
//     $http(angular.extend({
//       method: 'PATCH',
//       auth: {},
//       data: object,
//       url: self._urlForResource(resourceGroupVersion, name, context, false, ns)
//     }, opts.http || {}))
//     .success(function(data, status, headerFunc, config, statusText) {
//       deferred.resolve(data);
//     })
//     .error(function(data, status, headers, config) {
//       deferred.reject({
//         data: data,
//         status: status,
//         headers: headers,
//         config: config
//       });
//     });
//   });
//   return deferred.promise;
// };

// resource:  API resource (e.g. "pods")
// name:      API name, the unique name for the object.
//            In case the name of the Object is provided, expected format of 'resource' parameter is 'resource/subresource', eg: 'buildconfigs/instantiate'.
// object:    API object data(eg. { kind: "Build", parameters: { ... } } )
// context:   API context (e.g. {project: "..."})
// opts:      http - options to pass to the inner $http call
// Returns a promise resolved with response data or rejected with {data:..., status:..., headers:..., config:...} when the delete call completes.
    DataService.prototype.create = function(resource, name, object, context, opts) {
      resource = APIService.deriveTargetResource(resource, object);
      opts = opts || {};
      var deferred = $q.defer();
      var self = this;
      this._getNamespace(resource, context, opts).then(function(ns){
        $http(angular.extend({
          method: 'POST',
          auth: {},
          data: object,
          url: self._urlForResource(resource, name, context, false, ns)
        }, opts.http || {}))
          .success(function(data, status, headerFunc, config, statusText) {
            deferred.resolve(data);
          })
          .error(function(data, status, headers, config) {
            deferred.reject({
              data: data,
              status: status,
              headers: headers,
              config: config
            });
          });
      });
      return deferred.promise;
    };

    // objects:   Array of API object data(eg. [{ kind: "Build", parameters: { ... } }] )
    // context:   API context (e.g. {project: "..."})
    // opts:      action - defines the REST action that will be called
    //                   - available actions: create, update
    //            http - options to pass to the inner $http call
    // Returns a promise resolved with an an object like: { success: [], failure: [] }
    // where success and failure contain an array of results from the individual
    // create calls.
    DataService.prototype.batch = function(objects, context, action, opts) {
      var deferred = $q.defer();
      var successResults = [];
      var failureResults = [];
      var self = this;
      var remaining = objects.length;
      action = action || 'create';

      function _checkDone() {
        if (remaining === 0) {
          deferred.resolve({ success: successResults, failure: failureResults });
        }
      }

      _.each(objects, function(object) {
        var resource = APIService.objectToResourceGroupVersion(object);
        if (!resource) {
          // include the original object, so the error handler can display the kind/name
          failureResults.push({object: object, data: {message: APIService.invalidObjectKindOrVersion(object)}});
          remaining--;
          _checkDone();
          return;
        }
        if (!APIService.apiInfo(resource)) {
          // include the original object, so the error handler can display the kind/name
          failureResults.push({object: object, data: {message: APIService.unsupportedObjectKindOrVersion(object)}});
          remaining--;
          _checkDone();
          return;
        }

        var success = function(data) {
          // include the original object, so the error handler can display the kind/name
          data.object = object;
          successResults.push(data);
          remaining--;
          _checkDone();
        };
        var failure = function(data) {
          // include the original object, so the handler can display the kind/name
          data.object = object;
          failureResults.push(data);
          remaining--;
          _checkDone();
        };

        switch(action) {
          case "create":
            self.create(resource, null, object, context, opts).then(success, failure);
            break;
          case "update":
            self.update(resource, object.metadata.name, object, context, opts).then(success, failure);
            break;
          default:
            // default case to prevent unspecified actions and typos
            return deferred.reject({
              data: "Invalid '" + action + "'  action.",
              status: 400,
              headers: function() { return null; },
              config: {},
              object: object
            });
        }
      });
      return deferred.promise;
    };

// resource:  API resource (e.g. "pods")
// name:      API name, the unique name for the object
// context:   API context (e.g. {project: "..."})
// opts:      force - always request (default is false)
//            http - options to pass to the inner $http call
//            errorNotification - will popup an error notification if the API request fails (default true)
    DataService.prototype.get = function(resource, name, context, opts) {
      resource = APIService.toResourceGroupVersion(resource);
      opts = opts || {};
      var key = this._uniqueKey(resource, name, context, _.get(opts, 'http.params'));
      var force = !!opts.force;
      delete opts.force;

      var deferred = $q.defer();

      var existingImmutableData = this._immutableData(key);

      // special case, if we have an immutable item, we can return it immediately
      if (this._hasImmutable(resource, existingImmutableData, name)) {
        $timeout(function() {
          // we can be guaranteed this wont change on us, just send what we have in existingData
          deferred.resolve(existingImmutableData.by('metadata.name')[name]);
        }, 0);
      }
      else {
        var self = this;
        this._getNamespace(resource, context, opts).then(function(ns){
          $http(angular.extend({
            method: 'GET',
            auth: {},
            url: self._urlForResource(resource, name, context, false, ns)
          }, opts.http || {}))
            .success(function(data, status, headerFunc, config, statusText) {
              if (self._isImmutable(resource)) {
                if (!existingImmutableData) {
                  self._immutableData(key, [data]);
                }
                else {
                  existingImmutableData.update(data, "ADDED");
                }
              }
              deferred.resolve(data);
            })
            .error(function(data, status, headers, config) {
              if (opts.errorNotification !== false) {
                showRequestError("Failed to get " + resource + "/" + name, status);
              }
              deferred.reject({
                data: data,
                status: status,
                headers: headers,
                config: config
              });
            });
        });
      }
      return deferred.promise;
    };

// TODO (bpeterse): Create a new Streamer service & get this out of DataService.
    DataService.prototype.createStream = function(resource, name, context, opts, isRaw) {
      var self = this;
      resource = APIService.toResourceGroupVersion(resource);

      var protocols = isRaw ? 'binary.k8s.io' : 'base64.binary.k8s.io';
      var identifier = 'stream_';
      var openQueue = {};
      var messageQueue = {};
      var closeQueue = {};
      var errorQueue = {};

      var stream;
      var makeStream = function() {
        return self._getNamespace(resource, context, {})
          .then(function(params) {
            var cumulativeBytes = 0;
            return  $ws({
              url: self._urlForResource(resource, name, context, true, _.extend(params, opts)),
              auth: {},
              onopen: function(evt) {
                _.each(openQueue, function(fn) {
                  fn(evt);
                });
              },
              onmessage: function(evt) {
                if(!_.isString(evt.data)) {
                  Logger.log('log stream response is not a string', evt.data);
                  return;
                }

                var message;
                if(!isRaw) {
                  message = base64.decode(base64util.pad(evt.data));
                  // Count bytes for log streams, which will stop when limitBytes is reached.
                  // There's no other way to detect we've reach the limit currently.
                  cumulativeBytes += message.length;
                }

                _.each(messageQueue, function(fn) {
                  if(isRaw) {
                    fn(evt.data);
                  } else {
                    fn(message, evt.data, cumulativeBytes);
                  }
                });
              },
              onclose: function(evt) {
                _.each(closeQueue, function(fn) {
                  fn(evt);
                });
              },
              onerror: function(evt) {
                _.each(errorQueue, function(fn) {
                  fn(evt);
                });
              },
              protocols: protocols
            }).then(function(ws) {
              Logger.log("Streaming pod log", ws);
              return ws;
            });
          });
      };
      return {
        onOpen: function(fn) {
          if(!_.isFunction(fn)) {
            return;
          }
          var id = _.uniqueId(identifier);
          openQueue[id] = fn;
          return id;
        },
        onMessage: function(fn) {
          if(!_.isFunction(fn)) {
            return;
          }
          var id = _.uniqueId(identifier);
          messageQueue[id] = fn;
          return id;
        },
        onClose: function(fn) {
          if(!_.isFunction(fn)) {
            return;
          }
          var id = _.uniqueId(identifier);
          closeQueue[id] = fn;
          return id;
        },
        onError: function(fn) {
          if(!_.isFunction(fn)) {
            return;
          }
          var id = _.uniqueId(identifier);
          errorQueue[id] = fn;
          return id;
        },
        // can remove any callback from open, message, close or error
        remove: function(id) {
          if (openQueue[id]) { delete openQueue[id]; }
          if (messageQueue[id]) { delete messageQueue[id]; }
          if (closeQueue[id]) { delete closeQueue[id]; }
          if (errorQueue[id]) { delete errorQueue[id]; }
        },
        start: function() {
          stream = makeStream();
          return stream;
        },
        stop: function() {
          stream.then(function(ws) {
            ws.close();
          });
        }
      };
    };


// resource:  API resource (e.g. "pods")
// context:   API context (e.g. {project: "..."})
// callback:  optional function to be called with the initial list of the requested resource,
//            and when updates are received, parameters passed to the callback:
//            Data:   a Data object containing the (context-qualified) results
//                    which includes a helper method for returning a map indexed
//                    by attribute (e.g. data.by('metadata.name'))
//            event:  specific event that caused this call ("ADDED", "MODIFIED",
//                    "DELETED", or null) callbacks can optionally use this to
//                    more efficiently process updates
//            obj:    specific object that caused this call (may be null if the
//                    entire list was updated) callbacks can optionally use this
//                    to more efficiently process updates
// opts:      options
//            poll:   true | false - whether to poll the server instead of opening
//                    a websocket. Default is false.
//            pollInterval: in milliseconds, how long to wait between polling the server
//                    only applies if poll=true.  Default is 5000.
//            http:   similar to .get, etc. at this point, only used to pass http.params for filtering
//            errorNotification: will popup an error notification if the API request fails (default true)
// returns handle to the watch, needed to unwatch e.g.
//        var handle = DataService.watch(resource,context,callback[,opts])
//        DataService.unwatch(handle)
    DataService.prototype.watch = function(resource, context, callback, opts) {
      resource = APIService.toResourceGroupVersion(resource);
      opts = opts || {};
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
      if (callback) {
        // If we were given a callback, add it
        this._watchCallbacks(key).add(callback);
      }
      else if (!this._watchCallbacks(key).has()) {
        // We can be called with no callback in order to re-run a list/watch sequence for existing callbacks
        // If there are no existing callbacks, return
        return {};
      }

      var existingWatchOpts = this._watchOptions(key);
      if (existingWatchOpts) {
        // Check any options for compatibility with existing watch
        if (!!existingWatchOpts.poll !== !!opts.poll) { // jshint ignore:line
          throw "A watch already exists for " + resource + " with a different polling option.";
        }
      }
      else {
        this._watchOptions(key, opts);
      }

      var self = this;
      if (this._isCached(key)) {
        if (callback) {
          $timeout(function() {
            callback(self._data(key));
          }, 0);
        }
      }
      else {
        if (callback) {
          var resourceVersion = this._resourceVersion(key);
          if (this._data(key)) {
            $timeout(function() {
              // If the cached data is still the latest that we have, send it to the callback
              if (resourceVersion === self._resourceVersion(key)) {
                callback(self._data(key)); // but just in case, still pull from the current data map
              }
            }, 0);
          }
        }
        if (!this._listInFlight(key)) {
          this._startListOp(resource, context, opts);
        }
      }

      // returned handle needs resource, context, and callback in order to unwatch
      return {
        resource: resource,
        context: context,
        callback: callback,
        opts: opts
      };
    };



// resource:  API resource (e.g. "pods")
// name:      API name, the unique name for the object
// context:   API context (e.g. {project: "..."})
// callback:  optional function to be called with the initial list of the requested resource,
//            and when updates are received, parameters passed to the callback:
//            obj:    the requested object
//            event:  specific event that caused this call ("ADDED", "MODIFIED",
//                    "DELETED", or null) callbacks can optionally use this to
//                    more efficiently process updates
// opts:      options
//            poll:   true | false - whether to poll the server instead of opening
//                    a websocket. Default is false.
//            pollInterval: in milliseconds, how long to wait between polling the server
//                    only applies if poll=true.  Default is 5000.
//
// returns handle to the watch, needed to unwatch e.g.
//        var handle = DataService.watch(resource,context,callback[,opts])
//        DataService.unwatch(handle)
    DataService.prototype.watchObject = function(resource, name, context, callback, opts) {
      resource = APIService.toResourceGroupVersion(resource);
      opts = opts || {};
      var key = this._uniqueKey(resource, name, context, _.get(opts, 'http.params'));
      var wrapperCallback;
      if (callback) {
        // If we were given a callback, add it
        this._watchObjectCallbacks(key).add(callback);
        var self = this;
        wrapperCallback = function(items, event, item) {
          // If we got an event for a single item, only fire the callback if its the item we care about
          if (item && item.metadata.name === name) {
            self._watchObjectCallbacks(key).fire(item, event);
          }
          else if (!item) {
            // Otherwise its an initial listing, see if we can find the item we care about in the list
            var itemsByName = items.by("metadata.name");
            if (itemsByName[name]) {
              self._watchObjectCallbacks(key).fire(itemsByName[name]);
            }
          }
        };
      }
      else if (!this._watchObjectCallbacks(key).has()) {
        // This block may not be needed yet, don't expect this would get called without a callback currently...
        return {};
      }

      // For now just watch the type, eventually we may want to do something more complicated
      // and watch just the object if the type is not already being watched
      var handle = this.watch(resource, context, wrapperCallback, opts);
      handle.objectCallback = callback;
      handle.objectName = name;

      return handle;
    };

    DataService.prototype.unwatch = function(handle) {
      var resource = handle.resource;
      var objectName = handle.objectName;
      var context = handle.context;
      var callback = handle.callback;
      var objectCallback = handle.objectCallback;
      var opts = handle.opts;
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));

      if (objectCallback && objectName) {
        var objectKey = this._uniqueKey(resource, objectName, context, _.get(opts, 'http.params'));
        var objCallbacks = this._watchObjectCallbacks(objectKey);
        objCallbacks.remove(objectCallback);
      }

      var callbacks = this._watchCallbacks(key);
      if (callback) {
        callbacks.remove(callback);
      }
      if (!callbacks.has()) {
        if (opts && opts.poll) {
          clearTimeout(this._watchPollTimeouts(key));
          this._watchPollTimeouts(key, null);
        }
        else if (this._watchWebsockets(key)){
          // watchWebsockets may not have been set up yet if the projectPromise never resolves
          var ws = this._watchWebsockets(key);
          // Make sure the onclose listener doesn't reopen this websocket.
          ws.shouldClose = true;
          ws.close();
          this._watchWebsockets(key, null);
        }

        this._watchInFlight(key, false);
        this._watchOptions(key, null);
      }
    };

    // Takes an array of watch handles and unwatches them
    DataService.prototype.unwatchAll = function(handles) {
      for (var i = 0; i < handles.length; i++) {
        this.unwatch(handles[i]);
      }
    };

    DataService.prototype._watchCallbacks = function(key) {
      if (!this._watchCallbacksMap[key]) {
        this._watchCallbacksMap[key] = $.Callbacks();
      }
      return this._watchCallbacksMap[key];
    };

    DataService.prototype._watchObjectCallbacks = function(key) {
      if (!this._watchObjectCallbacksMap[key]) {
        this._watchObjectCallbacksMap[key] = $.Callbacks();
      }
      return this._watchObjectCallbacksMap[key];
    };

    DataService.prototype._listDeferred = function(key) {
      if (!this._listDeferredMap[key]) {
        this._listDeferredMap[key] = $q.defer();
      }
      return this._listDeferredMap[key];
    };

    DataService.prototype._watchInFlight = function(key, op) {
      if (!op && op !== false) {
        return this._watchOperationMap[key];
      }
      else {
        this._watchOperationMap[key] = op;
      }
    };

    DataService.prototype._listInFlight = function(key, op) {
      if (!op && op !== false) {
        return this._listOperationMap[key];
      }
      else {
        this._listOperationMap[key] = op;
      }
    };

    DataService.prototype._resourceVersion = function(key, rv) {
      if (!rv) {
        return this._resourceVersionMap[key];
      }
      else {
        this._resourceVersionMap[key] = rv;
      }
    };

    // uses $cacheFactory to impl LRU cache
    DataService.prototype._data = function(key, data) {
      return data ?
        this._dataCache.put(key, new Data(data)) :
        this._dataCache.get(key);
    };

    // uses $cacheFactory to impl LRU cache
    DataService.prototype._immutableData = function(key, data) {
      return data ?
        this._immutableDataCache.put(key, new Data(data)) :
        this._immutableDataCache.get(key);
    };

    DataService.prototype._isCached = function(key) {
      return this._watchInFlight(key) &&
        this._resourceVersion(key) &&
        (!!this._data(key));
    };

    DataService.prototype._watchOptions = function(key, opts) {
      if (opts === undefined) {
        return this._watchOptionsMap[key];
      }
      else {
        this._watchOptionsMap[key] = opts;
      }
    };

    DataService.prototype._watchPollTimeouts = function(key, timeout) {
      if (!timeout) {
        return this._watchPollTimeoutsMap[key];
      }
      else {
        this._watchPollTimeoutsMap[key] = timeout;
      }
    };

    DataService.prototype._watchWebsockets = function(key, timeout) {
      if (!timeout) {
        return this._watchWebsocketsMap[key];
      }
      else {
        this._watchWebsocketsMap[key] = timeout;
      }
    };

    // Maximum number of websocket events to track per resource/context in _websocketEventsMap.
    var maxWebsocketEvents = 10;

    DataService.prototype._addWebsocketEvent = function(key, eventType) {
      var events = this._websocketEventsMap[key];
      if (!events) {
        events = this._websocketEventsMap[key] = [];
      }

      // Add the event to the end of the array with the time in millis.
      events.push({
        type: eventType,
        time: Date.now()
      });

      // Only keep 10 events. Shift the array to make room for the new event.
      while (events.length > maxWebsocketEvents) { events.shift(); }
    };

    function isTooManyRecentEvents(events) {
      // If we've had more than 10 events in 30 seconds, stop.
      // The oldest event is at index 0.
      var recentDuration = 1000 * 30;
      return events.length >= maxWebsocketEvents && (Date.now() - events[0].time) < recentDuration;
    }

    function isTooManyConsecutiveCloses(events) {
      var maxConsecutiveCloseEvents = 5;
      if (events.length < maxConsecutiveCloseEvents) {
        return false;
      }

      // Make sure the last 5 events were not close events, which means the
      // connection is not succeeding. This check is necessary if connection
      // timeouts take longer than 6 seconds.
      for (var i = events.length - maxConsecutiveCloseEvents; i < events.length; i++) {
        if (events[i].type !== 'close') {
          return false;
        }
      }

      return true;
    }

    DataService.prototype._isTooManyWebsocketRetries = function(key) {
      var events = this._websocketEventsMap[key];
      if (!events) {
        return false;
      }

      if (isTooManyRecentEvents(events)) {
        Logger.log("Too many websocket open or close events for resource/context in a short period", key, events);
        return true;
      }

      if (isTooManyConsecutiveCloses(events)) {
        Logger.log("Too many consecutive websocket close events for resource/context", key, events);
        return true;
      }

      return false;
    };


    // will take an object, filter & sort it for consistent unique key generation
    // uses encodeURIComponent internally because keys can have special characters, such as '='
    var paramsForKey = function(params) {
      var keys = _.keysIn(
        _.pick(
          params,
          ['fieldSelector', 'labelSelector'])
      ).sort();
      return _.reduce(
        keys,
        function(result, key, i) {
          return result + key + '=' + encodeURIComponent(params[key]) +
            ((i < (keys.length-1)) ? '&' : '');
        }, '?');

    };


    // - creates a unique key representing a resource in its context (project)
    //    - primary use case for caching
    //    - proxies to _urlForResource to generate unique keys
    // - ensure namespace if available
    // - ensure only witelisted url params used for keys (fieldSelector, labelSelector) via paramsForKey
    //   and that these are consistently ordered
    // - NOTE: Do not use the key as your url for API requests. This function does not use the 'isWebsocket'
    //         bool.  Both websocket & http operations should respond with the same data from cache if key matches
    //         so the unique key will always include http://
    DataService.prototype._uniqueKey = function(resource, name, context, params) {
      var ns = context && context.namespace ||
        _.get(context, 'project.metadata.name') ||
        context.projectName;
      return this._urlForResource(resource, name, context, null, angular.extend({}, {}, {namespace: ns})).toString() + paramsForKey(params || {});
    };


    DataService.prototype._startListOp = function(resource, context, opts) {
      opts = opts || {};
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
      // mark the operation as in progress
      this._listInFlight(key, true);

      var self = this;
      if (context.projectPromise && !resource.equals("projects")) {
        context.projectPromise.done(function(project) {
          $http(angular.extend({
            method: 'GET',
            auth: {},
            url: self._urlForResource(resource, null, context, false, {namespace: project.metadata.name})
          }, opts.http || {}))
            .success(function(data, status, headerFunc, config, statusText) {
              self._listOpComplete(key, resource, context, opts, data);
            }).error(function(data, status, headers, config) {
            // mark list op as complete
            self._listInFlight(key, false);
            var deferred = self._listDeferred(key);
            delete self._listDeferredMap[key];
            deferred.reject(data, status, headers, config);

            if (!_.get(opts, 'errorNotification', true)) {
              return;
            }

            showRequestError("Failed to list " + resource, status);
          });
        });
      }
      else {
        $http({
          method: 'GET',
          auth: {},
          url: this._urlForResource(resource, null, context),
        }).success(function(data, status, headerFunc, config, statusText) {
          self._listOpComplete(key, resource, context, opts, data);
        }).error(function(data, status, headers, config) {
          // mark list op as complete
          self._listInFlight(key, false);
          var deferred = self._listDeferred(key);
          delete self._listDeferredMap[key];
          deferred.reject(data, status, headers, config);

          if (!_.get(opts, 'errorNotification', true)) {
            return;
          }

          showRequestError("Failed to list " + resource, status);
        });
      }
    };

    DataService.prototype._listOpComplete = function(key, resource, context, opts, data) {
      if (!data.items) {
        console.warn("List request for " + resource + " returned a null items array.  This is an invalid API response.");
      }
      var items = data.items || [];
      // Here we normalize all items to have a kind property.
      // One of the warts in the kubernetes REST API is that items retrieved
      // via GET on a list resource won't have a kind property set.
      // See: https://github.com/kubernetes/kubernetes/issues/3030
      if (data.kind && data.kind.indexOf("List") === data.kind.length - 4) {
        angular.forEach(items, function(item) {
          if (!item.kind) {
            item.kind = data.kind.slice(0, -4);
          }
          if (!item.apiVersion) {
            item.apiVersion = data.apiVersion;
          }
        });
      }

      // mark list op as complete
      this._listInFlight(key, false);
      var deferred = this._listDeferred(key);
      delete this._listDeferredMap[key];

      this._resourceVersion(key, data.resourceVersion || data.metadata.resourceVersion);
      this._data(key, items);
      deferred.resolve(this._data(key));
      this._watchCallbacks(key).fire(this._data(key));

      if (this._watchCallbacks(key).has()) {
        var watchOpts = this._watchOptions(key) || {};
        if (watchOpts.poll) {
          this._watchInFlight(key, true);
          this._watchPollTimeouts(key, setTimeout($.proxy(this, "_startListOp", resource, context), watchOpts.pollInterval || 5000));
        }
        else if (!this._watchInFlight(key)) {
          this._startWatchOp(key, resource, context, opts, this._resourceVersion(key));
        }
      }
    };

    DataService.prototype._startWatchOp = function(key, resource, context, opts, resourceVersion) {
      this._watchInFlight(key, true);
      // Note: current impl uses one websocket per resource
      // eventually want a single websocket connection that we
      // send a subscription request to for each resource

      // Only listen for updates if websockets are available
      if ($ws.available()) {
        var self = this;
        var params =  _.get(opts, 'http.params') || {};
        params.watch = true;
        if (resourceVersion) {
          params.resourceVersion = resourceVersion;
        }
        if (context.projectPromise && !resource.equals("projects")) {
          context.projectPromise.done(function(project) {
            params.namespace = project.metadata.name;
            $ws({
              method: "WATCH",
              url: self._urlForResource(resource, null, context, true, params),
              auth:      {},
              onclose:   $.proxy(self, "_watchOpOnClose",   resource, context, opts),
              onmessage: $.proxy(self, "_watchOpOnMessage", resource, context, opts),
              onopen:    $.proxy(self, "_watchOpOnOpen",    resource, context, opts)
            }).then(function(ws) {
              Logger.log("Watching", ws);
              self._watchWebsockets(key, ws);
            });
          });
        }
        else {
          $ws({
            method: "WATCH",
            url: self._urlForResource(resource, null, context, true, params),
            auth:      {},
            onclose:   $.proxy(self, "_watchOpOnClose",   resource, context, opts),
            onmessage: $.proxy(self, "_watchOpOnMessage", resource, context, opts),
            onopen:    $.proxy(self, "_watchOpOnOpen",    resource, context, opts)
          }).then(function(ws){
            Logger.log("Watching", ws);
            self._watchWebsockets(key, ws);
          });
        }
      }
    };

    DataService.prototype._watchOpOnOpen = function(resource, context, opts, event) {
      Logger.log('Websocket opened for resource/context', resource, context);
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
      this._addWebsocketEvent(key, 'open');
    };

    DataService.prototype._watchOpOnMessage = function(resource, context, opts, event) {
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
      try {
        var eventData = $.parseJSON(event.data);

        if (eventData.type == "ERROR") {
          Logger.log("Watch window expired for resource/context", resource, context);
          if (event.target) {
            event.target.shouldRelist = true;
          }
          return;
        }
        else if (eventData.type === "DELETED") {
          // Add this ourselves since the API doesn't add anything
          // this way the views can use it to trigger special behaviors
          if (eventData.object && eventData.object.metadata && !eventData.object.metadata.deletionTimestamp) {
            eventData.object.metadata.deletionTimestamp = (new Date()).toISOString();
          }
        }

        if (eventData.object) {
          this._resourceVersion(key, eventData.object.resourceVersion || eventData.object.metadata.resourceVersion);
        }
        // TODO do we reset all the by() indices, or simply update them, since we should know what keys are there?
        // TODO let the data object handle its own update
        this._data(key).update(eventData.object, eventData.type);
        var self = this;
        // Wrap in a $timeout which will trigger an $apply to mirror $http callback behavior
        // without timeout this is triggering a repeated digest loop
        $timeout(function() {
          self._watchCallbacks(key).fire(self._data(key), eventData.type, eventData.object);
        }, 0);
      }
      catch (e) {
        // TODO: surface in the UI?
        Logger.error("Error processing message", resource, event.data);
      }
    };

    DataService.prototype._watchOpOnClose = function(resource, context, opts, event) {
      var eventWS = event.target;
      var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));

      if (!eventWS) {
        Logger.log("Skipping reopen, no eventWS in event", event);
        return;
      }

      var registeredWS = this._watchWebsockets(key);
      if (!registeredWS) {
        Logger.log("Skipping reopen, no registeredWS for resource/context", resource, context);
        return;
      }

      // Don't reopen a web socket that is no longer registered for this resource/context
      if (eventWS !== registeredWS) {
        Logger.log("Skipping reopen, eventWS does not match registeredWS", eventWS, registeredWS);
        return;
      }

      // We are the registered web socket for this resource/context, and we are no longer in flight
      // Unlock this resource/context in case we decide not to reopen
      this._watchInFlight(key, false);

      // Don't reopen web sockets we closed ourselves
      if (eventWS.shouldClose) {
        Logger.log("Skipping reopen, eventWS was explicitly closed", eventWS);
        return;
      }

      // Don't reopen clean closes (for example, navigating away from the page to example.com)
      if (event.wasClean) {
        Logger.log("Skipping reopen, clean close", event);
        return;
      }

      // Don't reopen if no one is listening for this data any more
      if (!this._watchCallbacks(key).has()) {
        Logger.log("Skipping reopen, no listeners registered for resource/context", resource, context);
        return;
      }

      // Don't reopen if we've failed this resource/context too many times
      if (this._isTooManyWebsocketRetries(key)) {
        // Show an error notication unless disabled in opts.
        if (_.get(opts, 'errorNotification', true)) {
          // Use `$rootScope.$emit` instead of NotificationsService directly
          // so that DataService doesn't add a dependency on `openshiftCommonUI`
          $rootScope.$emit('NotificationsService.addNotification', {
            id: 'websocket_retry_halted',
            type: 'error',
            message: 'Server connection interrupted.',
            links: [{
              label: 'Refresh',
              onClick: function() {
                window.location.reload();
              }
            }]
          });
        }
        return;
      }

      // Keep track of this event.
      this._addWebsocketEvent(key, 'close');

      // If our watch window expired, we have to relist to get a new resource version to watch from
      if (eventWS.shouldRelist) {
        Logger.log("Relisting for resource/context", resource, context);
        // Restart a watch() from the beginning, which triggers a list/watch sequence
        // The watch() call is responsible for setting _watchInFlight back to true
        // Add a short delay to avoid a scenario where we make non-stop requests
        // When the timeout fires, if no callbacks are registered for this
        //   resource/context, or if a watch is already in flight, `watch()` is a no-op
        var self = this;
        setTimeout(function() {
          self.watch(resource, context);
        }, 2000);
        return;
      }

      // Attempt to re-establish the connection after a two-second back-off
      // Re-mark ourselves as in-flight to prevent other callers from jumping in in the meantime
      Logger.log("Rewatching for resource/context", resource, context);
      this._watchInFlight(key, true);
      setTimeout(
        $.proxy(this, "_startWatchOp", key, resource, context, opts, this._resourceVersion(key)),
        2000
      );
    };

    var URL_ROOT_TEMPLATE         = "{protocol}://{+hostPort}{+prefix}{/group}/{version}/";
    var URL_GET_LIST              = URL_ROOT_TEMPLATE + "{resource}{?q*}";
    var URL_OBJECT                = URL_ROOT_TEMPLATE + "{resource}/{name}{/subresource*}{?q*}";
    var URL_NAMESPACED_GET_LIST   = URL_ROOT_TEMPLATE + "namespaces/{namespace}/{resource}{?q*}";
    var URL_NAMESPACED_OBJECT     = URL_ROOT_TEMPLATE + "namespaces/{namespace}/{resource}/{name}{/subresource*}{?q*}";


    DataService.prototype._urlForResource = function(resource, name, context, isWebsocket, params) {
      var apiInfo = APIService.apiInfo(resource);
      if (!apiInfo) {
        Logger.error("_urlForResource called with unknown resource", resource, arguments);
        return null;
      }

      var serviceProtocol = apiInfo.protocol || window.location.protocol;
      var protocol;
      params = params || {};
      if (isWebsocket) {
        protocol = serviceProtocol === "http:" ? "ws" : "wss";
      }
      else {
        protocol = serviceProtocol === "http:" ? "http" : "https";
      }

      if (context && context.namespace && !params.namespace) {
        params.namespace = context.namespace;
      }

      if (apiInfo.namespaced && !params.namespace) {
        Logger.error("_urlForResource called for a namespaced resource but no namespace provided", resource, arguments);
        return null;
      }

      var namespaceInPath = apiInfo.namespaced;
      var namespace = null;
      if (namespaceInPath) {
        namespace = params.namespace;
        params = angular.copy(params);
        delete params.namespace;
      }
      var template;
      var templateOptions = {
        protocol: protocol,
        hostPort: apiInfo.hostPort,
        prefix: apiInfo.prefix,
        group: apiInfo.group,
        version: apiInfo.version,
        resource: resource.primaryResource(),
        subresource: resource.subresources(),
        name: name,
        namespace: namespace,
        q: params
      };
      if (name) {
        template = namespaceInPath ? URL_NAMESPACED_OBJECT : URL_OBJECT;
      }
      else {
        template = namespaceInPath ? URL_NAMESPACED_GET_LIST : URL_GET_LIST;
      }
      return URI.expand(template, templateOptions).toString();
    };

    DataService.prototype.url = function(options) {
      if (options && options.resource) {
        var opts = angular.copy(options);
        delete opts.resource;
        delete opts.group;
        delete opts.version;
        delete opts.name;
        delete opts.isWebsocket;
        var resource = APIService.toResourceGroupVersion({
          resource: options.resource,
          group:    options.group,
          version:  options.version
        });
        return this._urlForResource(resource, options.name, null, !!options.isWebsocket, opts);
      }
      return null;
    };

    DataService.prototype.openshiftAPIBaseUrl = function() {
      var protocol = window.location.protocol === "http:" ? "http" : "https";
      var hostPort = window.__env.oc_proxy_location;
      return new URI({protocol: protocol, hostname: hostPort}).toString();
    };

    // Immutables are flagged here as we should not need to fetch them more than once.
    var IMMUTABLE_RESOURCE = {
      imagestreamimages: true
    };

    // - request once and never need to request again, these do not change!
    DataService.prototype._isImmutable = function(resource) {
      return !!IMMUTABLE_RESOURCE[resource.resource];
    };

    // do we already have the data for this?
    DataService.prototype._hasImmutable = function(resource, existingData, name) {
      return this._isImmutable(resource) && existingData && existingData.by('metadata.name')[name];
    };

    DataService.prototype._getNamespace = function(resource, context, opts) {
      var deferred = $q.defer();
      if (opts.namespace) {
        deferred.resolve({namespace: opts.namespace});
      }
      else if (context.projectPromise && !resource.equals("projects")) {
        context.projectPromise.done(function(project) {
          deferred.resolve({namespace: project.metadata.name});
        });
      }
      else {
        deferred.resolve(null);
      }
      return deferred.promise;
    };

    return new DataService();
  }]);
angular.module('Oshinko')
  .factory('APIService', ["API_CFG", "APIS_CFG", "Logger", "$q", "$http", "$filter", "$window", function (API_CFG,
                                                                                                          APIS_CFG,
                                                                                                          Logger,
                                                                                                          $q,
                                                                                                          $http,
                                                                                                          $filter,
                                                                                                          $window) {
    // Set the default api versions the console will use if otherwise unspecified
    var defaultVersion = {
      "":           "v1",
      "extensions": "v1beta1"
    };

    // toResourceGroupVersion() returns a ResourceGroupVersion.
    // If resource is already a ResourceGroupVersion, returns itself.
    //
    // if r is a string, the empty group and default version for the empty group are assumed.
    //
    // if r is an object, the resource, group, and version attributes are read.
    // a missing group attribute defaults to the legacy group.
    // a missing version attribute defaults to the default version for the group, or undefined if the group is unknown.
    //
    // if r is already a ResourceGroupVersion, it is returned as-is
    var toResourceGroupVersion = function(r) {
      if (r instanceof ResourceGroupVersion) {
        return r;
      }
      var resource, group, version;
      if (angular.isString(r)) {
        resource = normalizeResource(r);
        group = '';
        version = defaultVersion[group];
      } else if (r && r.resource) {
        resource = normalizeResource(r.resource);
        group = r.group || '';
        version = r.version || defaultVersion[group] || _.get(APIS_CFG, ["groups", group, "preferredVersion"]);
      }
      return new ResourceGroupVersion(resource, group, version);
    };

    // normalizeResource lowercases the first segment of the given resource. subresources can be case-sensitive.
    function normalizeResource(resource) {
      if (!resource) {
        return resource;
      }
      var i = resource.indexOf('/');
      if (i === -1) {
        return resource.toLowerCase();
      }
      return resource.substring(0, i).toLowerCase() + resource.substring(i);
    }

    // port of group_version.go#ParseGroupVersion
    var parseGroupVersion = function(apiVersion) {
      if (!apiVersion) {
        return undefined;
      }
      var parts = apiVersion.split("/");
      if (parts.length === 1) {
        if (parts[0] === "v1") {
          return {group: '', version: parts[0]};
        }
        return {group: parts[0], version: ''};
      }
      if (parts.length === 2) {
        return {group:parts[0], version: parts[1]};
      }
      Logger.warn('Invalid apiVersion "' + apiVersion + '"');
      return undefined;
    };

    var objectToResourceGroupVersion = function(apiObject) {
      if (!apiObject || !apiObject.kind || !apiObject.apiVersion) {
        return undefined;
      }
      var resource = kindToResource(apiObject.kind);
      if (!resource) {
        return undefined;
      }
      var groupVersion = parseGroupVersion(apiObject.apiVersion);
      if (!groupVersion) {
        return undefined;
      }
      return new ResourceGroupVersion(resource, groupVersion.group, groupVersion.version);
    };

    // deriveTargetResource figures out the fully qualified destination to submit the object to.
    // if resource is a string, and the object's kind matches the resource, the object's group/version are used.
    // if resource is a ResourceGroupVersion, and the object's kind and group match, the object's version is used.
    // otherwise, resource is used as-is.
    var deriveTargetResource = function(resource, object) {
      if (!resource || !object) {
        return undefined;
      }
      var objectResource = kindToResource(object.kind);
      var objectGroupVersion = parseGroupVersion(object.apiVersion);
      var resourceGroupVersion = toResourceGroupVersion(resource);
      if (!objectResource || !objectGroupVersion || !resourceGroupVersion) {
        return undefined;
      }

      // We specified something like "pods"
      if (angular.isString(resource)) {
        // If the object had a matching kind {"kind":"Pod","apiVersion":"v1"}, use the group/version from the object
        if (resourceGroupVersion.equals(objectResource)) {
          resourceGroupVersion.group = objectGroupVersion.group;
          resourceGroupVersion.version = objectGroupVersion.version;
        }
        return resourceGroupVersion;
      }

      // If the resource was already a fully specified object,
      // require the group to match as well before taking the version from the object
      if (resourceGroupVersion.equals(objectResource, objectGroupVersion.group)) {
        resourceGroupVersion.version = objectGroupVersion.version;
      }
      return resourceGroupVersion;
    };

    // port of restmapper.go#kindToResource
    // humanize will add spaces between words in the resource
    function kindToResource(kind, humanize) {
      if (!kind) {
        return "";
      }
      var resource = kind;
      if (humanize) {
        var humanizeKind = $filter("humanizeKind");
        resource = humanizeKind(resource);
      }
      resource = String(resource).toLowerCase();
      if (resource === 'endpoints' || resource === 'securitycontextconstraints') {
        // no-op, plural is the singular
      }
      else if (resource[resource.length-1] === 's') {
        resource = resource + 'es';
      }
      else if (resource[resource.length-1] === 'y') {
        resource = resource.substring(0, resource.length-1) + 'ies';
      }
      else {
        resource = resource + 's';
      }

      return resource;
    }

    function kindToResourceGroupVersion(kind) {
      return toResourceGroupVersion({
        resource: kindToResource(kind.kind),
        group: kind.group
      });
    }

    // apiInfo returns the host/port, prefix, group, and version for the given resource,
    // or undefined if the specified resource/group/version is known not to exist.
    var apiInfo = function(resource) {
      // If API discovery had any failures, calls to api info should redirect to the error page
      if (APIS_CFG.API_DISCOVERY_ERRORS) {
        var possibleCertFailure  = _.every(APIS_CFG.API_DISCOVERY_ERRORS, function(error){
          return _.get(error, "data.status") === 0;
        });
        // Otherwise go to the error page, the server might be down.  Can't use Navigate.toErrorPage or it will create a circular dependency
        $window.location.href = URI('error').query({
          error_description: "Unable to load details about the server. If the problem continues, please contact your system administrator.",
          error: "API_DISCOVERY"
        }).toString();
        return;
      }

      resource = toResourceGroupVersion(resource);
      var primaryResource = resource.primaryResource();
      var discoveredResource;
      // API info for resources in an API group, if the resource was not found during discovery return undefined
      if (resource.group) {
        discoveredResource = _.get(APIS_CFG, ["groups", resource.group, "versions", resource.version, "resources", primaryResource]);
        if (!discoveredResource) {
          return undefined;
        }
        var hostPrefixObj = _.get(APIS_CFG, ["groups", resource.group, 'hostPrefix']) || APIS_CFG;
        return {
          resource: resource.resource,
          group:    resource.group,
          version:  resource.version,
          protocol: hostPrefixObj.protocol,
          hostPort: hostPrefixObj.hostPort,
          prefix:   hostPrefixObj.prefix,
          namespaced: discoveredResource.namespaced,
          verbs: discoveredResource.verbs
        };
      }

      // Resources without an API group could be legacy k8s or origin resources.
      // Scan through resources to determine which this is.
      var api;
      for (var apiName in API_CFG) {
        api = API_CFG[apiName];
        discoveredResource = _.get(api, ["resources", resource.version, primaryResource]);
        if (!discoveredResource) {
          continue;
        }
        return {
          resource: resource.resource,
          version:  resource.version,
          hostPort: api.hostPort,
          prefix:   api.prefix,
          namespaced: discoveredResource.namespaced,
          verbs: discoveredResource.verbs
        };
      }
      return undefined;
    };

    var invalidObjectKindOrVersion = function(apiObject) {
      var kind = "<none>";
      var version = "<none>";
      if (apiObject && apiObject.kind)       { kind    = apiObject.kind;       }
      if (apiObject && apiObject.apiVersion) { version = apiObject.apiVersion; }
      return "Invalid kind ("+kind+") or API version ("+version+")";
    };
    var unsupportedObjectKindOrVersion = function(apiObject) {
      var kind = "<none>";
      var version = "<none>";
      if (apiObject && apiObject.kind)       { kind    = apiObject.kind;       }
      if (apiObject && apiObject.apiVersion) { version = apiObject.apiVersion; }
      return "The API version "+version+" for kind " + kind + " is not supported by this server";
    };

    // Returns an array of available kinds, including their group
    var calculateAvailableKinds = function(includeClusterScoped) {
      var kinds = [];
      var rejectedKinds = {};

      // ignore the legacy openshift kinds, these have been migrated to api groups
      _.each(_.pickBy(API_CFG, function(value, key) {
        return key !== 'openshift';
      }), function(api) {
        _.each(api.resources.v1, function(resource) {
          if (resource.namespaced || includeClusterScoped) {
            // Exclude subresources and any rejected kinds
            if (_.includes(resource.name, '/') || _.find(rejectedKinds, { kind: resource.kind, group: '' })) {
              return;
            }

            kinds.push({
              kind: resource.kind,
              group:  ''
            });
          }
        });
      });

      // Kinds under api groups
      _.each(APIS_CFG.groups, function(group) {
        // Use the console's default version first, and the server's preferred version second
        var preferredVersion = defaultVersion[group.name] || group.preferredVersion;
        _.each(group.versions[preferredVersion].resources, function(resource) {
          // Exclude subresources and any rejected kinds
          if (_.includes(resource.name, '/') || _.find(rejectedKinds, {kind: resource.kind, group: group.name})) {
            return;
          }

          // Exclude duplicate kinds we know about that map to the same storage as another group/kind
          // This is unusual, so we are special casing these
          if (group.name === "extensions" && resource.kind === "HorizontalPodAutoscaler") {
            return;
          }

          if (resource.namespaced || includeClusterScoped) {
            kinds.push({
              kind: resource.kind,
              group: group.name
            });
          }
        });
      });

      return _.uniqBy(kinds, function(value) {
        return value.group + "/" + value.kind;
      });
    };

    var namespacedKinds = calculateAvailableKinds(false);
    var allKinds = calculateAvailableKinds(true);

    var availableKinds = function(includeClusterScoped) {
      return includeClusterScoped ? allKinds : namespacedKinds;
    };

    return {
      toResourceGroupVersion: toResourceGroupVersion,

      parseGroupVersion: parseGroupVersion,

      objectToResourceGroupVersion: objectToResourceGroupVersion,

      deriveTargetResource: deriveTargetResource,

      kindToResource: kindToResource,

      kindToResourceGroupVersion: kindToResourceGroupVersion,

      apiInfo: apiInfo,

      invalidObjectKindOrVersion: invalidObjectKindOrVersion,
      unsupportedObjectKindOrVersion: unsupportedObjectKindOrVersion,
      availableKinds: availableKinds
    };
  }]);

// Provide a websocket implementation that behaves like $http
// Methods:
//   $ws({
//     url: "...", // required
//     method: "...", // defaults to WATCH
//   })
//   returns a promise to the opened WebSocket
//
//   $ws.available()
//   returns true if WebSockets are available to use
angular.module('Oshinko')
  .provider('$ws', ["$httpProvider", function($httpProvider) {

    // $get method is called to build the $ws service
    this.$get = ["$q", "$injector", "Logger", function($q, $injector, Logger) {
      var authLogger = Logger.get("auth");
      authLogger.log("$wsProvider.$get", arguments);

      // Build list of interceptors from $httpProvider when constructing the $ws service
      // Build in reverse-order, so the last interceptor added gets to handle the request first
      var _interceptors = [];
      angular.forEach($httpProvider.interceptors, function(interceptorFactory) {
        if (angular.isString(interceptorFactory)) {
          _interceptors.unshift($injector.get(interceptorFactory));
        } else {
          _interceptors.unshift($injector.invoke(interceptorFactory));
        }
      });

      // Implement $ws()
      var $ws = function(config) {
        config.method = angular.uppercase(config.method || "WATCH");

        authLogger.log("$ws (pre-intercept)", config.url.toString());
        var serverRequest = function(config) {
          authLogger.log("$ws (post-intercept)", config.url.toString());
          var ws = new WebSocket(config.url, config.protocols);
          if (config.onclose)   { ws.onclose   = config.onclose;   }
          if (config.onmessage) { ws.onmessage = config.onmessage; }
          if (config.onopen)    { ws.onopen    = config.onopen;    }
          if (config.onerror)   { ws.onerror    = config.onerror;  }
          return ws;
        };

        // Apply interceptors to request config
        var chain = [serverRequest, undefined];
        var promise = $q.when(config);
        angular.forEach(_interceptors, function(interceptor) {
          if (interceptor.request || interceptor.requestError) {
            chain.unshift(interceptor.request, interceptor.requestError);
          }
          // TODO: figure out how to get interceptors to handle response errors from web sockets
          // if (interceptor.response || interceptor.responseError) {
          //   chain.push(interceptor.response, interceptor.responseError);
          // }
        });
        while (chain.length) {
          var thenFn = chain.shift();
          var rejectFn = chain.shift();
          promise = promise.then(thenFn, rejectFn);
        }
        return promise;
      };

      // Implement $ws.available()
      $ws.available = function() {
        try {
          return !!WebSocket;
        }
        catch(e) {
          return false;
        }
      };

      return $ws;
    }];
  }]);

angular.module('Oshinko')
  .provider('Logger', function() {
    this.$get = function() {
      // Wraps the global Logger from https://github.com/jonnyreeves/js-logger
      var OSLogger = Logger.get("OpenShift");
      var logger = {
        get: function(name) {
          var logger = Logger.get("OpenShift/" + name);
          var logLevel = "OFF";
          if (localStorage) {
            logLevel = localStorage['OpenShiftLogLevel.' + name] || logLevel;
          }
          logger.setLevel(Logger[logLevel]);
          return logger;
        },
        log: function() {
          OSLogger.log.apply(OSLogger, arguments);
        },
        info: function() {
          OSLogger.info.apply(OSLogger, arguments);
        },
        debug: function() {
          OSLogger.debug.apply(OSLogger, arguments);
        },
        warn: function() {
          OSLogger.warn.apply(OSLogger, arguments);
        },
        error: function() {
          OSLogger.error.apply(OSLogger, arguments);
        }
      };

      // Set default log level
      var logLevel = "ERROR";
      if (localStorage) {
        logLevel = localStorage['OpenShiftLogLevel.main'] || logLevel;
      }
      OSLogger.setLevel(Logger[logLevel]);
      return logger;
    };
  });

angular.module('Oshinko')
  .factory('base64util', function() {
    return {
      pad: function(data){
        if (!data) { return ""; }
        switch (data.length % 4) {
          case 1:  return data + "===";
          case 2:  return data + "==";
          case 3:  return data + "=";
          default: return data;
        }
      }
    };
  });

angular.module('Oshinko').filter('label', function() {
  return function(resource, key) {
    if (resource && resource.metadata && resource.metadata.labels) {
      return resource.metadata.labels[key];
    }
    return null;
  };
});

angular.module("Oshinko")
  .factory("DeploymentsService", function(APIService, DataService, $filter, $q){
    function DeploymentsService() {}

    DeploymentsService.prototype.getScaleResource = function(object) {
      var resourceGroupVersion = {
        resource: APIService.kindToResource(object.kind) + '/scale'
      };

      switch (object.kind) {
        case 'DeploymentConfig':
          // Deployment config scale subresources don't use group extensions.
          break;
        case 'Deployment':
        case 'ReplicaSet':
        case 'ReplicationController':
          resourceGroupVersion.group = 'extensions';
          break;
        default:
          return null;
      }

      return resourceGroupVersion;
    };

    DeploymentsService.prototype.scale = function(object, replicas) {
      var resourceGroupVersion = this.getScaleResource(object);
      if (!resourceGroupVersion) {
        return $q.reject({
          data: {
            message: "Cannot scale kind " + object.kind + "."
          }
        });
      }

      var scaleObject = {
        apiVersion: "extensions/v1beta1",
        kind: "Scale",
        metadata: {
          name: object.metadata.name,
          namespace: object.metadata.namespace,
          creationTimestamp: object.metadata.creationTimestamp
        },
        spec: {
          replicas: replicas
        }
      };
      return DataService.update(resourceGroupVersion,
        object.metadata.name,
        scaleObject,
        { namespace: object.metadata.namespace });
    };
    return new DeploymentsService();
  });
