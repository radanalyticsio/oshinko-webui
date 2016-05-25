'use strict';

/* jasmine specs for controllers go here */

describe('controllers', function(){
  beforeEach(module('Oshinko'));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  it('should process a login', inject(function() {
    var $scope = {}
    var controller = $controller('LoginController', {$scope: $scope});
    $scope.username = 'testing';
    $scope.password = 'testing';
    $scope.login();
    console.log($scope);
  }));

  it('should ....', inject(function() {
    //spec body
  }));
});
