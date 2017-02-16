describe('Initial page functionality', function () {

  it('should login and display the clusters page', function () {
    browser.get('');
    expect(element(by.tagName('h2')).getText()).toEqual("Spark Clusters");
  });
});


describe('Cluster page functionality', function () {
  it('should create, scale, and delete a cluster', function () {
    var EC = protractor.ExpectedConditions;
    // Create a cluster
    element(by.id('startbutton')).click();
    element(by.id('cluster-new-name')).sendKeys('testcluster');
    element(by.id('createbutton')).click();
    browser.wait(EC.visibilityOf(element(by.name('deletebutton-testcluster'))));

    //Scale
    element(by.name('scalebutton-testcluster')).click();
    element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "3");
    element(by.id('scalebutton')).click();
    browser.get('');
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "3"));

    // Scale down
    element(by.name('scalebutton-testcluster')).click();
    element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "2");
    element(by.id('scalebutton')).click();
    browser.get('');
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "2"));

    // Delete
    browser.get('');
    element(by.name('deletebutton-testcluster')).click();
    element(by.id('deletebutton')).click();
    browser.get('');
    browser.wait(EC.invisibilityOf(element(by.name('deletebutton-testcluster'))));
  });
});


describe('Cluster page functionality, with additional cancel clicks', function () {
  it('should create, scale, and delete a cluster', function () {
    var EC = protractor.ExpectedConditions;
    // Create a cluster
    element(by.id('startbutton')).click();
    element(by.id('cancelbutton')).click();
    element(by.id('startbutton')).click();
    element(by.id('cluster-new-name')).sendKeys('testcluster');
    element(by.id('cancelbutton')).click();
    element(by.id('startbutton')).click();
    element(by.id('cluster-new-name')).sendKeys('testcluster');
    element(by.id('createbutton')).click();
    browser.wait(EC.visibilityOf(element(by.name('deletebutton-testcluster'))));

    //Scale
    element(by.name('scalebutton-testcluster')).click();
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.name('scalebutton-testcluster'))));
    element(by.name('scalebutton-testcluster')).click();
    element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "3");
    element(by.id('scalebutton')).click();
    browser.get('');
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "3"));

    // Delete
    browser.get('');
    element(by.name('deletebutton-testcluster')).click();
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.name('deletebutton-testcluster'))));
    element(by.name('deletebutton-testcluster')).click();
    element(by.id('deletebutton')).click();
    browser.wait(EC.invisibilityOf(element(by.name('deletebutton-testcluster'))));
  });
});
