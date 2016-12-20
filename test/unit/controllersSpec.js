'use strict';

describe('controllers', function(){
  beforeEach(module('Oshinko'));

  var $controller;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));

  it('should pass', inject(function() {
    expect(1).toBeGreaterThanOrEqual(1);
  }));

});
