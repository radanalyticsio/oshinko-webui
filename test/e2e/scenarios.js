'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

describe('my app', function() {

  beforeEach(function() {
    browser().navigateTo('app/index.html');
  });


  it('should automatically redirect to /clusters when location hash/fragment is empty', function() {
    expect(browser().location().url()).toBe("/clusters");
  });


  describe('clusters', function() {

    beforeEach(function() {
      browser().navigateTo('#/clusters');
    });


    it('should render view1 when user navigates to /clusters', function() {
      expect(element('[ng-view] p:first').text()).
        toMatch(/This is the clusters view/);
    });

  });


  describe('about', function() {

    beforeEach(function() {
      browser().navigateTo('#/about');
    });


    it('should render about when user navigates to /about', function() {
      expect(element('[ng-view] p:first').text()).
        toMatch(/about view/);
    });

  });
});
