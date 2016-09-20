'use strict';
/* jshint eqeqeq: false, unused: false, expr: true */

angular.module('Oshinko')
    .factory('DataService', function($cacheFactory, $http, $ws, $rootScope, $q, API_CFG, APIService, Notification, Logger, $timeout) {

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

        function DataService() {
            this._listCallbacksMap = {};
            this._watchCallbacksMap = {};
            this._watchObjectCallbacksMap = {};
            this._watchOperationMap = {};
            this._listOperationMap = {};
            this._resourceVersionMap = {};
            this._dataCache = $cacheFactory('dataCache', {
                // 25 is a reasonable number to keep at least one or two projects worth of data in cache
                number: 25
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
// callback:  function to be called with the list of the requested resource and context,
//            parameters passed to the callback:
//            Data:   a Data object containing the (context-qualified) results
//                    which includes a helper method for returning a map indexed
//                    by attribute (e.g. data.by('metadata.name'))
// opts:      http - options to pass to the inner $http call
        DataService.prototype.list = function(resource, context, callback, opts) {
            resource = APIService.toResourceGroupVersion(resource);
            var key = this._uniqueKey(resource, null, context, _.get(opts, 'http.params'));
            var callbacks = this._listCallbacks(key);
            callbacks.add(callback);

            if (this._isCached(key)) {
                // A watch operation is running, and we've already received the
                // initial set of data for this resource
                callbacks.fire(this._data(key));
                callbacks.empty();
            }
            else if (this._listInFlight(key)) {
                // no-op, our callback will get called when listOperation completes
            }
            else {
                this._startListOp(resource, context);
            }
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
            // Differentiate between 0 and undefined
            if (_.has(opts, 'gracePeriodSeconds')) {
                data = {
                    kind: "DeleteOptions",
                    apiVersion: "v1",
                    gracePeriodSeconds: opts.gracePeriodSeconds
                };
                headers['Content-Type'] = 'application/json';
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

            var existingData = this._data(key);

            // special case, if we have an immutable item, we can return it immediately
            if (this._hasImmutable(resource, existingData, name)) {
                $timeout(function() {
                    deferred.resolve(existingData.by('metadata.name')[name]);
                }, 0);
            }
            else if (!force && this._isCached(key)) {
                var obj = existingData.by('metadata.name')[name];
                if (obj) {
                    $timeout(function() {
                        deferred.resolve(obj);
                    }, 0);
                }
                else {
                    $timeout(function() {
                        // simulation of API object not found
                        deferred.reject({
                            data: {},
                            status: 404,
                            headers: function() { return null; },
                            config: {}
                        });
                    }, 0);
                }
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
                                if (!existingData) {
                                    self._data(key, [data]);
                                }
                                else {
                                    existingData.update(data, "ADDED");
                                }
                            }
                            deferred.resolve(data);
                        })
                        .error(function(data, status, headers, config) {
                            if (opts.errorNotification !== false) {
                                var msg = "Failed to get " + resource + "/" + name;
                                if (status !== 0) {
                                    msg += " (" + status + ")";
                                }
                                Notification.error(msg);
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

// https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/btoa
        function utf8_to_b64( str ) {
            return window.btoa(window.unescape(encodeURIComponent( str )));
        }
        function b64_to_utf8( str ) {
            return decodeURIComponent(window.escape(window.atob( str )));
        }

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
                                    message = b64_to_utf8(evt.data);
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
                if (existingWatchOpts.poll != opts.poll) {
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
                    var existingData = this._data(key);
                    if (existingData) {
                        $timeout(function() {
                            callback(existingData);
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
            var key = this._uniqueKey(resource, objectName, context, _.get(opts, 'http.params'));

            if (objectCallback && objectName) {
                var objCallbacks = this._watchObjectCallbacks(key);
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

        DataService.prototype._listCallbacks = function(key) {
            if (!this._listCallbacksMap[key]) {
                this._listCallbacksMap[key] = $.Callbacks();
            }
            return this._listCallbacksMap[key];
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
            return this._urlForResource(resource, name, context, null, angular.extend({}, {}, {namespace: ns})).toString() + paramsForKey(params);
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
                        var msg = "Failed to list " + resource;
                        if (status !== 0) {
                            msg += " (" + status + ")";
                        }
                        // TODO would like to make this optional with an errorNotification option, see get for an example
                        Notification.error(msg);
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
                    var msg = "Failed to list " + resource;
                    if (status !== 0) {
                        msg += " (" + status + ")";
                    }
                    // TODO would like to make this optional with an errorNotification option, see get for an example
                    Notification.error(msg);
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

            this._resourceVersion(key, data.resourceVersion || data.metadata.resourceVersion);
            this._data(key, items);
            this._listCallbacks(key).fire(this._data(key));
            this._listCallbacks(key).empty();
            this._watchCallbacks(key).fire(this._data(key));

            // mark list op as complete
            this._listInFlight(key, false);

            if (this._watchCallbacks(key).has()) {
                var watchOpts = this._watchOptions(key) || {};
                if (watchOpts.poll) {
                    this._watchInFlight(key, true);
                    this._watchPollTimeouts(key, setTimeout($.proxy(this, "_startListOp", key), watchOpts.pollInterval || 5000));
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
                Notification.error("Server connection interrupted.", {
                    id: "websocket_retry_halted",
                    mustDismiss: true,
                    actions: {
                        refresh: {label: "Refresh", action: function() { window.location.reload(); }}
                    }
                });
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

            var protocol;
            params = params || {};
            if (isWebsocket) {
                protocol = window.location.protocol === "http:" ? "ws" : "wss";
            }
            else {
                protocol = window.location.protocol === "http:" ? "http" : "https";
            }

            if (context && context.namespace && !params.namespace) {
                params.namespace = context.namespace;
            }

            var namespaceInPath = params.namespace;
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
            var hostPort = API_CFG.openshift.hostPort;
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
    });
