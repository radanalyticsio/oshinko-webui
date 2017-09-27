// uncomment if you need to take some screenshots for debugging purposes
// var fs = require('fs');
//
// function writeScreenShot(data, filename) {
//   var dir = "screenshots";
//   if (!fs.existsSync(dir)){
//     fs.mkdirSync(dir);
//   }
//   var stream = fs.createWriteStream(dir + "/" + filename);
//   stream.write(new Buffer(data, 'base64'));
//   stream.end();
// }

describe('Initial page functionality', function () {

  it('should login and display the clusters page', function () {
    browser.waitForAngularEnabled(false);
    browser.get('/webui');
    element(by.tagName("button")).click();
    element(by.name('username')).sendKeys("developer");
    element(by.name('password')).sendKeys("developerpass");
    element(by.tagName("button")).click();
    element(by.name("approve")).click();
    browser.waitForAngularEnabled(true);
    browser.get('/webui');
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
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "3"));

    // Scale down
    element(by.name('scalebutton-testcluster')).click();
    element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "2");
    element(by.id('scalebutton')).click();
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-testcluster')), "2"));

    // Delete
    element(by.name('deletebutton-testcluster')).click();
    element(by.id('deletebutton')).click();
    browser.wait(EC.invisibilityOf(element(by.name('deletebutton-testcluster'))));
  });
});


describe('Cluster page functionality, with additional cancel clicks', function () {
  it('should create, scale, and delete a cluster', function () {
    var EC = protractor.ExpectedConditions;
    // Create a cluster
    browser.wait(EC.elementToBeClickable(element(by.id('startbutton'))));
    element(by.id('startbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.id('cancelbutton'))));
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.id('startbutton'))));
    element(by.id('startbutton')).click();
    element(by.id('cluster-new-name')).sendKeys('secondcluster');
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.id('startbutton'))));
    element(by.id('startbutton')).click();
    element(by.id('cluster-new-name')).sendKeys('secondcluster');
    element(by.id('createbutton')).click();
    browser.wait(EC.visibilityOf(element(by.name('deletebutton-secondcluster'))));

    //Scale
    element(by.name('scalebutton-secondcluster')).click();
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.name('scalebutton-secondcluster'))));
    element(by.name('scalebutton-secondcluster')).click();
    element(by.name('numworkers')).sendKeys(protractor.Key.CONTROL, "a", protractor.Key.NULL, "3");
    element(by.id('scalebutton')).click();
    browser.wait(EC.textToBePresentInElement(element(by.name('workercount-secondcluster')), "3"));

    // Delete
    element(by.name('deletebutton-secondcluster')).click();
    element(by.id('cancelbutton')).click();
    browser.wait(EC.elementToBeClickable(element(by.name('deletebutton-secondcluster'))));
    element(by.name('deletebutton-secondcluster')).click();
    element(by.id('deletebutton')).click();
    browser.wait(EC.invisibilityOf(element(by.name('deletebutton-secondcluster'))));
  });
});
