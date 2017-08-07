'use strict';

describe('New cluster functionality', function(){
  var controller;
  var $scope = {};

  beforeEach(module('Oshinko'));

  beforeEach(function() {
    inject(function(_$controller_, $q) {
      controller = _$controller_("ClusterNewCtrl", {
        $scope: $scope,
        $q: $q,
        dialogData: {},
        clusterData: {},
        sendNotifications: {},
        errorHandling: {}
      });
    });
  });

  it('should have an empty name', function() {
    expect($scope.fields.name).toEqual('');
  });
  it('should contain a default worker count of 1', function() {
    expect($scope.fields.workers).toEqual(1);
  });
  it('should allow a cluster name of goodname', function() {
    expect($scope.NAME_RE.test("goodname")).toBeTruthy();
  });
  it('should not allow a cluster name of bad name', function() {
    expect($scope.NAME_RE.test("bad name")).toBeFalsy();
  });
  it('should not allow a cluster name that contains a dollar sign', function() {
    expect($scope.NAME_RE.test("$(oc whoami -t)")).toBeFalsy();
  });
  it('should not allow a cluster name that is empty', function() {
    expect($scope.NAME_RE.test("")).toBeFalsy();
  });
  it('should not allow a non number as the worker count', function() {
    expect($scope.NUMBER_RE.test("abcd")).toBeFalsy();
  });
  it('should allow a worker count of 4', function() {
    expect($scope.NUMBER_RE.test(4)).toBeTruthy();
  });
});

describe('Delete cluster functionality', function(){
  var controller;
  var $scope = {};

  beforeEach(module('Oshinko'));

  beforeEach(function() {
    inject(function(_$controller_, $q) {
      controller = _$controller_("ClusterDeleteCtrl", {
        $scope: $scope,
        $q: $q,
        dialogData: {},
        clusterData: {},
        sendNotifications: {},
        errorHandling: {}
      });
    });
  });

  it('should have the controller defined ', function() {
    expect(controller).toBeDefined();
    expect($scope.clusterName).toBe('');
    expect($scope.workerCount).toBeDefined();
  });
});

describe('Main controller functionality', function(){
  var controller;
  var scope = {};
  var $route = {
    current: {
      params: {
        Id: ""
      }
    }
  };

  beforeEach(module('Oshinko'));
  beforeEach(function() {
    inject(function(_$controller_, $q, $interval, $location, ListingState, $rootScope) {
      controller = _$controller_;
      scope = $rootScope.$new();
      controller = ("ClusterCtrl", {
        $scope: scope,
        $q: $q,
        $route: $route,
        $interval: $interval,
        $location: $location,
        clusterDataFactory: {},
        sendNotifications: {},
        errorHandling: {}
      });
    });
  });

  it('should have the controller defined ', function() {
    expect(controller).toBeDefined();
  });
});


